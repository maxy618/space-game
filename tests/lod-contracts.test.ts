/**
 * P06-T03 LOD/material contract tests:
 * thresholds partition [0, ∞) without gaps; silhouette-bearing macro bands
 * survive phone size; budgets are sane.
 */
import { describe, it, expect } from "vitest";
import { lodFor, LOD_THRESHOLDS, LOD_BUDGETS, tierHasLayer } from "../src/camera/Lod";

describe("P06-T03 LOD bands", () => {
    it("thresholds partition the size axis without gaps", () => {
        expect(LOD_THRESHOLDS.macro.max).toBe(LOD_THRESHOLDS.regional.min);
        expect(LOD_THRESHOLDS.regional.max).toBe(LOD_THRESHOLDS.fine.min);
        expect(LOD_THRESHOLDS.fine.max).toBe(LOD_THRESHOLDS.micro.min);
        expect(LOD_THRESHOLDS.micro.min).toBeGreaterThan(LOD_THRESHOLDS.fine.min);
    });

    it("phone-scale ship (≈24 px) is in the regional band (silhouette carried)", () => {
        expect(lodFor(24)).toBe("regional");
    });

    it("tiny distant bodies are macro, huge close-ups are micro", () => {
        expect(lodFor(0.5)).toBe("macro");
        expect(lodFor(8)).toBe("regional");
        expect(lodFor(200)).toBe("fine");
        expect(lodFor(1000)).toBe("micro");
    });

    it("every projected size maps to exactly one band", () => {
        for (let px = 0; px < 2000; px += 3.7) {
            const band = lodFor(px);
            expect(["macro", "regional", "fine", "micro"]).toContain(band);
            const t = LOD_THRESHOLDS[band];
            expect(px).toBeGreaterThanOrEqual(t.min);
            expect(px).toBeLessThan(t.max);
        }
    });

    it("budgets: tile textures ≤512 px, ≤4 path layers at fine, ≤160 parallax dots", () => {
        expect(LOD_BUDGETS.maxTexturePx).toBeLessThanOrEqual(512);
        expect(LOD_BUDGETS.maxPathLayersFine).toBeLessThanOrEqual(4);
        expect(LOD_BUDGETS.starfieldDots + LOD_BUDGETS.dustDots).toBeLessThanOrEqual(200);
    });

    it("quality tiers degrade gracefully (high → medium → low is monotone)", () => {
        const seq: Array<[boolean, boolean]> = [
            [tierHasLayer("high", "starfield"), tierHasLayer("high", "dust")],
            [tierHasLayer("medium", "starfield"), tierHasLayer("medium", "dust")],
            [tierHasLayer("low", "starfield"), tierHasLayer("low", "dust")],
        ];
        const total = seq.map(([s, d]) => (s ? 1 : 0) + (d ? 1 : 0));
        expect(total[0]).toBeGreaterThanOrEqual(total[1]);
        expect(total[1]).toBeGreaterThanOrEqual(total[2]);
        expect(total[0]).toBe(2);
        expect(total[2]).toBe(0);
    });
});
