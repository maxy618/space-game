/**
 * P05-T03 parallax depth layer tests:
 * wrap math, parallax sign/direction, zoom independence, starfield determinism.
 */
import { describe, it, expect } from "vitest";
import {
    wrapTile,
    parallaxOffsetPx,
    STARFIELD_PARALLAX_PX_PER_M,
    DUST_PARALLAX_PX_PER_M,
    worldToScreen,
} from "../src/camera/Camera";
import { newRandom } from "../src/core/RandomKt";

describe("P05-T03 tile wrapping", () => {
    it("wraps into [0, tile)", () => {
        expect(wrapTile(-1, 512)).toBe(511);
        expect(wrapTile(511, 512)).toBe(511);
        expect(wrapTile(512, 512)).toBe(0);
        expect(wrapTile(513, 512)).toBe(1);
        expect(wrapTile(-1024, 512)).toBe(0);
        expect(wrapTile(0, 512)).toBe(0);
    });

    it("is phase-locked: same input offset always maps to the same tile position", () => {
        const a = wrapTile(100 + 5 * 512, 512);
        const b = wrapTile(100 + 500 * 512, 512);
        expect(a).toBe(b);
        expect(a).toBe(100);
    });
});

describe("P05-T03 parallax motion", () => {
    it("far layer moves with camera but much slower than the world plane", () => {
        // camera travels +10 000 m
        const farShift = Math.abs(parallaxOffsetPx(10_000, 1, STARFIELD_PARALLAX_PX_PER_M));
        const worldShift = worldToScreen(10_000, 0, 1280, 800, 1, 10_000, 0).x
            - worldToScreen(10_000, 0, 1280, 800, 1, 0, 0).x;
        expect(farShift).toBeCloseTo(800, 6); // 0.08 px/m × 10 000 m
        expect(Math.abs(worldShift)).toBeCloseTo(10_000, 6); // world plane: full 1 px/m
        expect(farShift).toBeLessThan(Math.abs(worldShift));
    });

    it("foreground dust moves faster than the world plane", () => {
        const dustShift = Math.abs(parallaxOffsetPx(10_000, 1, DUST_PARALLAX_PX_PER_M));
        expect(dustShift).toBeCloseTo(13_000, 6); // 1.3 px/m
        expect(dustShift).toBeGreaterThan(10_000);
    });

    it("parallax shift scales with devicePixelRatio (device px), zoom never consulted", () => {
        expect(parallaxOffsetPx(10_000, 3, STARFIELD_PARALLAX_PX_PER_M)).toBeCloseTo(2400, 6);
        expect(parallaxOffsetPx(10_000, 1, STARFIELD_PARALLAX_PX_PER_M)).toBeCloseTo(800, 6);
        // ratio equals dpr ratio — this is the entire function of "zoom" here
        const r = parallaxOffsetPx(10_000, 3, STARFIELD_PARALLAX_PX_PER_M)
            / parallaxOffsetPx(10_000, 1, STARFIELD_PARALLAX_PX_PER_M);
        expect(r).toBeCloseTo(3, 9);
    });

    it("sign: camera moving +x moves the layer −x (same direction as world)", () => {
        const off = parallaxOffsetPx(10_000, 1, STARFIELD_PARALLAX_PX_PER_M);
        expect(off).toBeGreaterThan(0);
        // the draw call negates it: screen = base − off → layer drifts left
        // while the camera moves right, exactly like world points do.
        const worldDelta = worldToScreen(0, 0, 1280, 800, 1, 10_000, 0).x
            - worldToScreen(0, 0, 1280, 800, 1, 0, 0).x;
        expect(worldDelta).toBeLessThan(0);
    });
});

describe("P05-T03 starfield determinism", () => {
    it("same seed reproduces identical star tiles", () => {
        const gen = () => {
            const rng = newRandom(123456789n);
            return Array.from({ length: 20 }, () => [rng.minmax(0, 512), rng.minmax(0, 512)]);
        };
        expect(gen()).toEqual(gen());
    });

    it("star coordinates stay inside the tile", () => {
        const rng = newRandom(123456789n);
        for (let i = 0; i < 140; i++) {
            const x = rng.minmax(0, 512);
            const y = rng.minmax(0, 512);
            expect(x).toBeGreaterThanOrEqual(0);
            expect(x).toBeLessThan(512);
            expect(y).toBeGreaterThanOrEqual(0);
            expect(y).toBeLessThan(512);
        }
    });
});
