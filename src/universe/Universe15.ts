/*
 * Copyright (C) 2023 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Copyright 2025 lll69
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { drawFlag } from "../core/Flag15";
import { clamp } from "../core/Maths";
import { Body, Simulator } from "../core/Physics";
import { Fuse } from "../core/Physics15";
import { Landing, Planet, SCALED_THRUST, Spacecraft, UniverseConst } from "./Universe";
import { Removable } from "../core/Physics";
import { Vec2_makeWithAngleMag, Vec2_makeWithAngleMagAdd } from "../core/Vec2";
import type { Autopilot15 } from "../sim/Autopilot15";

const updateBody = Body.prototype.update;

const enum Universe15Const {
    LANDING_REMOVAL_TIME = 60 * 15 // 15 min of simulation time
}

export class Landing15 extends Landing implements Removable {
    text: string;
    private readonly fuse: Fuse;

    constructor(ship: Spacecraft, planet: Planet, angle: number, text: string) {
        super(ship, planet, angle);
        this.text = text;
        this.fuse = new Fuse(Universe15Const.LANDING_REMOVAL_TIME);
    }

    solve(sim: Simulator, dt: number): void {
        super.solve(sim, dt);
        if (drawFlag) this.fuse.update(dt);
    }

    canBeRemoved(): boolean {
        return drawFlag && this.fuse.canBeRemoved();
    }
}

export class Spacecraft15 extends Spacecraft {
    autopilot: Autopilot15 | null = null;

    update(sim: Simulator, dt: number) {
        // check for thrusters
        const thrustMag = this.thrust.mag();
        if (thrustMag > 0) {
            let deltaV = UniverseConst.MAIN_ENGINE_ACCEL * dt * this.thrustMultiplier;
            if (SCALED_THRUST) deltaV *= clamp(thrustMag, 0, 1);

            if (this.landing !== null) {
                if (this.launchClock === 0) this.launchClock = sim.now + 1; /* @@@ TODO extract */

                if (sim.now > this.launchClock) {
                    // detach from landing site
                    this.landing.ship = null;
                    this.landing = null;
                } else {
                    deltaV = 0;
                }
            }

            // this is it. impart thrust to the ship.
            // note that we always thrust in the forward direction
            Vec2_makeWithAngleMagAdd(this.velocity, this.angle, deltaV);
        } else {
            if (this.launchClock !== 0) this.launchClock = 0;
        }

        // apply global speed limit (boost raises it 4000 → 6000; after
        // release the boost cap lingers until you cool below 4500 — no
        // instant snap, user 2026-11-08). boostLatched is set only by the
        // engaged burner, never by raw speed (test-reachable above cap).
        if (this.boost) this.boostLatched = true;
        else if (this.velocity.mag() < UniverseConst.CRAFT_SPEED_LIMIT_BOOST - 1500) this.boostLatched = false;
        const speedLimit = (this.boost || this.boostLatched) ? UniverseConst.CRAFT_SPEED_LIMIT_BOOST : UniverseConst.CRAFT_SPEED_LIMIT;
        if (this.velocity.mag() > speedLimit)
            Vec2_makeWithAngleMag(this.velocity, this.velocity.angle(), speedLimit);

        updateBody.call(this, sim, dt);
    }
}
