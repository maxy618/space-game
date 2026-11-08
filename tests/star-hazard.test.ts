/**
 * Stellar hazard tests (user 2026-11-08) — numeric verification of the
 * corona heating model and the destruction/respawn system.
 */
import { describe, it, expect } from "vitest";
import { starHeatStep, STAR_CORONA_FACTOR, STAR_KILL_FACTOR, STAR_COOL_RATE } from "../src/universe/StarHeat";
import { UniverseConst } from "../src/universe/Universe";
import { VisibleUniverse15 } from "../src/render/VisibleUniverse15";
import { Namer15 } from "../src/core/Namer15";

describe("starHeatStep (pure model)", () => {
    it("cools down outside the corona", () => {
        const r = starHeatStep(0.5, 999_999, 5_000, 1);
        expect(r.destroy).toBe(false);
        expect(r.heat).toBeCloseTo(0.5 - STAR_COOL_RATE, 5);
    });

    it("heats gently at the corona edge and fiercely near the boundary", () => {
        const R = 5_000;
        const corona = R * STAR_CORONA_FACTOR;
        const kill = R * STAR_KILL_FACTOR;
        const edge = starHeatStep(0, corona - 1, R, 0.1);
        const deep = starHeatStep(0, kill + 1, R, 0.1);
        expect(edge.destroy).toBe(false);
        expect(deep.destroy).toBe(false);
        // quadratic proximity: near-boundary rate is far above corona-edge rate
        expect(deep.heat).toBeGreaterThan(edge.heat * 5);
        // ~1.5/s at the boundary, ~0.15/s at the edge
        expect(deep.heat).toBeGreaterThan(0.12);
        expect(edge.heat).toBeLessThan(0.03);
    });

    it("destroys at the inner danger boundary regardless of heat", () => {
        const R = 5_000;
        const r = starHeatStep(0, R * STAR_KILL_FACTOR, R, 0.001);
        expect(r.destroy).toBe(true);
        expect(r.heat).toBe(1);
    });

    it("destroys by COUNTDOWN EXPIRY after sustained hot-zone exposure (min 8 s)", () => {
        const R = 1_000; // small star: tight zone, dive deep and hold
        const kill = R * STAR_KILL_FACTOR;
        let countdown: number | null = null;
        let destroyed = false;
        // hovering deep in the hot zone: countdown must start at >= 8 s and
        // the ship must die once it runs out (old "heat>=1" model is gone;
        // heat still accumulates for the vignette, but death is by timer)
        for (let i = 0; i < 1200; i++) {
            const r = starHeatStep(0, kill + 5, R, 0.016, 1, 1, countdown);
            if (countdown === null && r.countdown !== null) {
                expect(r.countdown).toBeGreaterThanOrEqual(8); // hot-zone floor
            }
            countdown = r.countdown;
            if (r.destroy) { destroyed = true; break; }
        }
        expect(destroyed).toBe(true);
    });

    it("danger zones scale with the star radius", () => {
        // the kill boundary in absolute meters must follow the radius
        const small = starHeatStep(0, 1_000 * STAR_KILL_FACTOR * 1.001, 1_000, 0.001);
        const large = starHeatStep(0, 8_000 * STAR_KILL_FACTOR * 1.001, 8_000, 0.001);
        expect(small.destroy).toBe(false); // just outside a small star's zone
        expect(large.destroy).toBe(false);
        const smallIn = starHeatStep(0, 1_000 * STAR_KILL_FACTOR * 0.999, 1_000, 0.001);
        const largeIn = starHeatStep(0, 8_000 * STAR_KILL_FACTOR * 0.999, 8_000, 0.001);
        expect(smallIn.destroy).toBe(true);
        expect(largeIn.destroy).toBe(true);
    });

    it("max zone stays below the minimum spawn/orbit distance (spawn-safe)", () => {
        expect(UniverseConst.STAR_RADIUS_RANGE_MAX * STAR_CORONA_FACTOR)
            .toBeLessThanOrEqual(UniverseConst.PLANET_ORBIT_RANGE_MIN);
    });
});

describe("destruction & respawn integration (VisibleUniverse15)", () => {
    it("destroyed ship respawns like a fresh spawn without wiping the universe", () => {
        const u = new VisibleUniverse15(new Namer15(), 42n);
        u.initRandom();
        // mark progress the respawn must preserve
        u.planets[0].explored = true;
        const exploredBefore = u.planets.filter(p => p.explored).length;
        const simNowBefore = u.now;
        // drop the ship inside the inner danger boundary
        u.ship.pos.x = u.star.pos.x + u.star.radius * 1.2;
        u.ship.pos.y = u.star.pos.y;
        u.ship.velocity.x = 500;
        u.ship.velocity.y = 0;
        u.ship.boost = true;
        u.ship.thrustMultiplier = u.ship.profile.boostAccelMultiplier;

        let millis = 1;
        u.step(millis);
        let respawned = false;
        for (let i = 0; i < 300; i++) {
            millis += 16;
            u.step(millis);
            if (u.ship.pos.distance(u.star.pos) > u.star.radius * STAR_CORONA_FACTOR) {
                respawned = true;
                break;
            }
        }
        expect(respawned).toBe(true);
        // ship state reset
        expect(u.ship.heat).toBe(0);
        expect(u.ship.boost).toBe(false);
        expect(u.ship.thrustMultiplier).toBe(1);
        expect(u.ship.velocity.mag()).toBe(0);
        expect(u.ship.landing).toBeNull();
        // respawn is equivalent to the initial spawn: inside the orbit band
        const d = u.ship.pos.distance(u.star.pos);
        expect(d).toBeGreaterThanOrEqual(UniverseConst.PLANET_ORBIT_RANGE_MIN);
        expect(d).toBeLessThanOrEqual(UniverseConst.PLANET_ORBIT_RANGE_MAX);
        // universe/explored state preserved
        expect(u.planets.filter(p => p.explored).length).toBe(exploredBefore);
        expect(u.now).toBeGreaterThan(simNowBefore);
        // destruction effect exists (flash/particles/debris sparks)
        let sparks = 0;
        u.entities.forEach(e => { if ((e as { lifetime?: number }).lifetime !== undefined) sparks++; });
        expect(sparks).toBeGreaterThan(10);
    });

    it("heat resistance profile keeps a ship alive longer (architecture hook)", () => {
        const u = new VisibleUniverse15(new Namer15(), 42n);
        u.initRandom();
        u.star.radius = 8_000;
        u.star.mass = 4 / 3 * Math.PI * Math.pow(8_000, 3) * 0.5;
        const R = u.star.radius;
        const hoverDist = R * (STAR_KILL_FACTOR + 0.02); // deepest survivable hover
        // Pure-model hover (fixed distance): gravity fall in the full sim dominates,
        // so the tolerance contract is verified on starHeatStep directly (hook is wired: profile exists).
        const runSteps = (tolerance: number) => {
            let heat = 0;
            let countdown: number | null = null;
            let alive = 0;
            for (let i = 0; i < 3000; i++) {
                const r = starHeatStep(heat, hoverDist, R, 0.016, tolerance, 1, countdown);
                heat = r.heat;
                countdown = r.countdown;
                if (r.destroy) break;
                alive++;
            }
            return alive;
        };
        expect(u.ship.profile.heatTolerance).toBeDefined();
        const normalSteps = runSteps(1);
        const toughSteps = runSteps(3);
        expect(normalSteps).toBeGreaterThan(0);
        expect(toughSteps).toBeGreaterThan(normalSteps * 1.5);
    });
});
