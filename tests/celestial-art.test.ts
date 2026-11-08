/**
 * P06–P08 celestial art math: FBM determinism + palettes + lighting.
 */
import { describe, it, expect } from "vitest";
import { hash01, valueNoise, fbm, fbmWarped, starPaletteFor, planetPaletteFor, sunDirection, diffuseLight, rimFactor, coronaIntensity } from "../src/render/CelestialArt";

describe("CelestialArt noise", () => {
    it("hash01 is deterministic and in [0,1)", () => {
        expect(hash01(3, 7, 42)).toBe(hash01(3, 7, 42));
        for (let x = -20; x < 20; x++) {
            const h = hash01(x, x * 3, 9);
            expect(h).toBeGreaterThanOrEqual(0);
            expect(h).toBeLessThan(1);
        }
    });

    it("valueNoise is smooth (adjacent points closer than far points)", () => {
        const a = valueNoise(1.5, 1.5, 5);
        const b = valueNoise(1.6, 1.5, 5);
        const c = valueNoise(8.5, 8.5, 5);
        expect(Math.abs(a - b)).toBeLessThan(Math.abs(a - c));
    });

    it("fbm is deterministic per seed, different across seeds, in [0,1)", () => {
        expect(fbm(2.3, 4.1, 77, 5)).toBe(fbm(2.3, 4.1, 77, 5));
        expect(fbm(2.3, 4.1, 77, 5)).not.toBe(fbm(2.3, 4.1, 78, 5));
        for (let i = 0; i < 50; i++) {
            const v = fbm(i * 0.37, i * 0.11, 3, 6);
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThan(1);
        }
    });

    it("fbmWarped is deterministic", () => {
        expect(fbmWarped(1.2, 2.8, 11, 4)).toBe(fbmWarped(1.2, 2.8, 11, 4));
    });
});

describe("CelestialArt palettes", () => {
    it("seven star classes have distinct palettes", () => {
        const sig = new Set(Array.from({ length: 7 }, (_, c) => JSON.stringify(starPaletteFor(c))));
        expect(sig.size).toBe(7);
    });

    it("planet palettes vary by family (not one hue)", () => {
        const sig = new Set([0.05, 0.2, 0.35, 0.5, 0.62, 0.77, 0.93].map(s => JSON.stringify(planetPaletteFor(s))));
        expect(sig.size).toBeGreaterThanOrEqual(5);
    });
});

describe("CelestialArt lighting", () => {
    it("sun direction is unit and points at the star", () => {
        const d = sunDirection(0, 0, 30, 40);
        expect(Math.hypot(d.x, d.y)).toBeCloseTo(1, 10);
        expect(d.x).toBeCloseTo(0.6, 10);
    });

    it("diffuse: noon = 1, midnight = 0, terminator soft", () => {
        expect(diffuseLight(1, 0, { x: 1, y: 0 })).toBeCloseTo(1, 10);
        expect(diffuseLight(-1, 0, { x: 1, y: 0 })).toBe(0);
        const t = diffuseLight(0, 1, { x: 1, y: 0 });
        expect(t).toBeGreaterThan(0);
        expect(t).toBeLessThan(1);
    });

    it("rim factor peaks at the limb, zero facing centre/camera", () => {
        expect(rimFactor(0, 1, 0, 1, 3)).toBeCloseTo(0, 10);
        expect(rimFactor(1, 0, 0, 1, 3)).toBeCloseTo(1, 10);
    });

    it("corona decays exponentially and is 1 at the limb", () => {
        expect(coronaIntensity(5, 5, 0.1)).toBe(1);
        const a = coronaIntensity(6, 5, 0.5);
        const b = coronaIntensity(7, 5, 0.5);
        expect(a).toBeGreaterThan(b);
        expect(b).toBeGreaterThan(0);
    });
});
