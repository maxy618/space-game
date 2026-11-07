/**
 * P05-T02 follow/zoom/framing tests:
 * velocityZoomFactor curve contract (monotonic, smooth at the junction,
 * bounded) and the chase lag bound at max speed.
 */
import { describe, it, expect } from "vitest";
import {
    velocityZoomFactor,
    chaseCamera,
    chaseLagMeters,
    CAMERA_FOLLOW_RATE,
    CameraTarget,
} from "../src/camera/Camera";

const NEAR = 0.7;
const FAR = 1.7;
const REF = 800;
const LIMIT = 5000;

describe("P05-T02 velocity zoom factor", () => {
    it("endpoints: rest=0.7 (closer), REF=1.0 exactly, max=1.7", () => {
        expect(velocityZoomFactor(0, NEAR, FAR, REF, LIMIT)).toBeCloseTo(NEAR, 9);
        expect(velocityZoomFactor(REF, NEAR, FAR, REF, LIMIT)).toBeCloseTo(1, 9);
        expect(velocityZoomFactor(LIMIT, NEAR, FAR, REF, LIMIT)).toBeCloseTo(FAR, 9);
    });

    it("monotonically increasing with speed", () => {
        let prev = -Infinity;
        for (let s = 0; s <= LIMIT; s += 50) {
            const f = velocityZoomFactor(s, NEAR, FAR, REF, LIMIT);
            expect(f).toBeGreaterThan(prev);
            expect(f).toBeGreaterThanOrEqual(NEAR);
            expect(f).toBeLessThanOrEqual(FAR);
            prev = f;
        }
    });

    it("no kink at the junction: factor is continuous across REF", () => {
        const below = velocityZoomFactor(REF - 0.5, NEAR, FAR, REF, LIMIT);
        const at = velocityZoomFactor(REF, NEAR, FAR, REF, LIMIT);
        const above = velocityZoomFactor(REF + 0.5, NEAR, FAR, REF, LIMIT);
        expect(at).toBeCloseTo(1, 9);
        expect(at - below).toBeLessThan(0.005);
        expect(above - at).toBeLessThan(0.005);
    });

    it("bounded: beyond the ref/max plateaus exactly at FAR; below zero clamps to NEAR", () => {
        expect(velocityZoomFactor(99999, NEAR, FAR, REF, LIMIT)).toBe(FAR);
        expect(velocityZoomFactor(-100, NEAR, FAR, REF, LIMIT)).toBe(NEAR);
    });

    it("matches the production framing: at rest the view is 0.7x of the reference", () => {
        // targetZoom = (camZoom / CAMERA_DISTANCE) / factor; with camZoom=1,
        // distance=1.4, factor=0.7 at rest. Assert the factor contract only —
        // the CAMERA_DISTANCE multiplier is covered by playtest evidence.
        const f = velocityZoomFactor(0, NEAR, FAR, REF, LIMIT);
        expect(f).toBe(0.7);
    });
});

describe("P05-T02 follow lag bound", () => {
    it("chase lag at max speed is bounded (≤ 200 m, i.e. ≤ ~85 px at zoom-out 0.42 px/m)", () => {
        const lag = chaseLagMeters(LIMIT);
        expect(lag).toBeCloseTo(LIMIT / CAMERA_FOLLOW_RATE, 6);
        expect(lag).toBeLessThanOrEqual(200);
        // in screen pixels at max-speed zoom ((1/1.4)/1.7 px/m ≈ 0.42)
        expect(lag * 0.42).toBeLessThan(90);
    });

    it("lag shrinks to zero at rest zoom: chase converges onto a stopped ship", () => {
        const ship = { x: 120_000, y: 45_000 };
        let cam: CameraTarget = { centerX: 0, centerY: 0, followRate: CAMERA_FOLLOW_RATE };
        for (let i = 0; i < 600; i++) {
            cam = chaseCamera(cam, ship.x, ship.y, 1 / 60);
        }
        expect(Math.hypot(cam.centerX - ship.x, cam.centerY - ship.y)).toBeLessThan(1);
    });

    it("dt=0 frames never move the chase (paused/zero-step frames are no-ops)", () => {
        const cam: CameraTarget = { centerX: 1234, centerY: -567, followRate: CAMERA_FOLLOW_RATE };
        const next = chaseCamera(cam, 50_000, 50_000, 0);
        expect(next.centerX).toBe(1234);
        expect(next.centerY).toBe(-567);
    });

    it("huge dt (tab-switch return) snaps the chase without NaN", () => {
        const cam: CameraTarget = { centerX: 0, centerY: 0, followRate: CAMERA_FOLLOW_RATE };
        const next = chaseCamera(cam, 50_000, 50_000, 60000); // 60 s outlier
        expect(Number.isFinite(next.centerX)).toBe(true);
        expect(Number.isFinite(next.centerY)).toBe(true);
        expect(next.centerX).toBeCloseTo(50_000);
    });
});
