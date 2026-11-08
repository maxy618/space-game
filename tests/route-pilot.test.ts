/**
 * RoutePilot tests (user 2026-11-09): A→B autopilot with auto-boost and
 * stop-on-threat. Numeric verification.
 */
import { describe, it, expect } from "vitest";
import { createRoutePilot, pilotStep, RouteThreat } from "../src/sim/RoutePilot";

const TARGET = { x: 100_000, y: 0, radius: 2_000 };

describe("route pilot", () => {
    it("chase: full thrust toward target, NEVER boost (manual-only)", () => {
        const s = createRoutePilot();
        s.active = true;
        const intent = pilotStep(s, TARGET, [], { x: 0, y: 0, vx: 0, vy: 0, angle: 0 }, 0.016, 1000);
        expect(intent.thrustX).toBeCloseTo(1, 3);
        expect(intent.thrustY).toBeCloseTo(0, 3);
        expect(intent.boost).toBe(false);
        expect(s.wantBoost).toBe(false);
    });

    it("intermediate: pursuit NEVER boosts (boost is manual-only)", () => {
        const s = createRoutePilot();
        s.active = true;
        const intent = pilotStep(
            s, TARGET, [],
            { x: 0, y: 0, vx: 4000, vy: 0, angle: 0 },
            0.016, 1000,
            { intermediate: true },
        );
        expect(s.phase).toBe("chase");
        expect(intent.boost).toBe(false);
        expect(intent.thrustX).toBeCloseTo(1, 3);
    });

    it("brake: inside the braking window the pilot thrusts retrograde", () => {
        const s = createRoutePilot();
        s.active = true;
        // ship 5 km before the arrival ring, inbound at 3000 m/s:
        // brakeDist = 3000²/(2·1000) + 2600 = 7100 → braking window ≈ 8165 m
        const intent = pilotStep(
            s, TARGET, [],
            { x: 93_000, y: 0, vx: 3000, vy: 0, angle: 0 },
            0.016, 1000,
        );
        expect(s.phase).toBe("brake");
        expect(intent.thrustX).toBeCloseTo(-1, 3); // retrograde
        expect(intent.boost).toBe(false);
    });

    it("arrived: holds position, no thrust", () => {
        const s = createRoutePilot();
        s.active = true;
        const intent = pilotStep(s, TARGET, [], { x: 98_000, y: 0, vx: 0, vy: 0, angle: 0 }, 0.016, 1000);
        expect(intent.thrustX).toBe(0);
        expect(intent.thrustY).toBe(0);
    });

    it("THREAT: stops (retrograde to zero), reports stop, waits, then resumes on course", () => {
        const s = createRoutePilot();
        s.active = true;
        // a rock dead on the course with TTI < 5 s
        const threats: RouteThreat[] = [{ x: 50_000, y: 0, vx: 0, vy: 0, radius: 800 }];
        const intent = pilotStep(s, TARGET, threats, { x: 0, y: 0, vx: 1000, vy: 0, angle: 0 }, 0.016, 1000);
        // far rock: TTI (50 000−800)/1000 = 49.2 s → no stop, just chase
        expect(s.phase).not.toBe("stopped");
        // close rock: TTI (5 000−800)/1000 = 4.2 s < 5 → STOP
        const close = pilotStep(s, TARGET, [{ x: 5_000, y: 0, vx: 0, vy: 0, radius: 800 }], { x: 0, y: 0, vx: 1000, vy: 0, angle: 0 }, 0.016, 1000);
        expect(s.phase).toBe("stopped");
        expect(close.stopRequested).toBe(true);
        expect(close.thrustX).toBeCloseTo(-1, 3); // braking to a stop
        // threat gone + player steered back → resume
        const resume = pilotStep(s, TARGET, [], { x: 0, y: 0, vx: 0, vy: 0, angle: 0 }, 0.016, 1000);
        expect(s.phase).toBe("chase");
        expect(resume.thrustX).toBeCloseTo(1, 3);
    });

    it("stopped: refuses to resume while the heading is still off-course", () => {
        const s = createRoutePilot();
        s.active = true;
        s.phase = "stopped";
        const intent = pilotStep(s, TARGET, [], { x: 0, y: 0, vx: 0, vy: 0, angle: 1.2 }, 0.016, 1000);
        expect(s.phase).toBe("stopped");
        expect(intent.stopRequested).toBe(true);
    });
});
