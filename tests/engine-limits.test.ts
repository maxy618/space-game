/**
 * Engine-cap contract tests (user 2026-11-08) — numeric verification, no
 * vision/screenshot judgment.
 *
 * Contract:
 *  1. The regular engine can never ACCELERATE the ship beyond 4000.
 *  2. The boost burner can never accelerate beyond 6000.
 *  3. Both caps apply to ENGINE acceleration ONLY — total velocity from
 *     gravity may exceed either cap and is never cancelled.
 *  4. Disabling boost never reduces existing velocity; the regular engine
 *     cannot add speed while above its cap.
 *  5. Braking still works normally at any speed.
 *  6. Gravity was strengthened (×4, ship-only) — close flybys bend the
 *     trajectory measurably.
 */
import { describe, it, expect } from "vitest";
import { Namer } from "../src/core/Namer";
import { Universe, UniverseConst } from "../src/universe/Universe";
import { Vec2_makeWithAngleMag } from "../src/core/Vec2";

function makeUniverse(seed: bigint = 777n) {
    const u = new Universe(new Namer(), seed);
    u.initRandom();
    return u;
}

/** Test-only sandboxing: remove planetary/star gravity, park mid-range. */
function isolateFromGravity(u: Universe) {
    u.star.mass = 0;
    for (const p of u.planets) p.mass = 0;
    u.ship.pos.x = 120_000;
    u.ship.pos.y = 0;
}

function runSteps(u: Universe, steps: number, dtMs: number, thrustFn?: (u: Universe, i: number) => void) {
    let millis = 1; // arms the wall clock on the first step call
    u.step(millis);
    for (let i = 0; i < steps; i++) {
        millis += dtMs;
        if (thrustFn) thrustFn(u, i);
        u.step(millis);
    }
}

function fullThrust(u: Universe) {
    u.ship.angle = 0;
    Vec2_makeWithAngleMag(u.ship.thrust, 0, 1);
}
function engageBoost(u: Universe) {
    u.ship.boost = true;
    u.ship.thrustMultiplier = u.ship.profile.boostAccelMultiplier;
}
function releaseBoost(u: Universe) {
    u.ship.boost = false;
    u.ship.thrustMultiplier = 1;
}

describe("engine caps are engine-only (user 2026-11-08)", () => {
    it("regular engine accelerates to 4000 and never beyond", () => {
        const u = makeUniverse();
        isolateFromGravity(u);
        u.ship.velocity.x = 3900;
        u.ship.velocity.y = 0;
        runSteps(u, 250, 16, fullThrust); // 4 s: would reach ~7900 uncapped
        const v = u.ship.velocity.mag();
        expect(v).toBeCloseTo(UniverseConst.CRAFT_SPEED_LIMIT, 0);
        expect(v).toBeLessThanOrEqual(UniverseConst.CRAFT_SPEED_LIMIT);
    });

    it("boost engine accelerates to 6000 and never beyond", () => {
        const u = makeUniverse();
        isolateFromGravity(u);
        engageBoost(u);
        u.ship.velocity.x = 5900;
        u.ship.velocity.y = 0;
        runSteps(u, 250, 16, fullThrust); // 4 s: would reach ~9900 uncapped
        const v = u.ship.velocity.mag();
        expect(v).toBeCloseTo(UniverseConst.CRAFT_SPEED_LIMIT_BOOST, 0);
        expect(v).toBeLessThanOrEqual(UniverseConst.CRAFT_SPEED_LIMIT_BOOST);
    });

    it("mid-flight boost release: velocity preserved exactly, regular engine cannot add speed", () => {
        const u = makeUniverse();
        isolateFromGravity(u);
        engageBoost(u);
        u.ship.velocity.x = 5900; // near the boost cap
        let millis = 1;
        u.step(millis);
        for (let i = 0; i < 30; i++) { // 0.48 s burning under boost: pins at 6000
            millis += 16;
            fullThrust(u);
            u.step(millis);
        }
        expect(u.ship.velocity.mag()).toBeCloseTo(UniverseConst.CRAFT_SPEED_LIMIT_BOOST, 0);
        releaseBoost(u); // release mid-burn — the reported bug scenario
        for (let i = 0; i < 120; i++) { // 1.92 s on the regular engine
            millis += 16;
            fullThrust(u);
            u.step(millis);
        }
        const v = u.ship.velocity.mag();
        // nothing lost (old latch DRAG bled 1200 m/s² — removed)…
        expect(v).toBeGreaterThanOrEqual(UniverseConst.CRAFT_SPEED_LIMIT_BOOST - 1);
        // …and nothing gained (the reported bug: regular engine pushed to 6000)
        expect(v).toBeCloseTo(UniverseConst.CRAFT_SPEED_LIMIT_BOOST, 0);
    });

    it("regular engine above its cap cannot even steal speed via direction changes", () => {
        const u = makeUniverse();
        isolateFromGravity(u);
        u.ship.velocity.x = 5500;
        u.ship.velocity.y = 0;
        runSteps(u, 120, 16, (s) => {
            // burn perpendicular: would spiral speed up on an uncapped ship
            s.ship.angle = Math.PI / 2;
            Vec2_makeWithAngleMag(s.ship.thrust, Math.PI / 2, 1);
        });
        const v = u.ship.velocity.mag();
        expect(v).toBeLessThanOrEqual(5500 + 1);
        expect(v).toBeGreaterThanOrEqual(5500 - 1);
    });

    it("braking still works above the engine cap (boost released at 6000)", () => {
        const u = makeUniverse();
        isolateFromGravity(u);
        u.ship.velocity.x = 6000;
        u.ship.velocity.y = 0;
        runSteps(u, 120, 16, (s) => { // 1.92 s of retrograde burn
            s.ship.angle = Math.PI;
            Vec2_makeWithAngleMag(s.ship.thrust, Math.PI, 1);
        });
        const v = u.ship.velocity.mag();
        expect(v).toBeGreaterThan(3900); // ~6000 − 1920 = 4080
        expect(v).toBeLessThan(4200);
    });

    it("gravity slingshot pushes TOTAL velocity beyond the boost cap (never cancelled)", () => {
        const u = makeUniverse(5038n);
        const ship = u.ship;
        // pure star-well test: neutralize planets physically
        for (const p of u.planets) { p.mass = 0; p.radius = 1; }
        // dive straight at the star at the boost cap, engine cold
        ship.pos.x = u.star.pos.x + 60_000;
        ship.pos.y = u.star.pos.y;
        ship.velocity.x = -6000;
        ship.velocity.y = 0;
        ship.angle = Math.PI; // facing the star
        ship.thrust.x = 0;
        ship.thrust.y = 0;
        ship.launchClock = -10; // bypass the 2 s post-launch MECO gravity blackout
        let millis = 1;
        u.step(millis);
        let minDist = Infinity;
        let vAtClosest = 0;
        for (let i = 0; i < 700; i++) { // ~11 s: 60 km at 6 km/s + well speedup
            millis += 16;
            u.step(millis);
            const d = ship.pos.distance(u.star.pos);
            if (d < minDist) { minDist = d; vAtClosest = ship.velocity.mag(); }
        }
        expect(minDist).toBeLessThan(30_000); // flew deep into the well
        // total speed rose past the boost cap with NO boost and NO thrust:
        // proof the caps never clamp gravity
        expect(vAtClosest).toBeGreaterThan(UniverseConst.CRAFT_SPEED_LIMIT_BOOST);
    });

    it("gravity strengthening: free fall at 20 km bends the trajectory hard (×4)", () => {
        // initTest pins the star to the max radius (8000) → deterministic well
        const u = new Universe(new Namer(), 5038n);
        u.initTest();
        for (const p of u.planets) { p.mass = 0; p.radius = 1; }
        const ship = u.ship;
        ship.pos.x = u.star.pos.x + 20_000;
        ship.pos.y = u.star.pos.y;
        ship.velocity.x = 0;
        ship.velocity.y = 0;
        ship.launchClock = -10;
        // NOTE: any non-thrust step resets launchClock to 0, so the first
        // LAUNCH_MECO (2 s) of sim time is gravity-free — fall for 4 s and
        // measure the gain over the last 2 s window (2 s of fall).
        let millis = 1;
        u.step(millis);
        let vMid = 0;
        for (let i = 0; i < 250; i++) { // 4 s total
            millis += 16;
            u.step(millis);
            if (i === 124) vMid = ship.velocity.mag();
        }
        const gain = ship.velocity.mag() - vMid;
        // a(20 km) = G·4·M·m/d² ≈ 804 px/s² for the max-radius star
        expect(gain).toBeGreaterThan(1000);
        expect(gain).toBeLessThan(2400);
        // and it points at the star (fell, not drifted)
        expect(ship.pos.x).toBeLessThan(u.star.pos.x + 20_000);
    });
});
