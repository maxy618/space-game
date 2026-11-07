/**
 * P04-T02 ship handling & tuning tests (updated 2026-11-08: engine-only caps).
 *
 * Handling contract (all units: meters, seconds):
 *  - engineAccel = 1000 m/s^2 at full thrust (thrust scales linearly)
 *  - engineSpeedCap = 4000 m/s: the ENGINE can never push speed past it —
 *    it is NOT a total-velocity cap (gravity may exceed it, existing speed
 *    is never reduced); no drag (inertia preserved)
 *  - brake applies the same -1000 m/s^2 along retrograde
 *  - motion is frame-rate independent: equal simulated time at different
 *    step sizes gives identical velocity (the step loop integrates dt)
 */
import { describe, it, expect } from "vitest";
import { Namer } from "../src/core/Namer";
import { Universe, UniverseConst } from "../src/universe/Universe";
import { Vec2_makeWithAngleMag } from "../src/core/Vec2";

function makeUniverse(seed: bigint) {
    const u = new Universe(new Namer(), seed);
    u.initRandom();
    return u;
}

/**
 * Isolate thrust measurements from gravity: zero out stellar/planetary mass
 * (gravity ∝ mass) and park the ship at mid-range. This is test-only
 * sandboxing — gravity itself is untouched game code.
 */
function isolateFromGravity(u: Universe) {
    u.star.mass = 0;
    for (const p of u.planets) p.mass = 0;
    u.ship.pos.x = 120_000;
    u.ship.pos.y = 0;
}

/** Advance `steps` of `dtMs`; `thrustFn` is applied each step. */
function runSteps(u: Universe, steps: number, dtMs: number, thrustFn?: (u: Universe, i: number) => void) {
    let millis = 1; // arms the wall clock on the first step call
    u.step(millis);
    for (let i = 0; i < steps; i++) {
        millis += dtMs;
        if (thrustFn) thrustFn(u, i);
        u.step(millis);
    }
}

/** Full thrust along the ship's fixed heading (heading locked, angle=0). */
function fullThrust(u: Universe) {
    u.ship.angle = 0;
    Vec2_makeWithAngleMag(u.ship.thrust, 0, 1);
}
function noThrust(u: Universe) {
    u.ship.thrust.x = 0;
    u.ship.thrust.y = 0;
}

describe("P04-T02 thrust & cruise", () => {
    it("2 s of full thrust at 1000 m/s^2 gives ~2000 m/s (below cap)", () => {
        const u = makeUniverse(777n);
        isolateFromGravity(u);
        u.ship.velocity.x = 0;
        u.ship.velocity.y = 0;
        runSteps(u, 120, 16, fullThrust); // ~1.92 s of physics
        const v = u.ship.velocity.mag();
        expect(v).toBeGreaterThan(1800);
        expect(v).toBeLessThan(2100);
        expect(v).toBeLessThan(UniverseConst.CRAFT_SPEED_LIMIT);
    });

    it("hits the 4000 engine cap and holds it (starts near the cap)", () => {
        // NOTE: each assert uses a fresh universe from the same seed, because
        // runSteps restarts its wall clock — continuity across calls would
        // produce a negative dt on the first step of the second call.
        for (const steps of [60, 150]) {
            const u = makeUniverse(777n);
            isolateFromGravity(u);
            // Start just below the cap: reaching it takes ~0.1 s, so the run
            // stays far from the ringfence (200 000 m) that would zero velocity.
            u.ship.velocity.x = 3900;
            u.ship.velocity.y = 0;
            runSteps(u, steps, 16, fullThrust);
            expect(u.ship.velocity.mag()).toBeCloseTo(UniverseConst.CRAFT_SPEED_LIMIT, 0);
        }
    });

    it("above the engine cap, the regular engine adds nothing and removes nothing", () => {
        // start ABOVE the cap (as after a gravity slingshot or released boost):
        // full regular thrust must not bleed the velocity nor add to it
        const u = makeUniverse(777n);
        isolateFromGravity(u);
        u.ship.velocity.x = 4900;
        u.ship.velocity.y = 0;
        runSteps(u, 150, 16, fullThrust);
        expect(u.ship.velocity.mag()).toBeCloseTo(4900, 0);
    });

    it("half thrust accelerates at half rate", () => {
        const full = makeUniverse(777n);
        const half = makeUniverse(777n);
        for (const u of [full, half]) {
            isolateFromGravity(u);
            u.ship.velocity.x = 0;
            u.ship.velocity.y = 0;
        }
        runSteps(full, 120, 16, (u) => {
            u.ship.angle = 0;
            Vec2_makeWithAngleMag(u.ship.thrust, 0, 1);
        });
        runSteps(half, 120, 16, (u) => {
            u.ship.angle = 0;
            Vec2_makeWithAngleMag(u.ship.thrust, 0, 0.5);
        });
        expect(half.ship.velocity.mag()).toBeCloseTo(full.ship.velocity.mag() / 2, 0);
    });

    it("no thrust: inertia preserved, no drag (velocity nearly constant)", () => {
        const u = makeUniverse(777n);
        isolateFromGravity(u);
        u.ship.velocity.x = 0;
        u.ship.velocity.y = -2000;
        const v0 = u.ship.velocity.mag();
        runSteps(u, 120, 16, noThrust);
        // residual gravity at 190 km (~70 m/s^2 over ~2 s) accounts for <3%
        const drift = Math.abs(u.ship.velocity.mag() - v0);
        expect(drift / v0).toBeLessThan(0.03);
    });
});

describe("P04-T02 brake", () => {
    it("retrograde thrust removes velocity at 1000 m/s^2", () => {
        const u = makeUniverse(777n);
        isolateFromGravity(u);
        u.ship.velocity.x = 3000;
        u.ship.velocity.y = 0;
        u.ship.angle = Math.PI; // facing backward → thrust cancels velocity
        runSteps(u, 120, 16, (s) => {
            s.ship.angle = Math.PI;
            Vec2_makeWithAngleMag(s.ship.thrust, Math.PI, 1);
        });
        const v = u.ship.velocity.mag();
        expect(v).toBeGreaterThan(900);
        expect(v).toBeLessThan(1300); // ~3000 - 1920 ≈ 1080
        expect(v).toBeLessThan(3000);
    });

    it("braking to a stop and past zero does not reverse to high speed", () => {
        const u = makeUniverse(777n);
        isolateFromGravity(u);
        u.ship.velocity.x = 1000;
        u.ship.velocity.y = 0;
        runSteps(u, 240, 16, (s) => {
            s.ship.angle = Math.PI;
            Vec2_makeWithAngleMag(s.ship.thrust, Math.PI, 1);
        });
        const v = u.ship.velocity.mag();
        expect(v).toBeLessThanOrEqual(UniverseConst.CRAFT_SPEED_LIMIT);
        expect(Number.isFinite(v)).toBe(true);
    });
});

describe("P04-T02 frame-rate independence", () => {
    it("same simulated time at 16ms vs 33ms steps gives near-identical velocity", () => {
        const a = makeUniverse(777n);
        const b = makeUniverse(777n);
        for (const u of [a, b]) {
            isolateFromGravity(u);
            u.ship.velocity.x = 0;
            u.ship.velocity.y = 0;
        }
        runSteps(a, 120, 16, fullThrust); // 1.92 s
        runSteps(b, 58, 33, fullThrust); // ~1.91 s
        const va = a.ship.velocity.mag();
        const vb = b.ship.velocity.mag();
        expect(va).toBeGreaterThan(1500);
        expect(Math.abs(va - vb) / va).toBeLessThan(0.05); // within 5%
    });

    it("capped cruise is identical across step sizes (deterministic replay)", () => {
        const a = makeUniverse(777n);
        const b = makeUniverse(777n);
        for (const u of [a, b]) {
            isolateFromGravity(u);
            u.ship.velocity.x = 3900;
            u.ship.velocity.y = 0;
        }
        runSteps(a, 60, 16, fullThrust); // ~0.96 s — cruises at the cap
        runSteps(b, 29, 33, fullThrust); // ~0.96 s — cruises at the cap
        expect(a.ship.velocity.mag()).toBeCloseTo(UniverseConst.CRAFT_SPEED_LIMIT, 0);
        expect(b.ship.velocity.mag()).toBeCloseTo(UniverseConst.CRAFT_SPEED_LIMIT, 0);
        const delta = Math.abs(a.ship.velocity.mag() - b.ship.velocity.mag());
        expect(delta).toBeLessThan(0.02 * UniverseConst.CRAFT_SPEED_LIMIT);
    });
});
