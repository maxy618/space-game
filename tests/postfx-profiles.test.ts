/**
 * P08 PostFX contracts: blend ramps terminate, profiles gate correctly,
 * tier features are monotone, lensing/shimmer math is sane.
 */
import { describe, it, expect } from "vitest";
import { blendRamp, decayToZero, lensingStrength, shimmerMask, POSTFX_TIER_FEATURES, NEUTRAL_PARAMS } from "../src/render/PostFX";

describe("P08 profile blending", () => {
    it("blendRamp hits exact 0 at start and exact 1 at end", () => {
        expect(blendRamp(0, 0.4)).toBe(0);
        expect(blendRamp(10, 0.4)).toBe(1);
        expect(blendRamp(0.2, 0.4)).toBeCloseTo(0.5, 10);
    });

    it("decayToZero terminates to exact 0 (no eternal drift)", () => {
        let v = 1;
        for (let i = 0; i < 300; i++) v = decayToZero(v, 0.016, 6);
        expect(v).toBe(0);
    });

    it("lensing strength is 0 without a hole, peaks near the shadow", () => {
        expect(lensingStrength(0.1, 0)).toBe(0);
        expect(lensingStrength(0.05, 0.05)).toBeGreaterThan(lensingStrength(0.3, 0.05));
        expect(lensingStrength(0.05, 0.05)).toBeLessThanOrEqual(0.4);
    });

    it("shimmer mask fades with distance", () => {
        expect(shimmerMask(0)).toBe(1);
        expect(shimmerMask(1)).toBe(0);
        expect(shimmerMask(0.25)).toBeGreaterThan(shimmerMask(0.4));
    });

    it("neutral params are all-zero effects", () => {
        expect(NEUTRAL_PARAMS.warp).toBe(0);
        expect(NEUTRAL_PARAMS.blackHole).toBe(0);
        expect(NEUTRAL_PARAMS.impact).toBe(0);
    });
});

describe("P08 quality tiers", () => {
    it("tiers are monotone high ≥ medium ≥ low", () => {
        const score = (t: typeof POSTFX_TIER_FEATURES.high) =>
            (t.bloom ? 1 : 0) + (t.distortion ? 1 : 0) + (t.grain ? 1 : 0);
        expect(score(POSTFX_TIER_FEATURES.high)).toBeGreaterThanOrEqual(score(POSTFX_TIER_FEATURES.medium));
        expect(score(POSTFX_TIER_FEATURES.medium)).toBeGreaterThanOrEqual(score(POSTFX_TIER_FEATURES.low));
        expect(score(POSTFX_TIER_FEATURES.low)).toBe(0);
    });

    it("high has everything, off has nothing", () => {
        expect(POSTFX_TIER_FEATURES.high.bloom).toBe(true);
        expect(POSTFX_TIER_FEATURES.off.bloom).toBe(false);
    });
});
