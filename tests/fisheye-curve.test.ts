/**
 * Fisheye driver curve tests (user 2026-11-08): the warp strength follows
 * ACTUAL ship velocity, not the boost button. Mapping/orientation of the
 * warp itself is unchanged and lives in the renderer blit.
 */
import { describe, it, expect } from "vitest";
import { fisheyeTargetForSpeed } from "../src/camera/Camera";

const CAP = 6000;

describe("fisheyeTargetForSpeed", () => {
    it("is zero at and below the boost cap (normal flight unchanged)", () => {
        expect(fisheyeTargetForSpeed(0, CAP)).toBe(0);
        expect(fisheyeTargetForSpeed(1000, CAP)).toBe(0);
        expect(fisheyeTargetForSpeed(4000, CAP)).toBe(0);
        expect(fisheyeTargetForSpeed(CAP, CAP)).toBe(0);
    });

    it("grows gradually above 6000 with diminishing increments", () => {
        const at = (v: number) => fisheyeTargetForSpeed(v, CAP);
        expect(at(7000)).toBeGreaterThan(0);
        expect(at(7000)).toBeLessThan(0.2);
        // increments shrink as speed rises (log curve)
        const d1 = at(8000) - at(7000);
        const d2 = at(20000) - at(19000);
        expect(d2).toBeLessThan(d1);
        // monotonic
        expect(at(12000)).toBeGreaterThan(at(9000));
        expect(at(25000)).toBeGreaterThan(at(12000));
    });

    it("stays subtle at 30000 (slightly more noticeable, not overwhelming)", () => {
        const t = fisheyeTargetForSpeed(30000, CAP);
        expect(t).toBeCloseTo(0.6, 3); // 0.6 of the (already reduced) full warp
        expect(t).toBeLessThan(0.65);
    });
});
