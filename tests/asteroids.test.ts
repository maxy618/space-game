/**
 * Asteroid population tests (user 2026-11-09): clusters instead of one
 * uniform ring, BIG rocks (260–1400 m) + a small-debris layer (30–120 m,
 * wish 35), deterministic per seed.
 */
import { describe, it, expect } from "vitest";
import { Namer } from "../src/core/Namer";
import { Universe, UniverseConst } from "../src/universe/Universe";

function makeUniverse(seed: bigint) {
    const u = new Universe(new Namer(), seed);
    u.initRandom();
    return u;
}

describe("asteroid population (clusters + big rocks)", () => {
    it("spawns a plausible population: 4-6 clusters × (16-30 big + 34-72 small) + 26 loners + 40 scattered small", () => {
        const u = makeUniverse(777n);
        const big = u.asteroids.filter(a => a.radius >= 260);
        const small = u.asteroids.filter(a => a.radius < 260);
        // big: cluster rocks + loners; small: cluster pebbles + scattered dust
        expect(big.length).toBeGreaterThanOrEqual(4 * 16 + 26);
        expect(big.length).toBeLessThanOrEqual(6 * 30 + 26);
        expect(small.length).toBeGreaterThanOrEqual(4 * 34 + 40);
        expect(small.length).toBeLessThanOrEqual(6 * 72 + 40);
    });

    it("rocks are BIG (260..1400) or SMALL debris (30..120)", () => {
        const u = makeUniverse(777n);
        for (const a of u.asteroids) {
            const big = a.radius >= 260 && a.radius <= 1400;
            const small = a.radius >= 30 && a.radius <= 120;
            expect(big || small).toBe(true);
        }
    });

    it("rocks live in the belt (45..130 km from the star)", () => {
        const u = makeUniverse(777n);
        for (const a of u.asteroids) {
            const d = a.pos.distance(u.star.pos);
            expect(d).toBeGreaterThanOrEqual(45_000);
            expect(d).toBeLessThanOrEqual(130_000);
        }
    });

    it("clusters exist: BIG-rock angular distribution is lumpy, not uniform", () => {
        // histogram of 12 angular bins over BIG rocks only (small debris is
        // deliberately spread along the whole belt and would fill the gaps).
        const u = makeUniverse(777n);
        const bins = new Array(12).fill(0);
        let big = 0;
        for (const a of u.asteroids) {
            if (a.radius < 260) continue;
            big++;
            const rel = Math.atan2(a.pos.y - u.star.pos.y, a.pos.x - u.star.pos.x);
            bins[Math.floor(((rel / (2 * Math.PI)) % 1 + 1) % 1 * 12)]++;
        }
        // lumpy = the three densest bins hold a clear over-share
        // (uniform would give each bin ~1/12 ≈ 8.3%, top-3 ≈ 25%)
        const top3 = [...bins].sort((x, y) => y - x).slice(0, 3).reduce((s, v) => s + v, 0);
        expect(top3).toBeGreaterThan(big * 0.38);
        expect(Math.max(...bins)).toBeGreaterThan((big / 12) * 1.8);
    });

    it("deterministic per seed (same seed → identical population)", () => {
        const a = makeUniverse(4242n);
        const b = makeUniverse(4242n);
        expect(b.asteroids.length).toBe(a.asteroids.length);
        for (let i = 0; i < a.asteroids.length; i++) {
            expect(b.asteroids[i].pos.x).toBe(a.asteroids[i].pos.x);
            expect(b.asteroids[i].pos.y).toBe(a.asteroids[i].pos.y);
            expect(b.asteroids[i].radius).toBe(a.asteroids[i].radius);
        }
    });
});
