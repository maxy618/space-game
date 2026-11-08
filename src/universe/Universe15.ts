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
import { Fuse } from "../core/Physics15";
import { Landing, Planet, Spacecraft } from "./Universe";
import { Removable, Simulator } from "../core/Physics";
import type { Autopilot15 } from "../sim/Autopilot15";

const enum Universe15Const {
    LANDING_REMOVAL_TIME = 60 * 15 // 15 min of simulation time
}

export class Landing15 extends Landing implements Removable {
    text: string;
    private readonly fuse: Fuse;

    constructor(ship: Spacecraft, planet: Planet, angle: number, text: string, surfaceRadius?: number, orientationWorld?: number | null) {
        super(ship, planet, angle, surfaceRadius, orientationWorld ?? null);
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

/**
 * V-era spacecraft. All physics (thrust, engine-only speed caps, boost)
 * lives in the base Spacecraft and is data-driven by the ship profile
 * (ShipProfile.ts) — this subclass only wires the autopilot and the
 * landing flavor text.
 */
export class Spacecraft15 extends Spacecraft {
    autopilot: Autopilot15 | null = null;
    /** Smoothed steering motor -1..1 (A/D or pilot) — drives the side-engine stub. */
    steerMotor = 0;
}
