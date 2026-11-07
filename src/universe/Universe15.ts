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
import { applyEngineThrust } from "./Relativity";
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
            let deltaV = this.spec.engineAccel * dt * this.thrustMultiplier;
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

            // Relativistic engine thrust (temp_mission §3–§4) — identical to
            // Spacecraft.update: limits cap ENGINE speed only, gravity may
            // exceed, no brake-drag, braking/steering always work.
            if (deltaV > 0) {
                const limit = this.boost ? this.spec.boostLimit : this.spec.engineLimit;
                const n = applyEngineThrust(
                    this.velocity.x, this.velocity.y, this.angle, deltaV,
                    limit, this.spec.restMass,
                );
                this.velocity.x = n.vx;
                this.velocity.y = n.vy;
            }
        } else {
            if (this.launchClock !== 0) this.launchClock = 0;
        }

        updateBody.call(this, sim, dt);
    }
}
