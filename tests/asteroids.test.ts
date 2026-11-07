/**
 * Asteroid population tests (user 2026-11-09): clusters instead of one
 * uniform ring, BIG rocks (260–1400 m), deterministic per seed.
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
    it("spawns a plausible population: 4-6 clusters × 16-30 + 26 loners", () => {
        const u = makeUniverse(777n);
        const n = u.asteroids.length;
        expect(n).toBeGreaterThanOrEqual(4 * 16 + 26);
        expect(n).toBeLessThanOrEqual(6 * 30 + 26);
    });

    it("rocks are BIG: every radius in 260..1400", () => {
        const u = makeUniverse(777n);
        for (const a of u.asteroids) {
            expect(a.radius).toBeGreaterThanOrEqual(260);
            expect(a.radius).toBeLessThanOrEqual(1400);
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

    it("clusters exist: angular distribution is lumpy, not uniform", () => {
        // histogram of 12 angular bins — a clustered field has bins both
        // EMPTY and heavily POPULATED; a uniform ring fills all bins evenly
        const u = makeUniverse(777n);
        const bins = new Array(12).fill(0);
        for (const a of u.asteroids) {
            const rel = Math.atan2(a.pos.y - u.star.pos.y, a.pos.x - u.star.pos.x);
            bins[Math.floor(((rel / (2 * Math.PI)) % 1 + 1) % 1 * 12)]++;
        }
        const empty = bins.filter(b => b === 0).length;
        const max = Math.max(...bins);
        expect(empty).toBeGreaterThan(0);      // gaps between fields
        expect(max).toBeGreaterThan(15);       // dense cores
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
