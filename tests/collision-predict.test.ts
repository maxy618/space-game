/**
 * Collision-prediction tests (user 2026-11-08): numeric verification of the
 * time-to-impact solver and the anti-false-positive gates. All values are
 * game units (meters, seconds).
 */
import { describe, it, expect } from "vitest";
import {
    timeToImpact, impactGatesPass, impactLatchedThreat, evaluateImpact,
    IMPACT_NOSE_HALF_ANGLE, IMPACT_MIN_CLOSING, IMPACT_CLEAR_SECONDS,
} from "../src/universe/CollisionPredict";

describe("timeToImpact (closed-form closest approach)", () => {
    it("head-on collision: TTI = distance / closing speed", () => {
        // ship at origin flying +x at 1000; obstacle 5000 ahead at rest
        const r = timeToImpact(5000, 0, -1000, 0, 100);
        expect(r.tti).not.toBeNull();
        // contact when gap 5000 − 100·t... centers close to R=100: (5000−1000t)=100 → t=4.9
        expect(r.tti).toBeCloseTo(4.9, 3);
        expect(r.closing).toBeCloseTo(1000, 3);
    });

    it("miss: parallel paths never come within R", () => {
        // obstacle ahead but offset laterally by 500 with R=100
        const r = timeToImpact(5000, 500, -1000, 0, 100);
        expect(r.tti).toBeNull();
    });

    it("receding target: no positive root", () => {
        const r = timeToImpact(5000, 0, 1000, 0, 100); // obstacle fleeing, same direction faster
        expect(r.tti).toBeNull();
        expect(r.closing).toBeLessThan(0);
    });

    it("moving obstacle crossing the course: TTI accounts for its motion", () => {
        // ship chases obstacle: obstacle 4000 ahead moving away at 500,
        // ship at 1000 → closes at 500 → (4000−500t)=100 → t=7.8
        const r = timeToImpact(4000, 0, -500, 0, 100);
        expect(r.tti).not.toBeNull();
        expect(r.tti).toBeCloseTo(7.8, 3);
    });

    it("already overlapping: TTI ≈ 0", () => {
        const r = timeToImpact(50, 0, -100, 0, 100);
        expect(r.tti).not.toBeNull();
        expect(r.tti!).toBeLessThan(0.01);
    });
});

describe("impact gates (user's anti-false-positive spec)", () => {
    const bearing = 0; // threat dead ahead (+x)
    const base = {
        shipAngle: 0,       // nose at the threat
        bearing,
        relCourse: 0,       // relative velocity points at the threat
        closing: 500,
    };

    it("fires when nose + trajectory + closing all agree", () => {
        expect(impactGatesPass(base)).toBe(true);
    });

    it("does NOT fire when the nose points away (drifting past)", () => {
        expect(impactGatesPass({ ...base, shipAngle: 1.0 })).toBe(false);
    });

    it("does NOT fire when the trajectory misses the threat", () => {
        expect(impactGatesPass({ ...base, relCourse: 1.0 })).toBe(false);
    });

    it("does NOT fire when barely closing (landing approach)", () => {
        expect(impactGatesPass({ ...base, closing: IMPACT_MIN_CLOSING - 1 })).toBe(false);
        // a landing: nose at the ground, deceleration ~zero closing
        expect(impactGatesPass({ ...base, closing: 5 })).toBe(false);
    });

    it("nose gate is exactly the promised half-angle", () => {
        expect(impactGatesPass({ ...base, shipAngle: IMPACT_NOSE_HALF_ANGLE - 0.001 })).toBe(true);
        expect(impactGatesPass({ ...base, shipAngle: IMPACT_NOSE_HALF_ANGLE + 0.05 })).toBe(false);
    });
});

describe("evaluateImpact (level mapping)", () => {
    it("picks the smallest gated TTI and escalates to critical ≤ 3 s", () => {
        const s = evaluateImpact([
            { bearing: 0, relCourse: 0, closing: 500, tti: 4.2 },
            { bearing: 0, relCourse: 0, closing: 500, tti: 2.1 },
        ], 0);
        expect(s).not.toBeNull();
        expect(s!.tti).toBeCloseTo(2.1, 5);
        expect(s!.level).toBe("critical");
    });

    it("warning level above the critical threshold", () => {
        const s = evaluateImpact([{ bearing: 0, relCourse: 0, closing: 500, tti: 4.4 }], 0);
        expect(s!.level).toBe("warning");
    });

    it("ignores ungated candidates entirely", () => {
        const s = evaluateImpact([{ bearing: 0, relCourse: 2.5, closing: 500, tti: 1.0 }], 0);
        expect(s).toBeNull();
    });
});

describe("impact latch (user 2026-11-09)", () => {
    it("keeps a fired warning alive while physics still predicts the impact", () => {
        // nose turned away AFTER the alert fired: TTI/closing unchanged —
        // the warning must persist (the ship is still flying into the body)
        expect(impactLatchedThreat(2.0, 500)).toBe(true);
        expect(impactLatchedThreat(IMPACT_CLEAR_SECONDS, 100)).toBe(true);
    });

    it("releases only when the impact itself is gone", () => {
        expect(impactLatchedThreat(null, 500)).toBe(false); // miss / separating
        expect(impactLatchedThreat(IMPACT_CLEAR_SECONDS + 0.1, 500)).toBe(false); // out of window
        expect(impactLatchedThreat(2.0, IMPACT_MIN_CLOSING - 1)).toBe(false); // braked to landing pace
    });
});
