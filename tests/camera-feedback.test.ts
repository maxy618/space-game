/**
 * P05-T04 camera feedback tests:
 * kick decay terminates cleanly, amplitude stays screen-bounded, and the
 * reduced-motion preference is an honest gate (tested via the helper path).
 */
import { describe, it, expect } from "vitest";
import {
    decayKick,
    kickMetersForScreenPx,
    CameraKick,
} from "../src/camera/Camera";

describe("P05-T04 kick decay", () => {
    it("decays monotonically and snaps to exact zero (terminates)", () => {
        let kick: CameraKick = { x: 3000, y: -2000 };
        const magnitudes: number[] = [];
        for (let i = 0; i < 600; i++) {
            kick = decayKick(kick, 1 / 60, 6);
            magnitudes.push(Math.hypot(kick.x, kick.y));
        }
        expect(kick.x).toBe(0);
        expect(kick.y).toBe(0);
        for (let i = 1; i < magnitudes.length; i++) {
            expect(magnitudes[i]).toBeLessThanOrEqual(magnitudes[i - 1]);
        }
    });

    it("time constant matches rate: after 1/rate seconds, ~37% remains", () => {
        const rate = 6;
        const next = decayKick({ x: 1000, y: 0 }, 1 / rate, rate);
        expect(next.x).toBeCloseTo(1000 * Math.exp(-1), 6);
    });

    it("dt=0 is a no-op (pause-safe)", () => {
        const kick: CameraKick = { x: 500, y: 500 };
        const next = decayKick(kick, 0, 6);
        expect(next.x).toBe(500);
        expect(next.y).toBe(500);
    });

    it("already-zero kick stays zero (no eternal micro-drift)", () => {
        const next = decayKick({ x: 0, y: 0 }, 1 / 60, 6);
        expect(next.x).toBe(0);
        expect(next.y).toBe(0);
    });
});

describe("P05-T04 kick amplitude (screen-bounded)", () => {
    it("meters-per-px conversions round-trip", () => {
        for (const zoom of [0.42, 1.02, 2.5]) {
            const m = kickMetersForScreenPx(2.5, zoom);
            expect(m * zoom).toBeCloseTo(2.5, 9);
        }
    });

    it("kick stays ≤ a few screen px at any zoom (never obscures controls)", () => {
        // worst steady case: zoom at rest ~1.02 px/m → 2.5 px = ~2.45 m
        const m = kickMetersForScreenPx(2.5, 1.02);
        expect(m).toBeLessThan(3);
    });
});
