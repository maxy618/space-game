/**
 * P03-T04 parity regression suite:
 * the reconstructed reference behavior must survive refactoring.
 * Covers: deterministic autopilot target selection (sim.rng — was SYSTEM),
 * thrust physics parity, autopilot flight parity and NaN-free smoke runs.
 */
import { describe, it, expect } from "vitest";
import { Namer } from "../src/core/Namer";
import { Universe } from "../src/universe/Universe";
import { Spacecraft15 } from "../src/universe/Universe15";
import { Autopilot15 } from "../src/sim/Autopilot15";
import { Vec2_makeWithAngleMag } from "../src/core/Vec2";

/** Advance a universe by `frames` steps of `dtMs` wall milliseconds. */
function runSteps(u: Universe, frames: number, dtMs: number) {
    let millis = 1; // non-zero: the first call only arms the wall clock
    u.step(millis);
    for (let i = 0; i < frames; i++) {
        millis += dtMs;
        u.step(millis);
    }
}

function makeUniverse(seed: bigint) {
    const u = new Universe(new Namer(), seed);
    u.initRandom();
    return u;
}

describe("P03-T04 autopilot determinism", () => {
    it("picks the same random target from sim.rng when all planets are explored", () => {
        const a = makeUniverse(1234n);
        const b = makeUniverse(1234n);
        const apA = new Autopilot15(a.ship as Spacecraft15, a);
        const apB = new Autopilot15(b.ship as Spacecraft15, b);
        for (const [u, ap] of [[a, apA], [b, apB]] as const) {
            u.planets.forEach(p => (p.explored = true));
            ap.enabled = true;
            u.addEntity(ap);
        }
        runSteps(a, 30, 16);
        runSteps(b, 30, 16);
        expect(apA.target).not.toBeNull();
        expect(apB.target).not.toBeNull();
        expect(apB.target!.id).toBe(apA.target!.id);
        expect(apB.target!.name).toBe(apA.target!.name);
    });

    it("targets the nearest unexplored planet (same seed → same target)", () => {
        const a = makeUniverse(1234n);
        const b = makeUniverse(1234n);
        const apA = new Autopilot15(a.ship as Spacecraft15, a);
        const apB = new Autopilot15(b.ship as Spacecraft15, b);
        for (const [u, ap] of [[a, apA], [b, apB]] as const) {
            ap.enabled = true;
            u.addEntity(ap);
        }
        runSteps(a, 20, 16);
        runSteps(b, 20, 16);
        expect(apA.target).not.toBeNull();
        expect(apB.target!.id).toBe(apA.target!.id);
    });

    it("autopilot flight produces byte-identical state for equal seeds", () => {
        const a = makeUniverse(1234n);
        const b = makeUniverse(1234n);
        for (const u of [a, b]) {
            const ap = new Autopilot15(u.ship as Spacecraft15, u);
            ap.enabled = true;
            u.addEntity(ap);
        }
        runSteps(a, 150, 16);
        runSteps(b, 150, 16);
        expect(b.serialize()).toBe(a.serialize());
    });
});

describe("P03-T04 thrust physics parity", () => {
    it("identical scripted thrust inputs produce identical trajectories", () => {
        const a = makeUniverse(99n);
        const b = makeUniverse(99n);
        runSteps(a, 10, 16);
        runSteps(b, 10, 16);
        // thrust toward a fixed direction for 90 frames, then coast for 60
        let mA = 1 + 10 * 16;
        let mB = mA;
        for (let i = 0; i < 90; i++) {
            mA += 16;
            mB += 16;
            Vec2_makeWithAngleMag(a.ship.thrust, -Math.PI / 4, 1);
            Vec2_makeWithAngleMag(b.ship.thrust, -Math.PI / 4, 1);
            a.step(mA);
            b.step(mB);
        }
        for (let i = 0; i < 60; i++) {
            mA += 16;
            mB += 16;
            a.ship.thrust.x = 0;
            a.ship.thrust.y = 0;
            b.ship.thrust.x = 0;
            b.ship.thrust.y = 0;
            a.step(mA);
            b.step(mB);
        }
        expect(b.serialize()).toBe(a.serialize());
        // the thrust actually moved the ship away from the rest position
        expect(Math.abs(a.ship.velocity.x) + Math.abs(a.ship.velocity.y)).toBeGreaterThan(0);
    });
});

describe("P03-T04 smoke", () => {
    it("600-frame run stays finite (no NaN in ship/planets)", () => {
        const u = makeUniverse(55555n);
        runSteps(u, 600, 16);
        expect(Number.isFinite(u.ship.pos.x)).toBe(true);
        expect(Number.isFinite(u.ship.pos.y)).toBe(true);
        expect(Number.isFinite(u.ship.velocity.x)).toBe(true);
        expect(Number.isFinite(u.ship.velocity.y)).toBe(true);
        u.planets.forEach(p => {
            expect(Number.isFinite(p.pos.x)).toBe(true);
            expect(Number.isFinite(p.pos.y)).toBe(true);
        });
    });
});
