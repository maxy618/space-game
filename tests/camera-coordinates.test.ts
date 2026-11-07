/**
 * P05-T01 coordinate-space tests:
 * world/system/ship/camera/screen/device transforms round-trip exactly,
 * camera interpolation is physics-independent and frame-rate independent.
 */
import { describe, it, expect } from "vitest";
import {
    visibleSpaceMeters,
    visibleRect,
    worldToScreen,
    screenToWorld,
    screenToDevice,
    deviceToScreen,
    chaseCamera,
    CameraTarget,
} from "../src/camera/Camera";

describe("P05-T01 world↔screen transforms", () => {
    it("world→screen→world round-trips at rest zoom on desktop 1280x800", () => {
        const zoom = 1.0; // CSS px per meter at rest
        const center = { x: -20021, y: -106602 }; // ship pos from a real run
        const points: Array<[number, number]> = [
            [-20021, -106602],
            [0, 0],
            [45000, -90000],
            [199999, 199999],
        ];
        for (const [wx, wy] of points) {
            const s = worldToScreen(wx, wy, 1280, 800, zoom, center.x, center.y);
            const back = screenToWorld(s.x, s.y, 1280, 800, zoom, center.x, center.y);
            expect(back.x).toBeCloseTo(wx, 6);
            expect(back.y).toBeCloseTo(wy, 6);
        }
    });

    it("ship at camera center maps to viewport center", () => {
        const s = worldToScreen(100, -50, 1280, 800, 2, 100, -50);
        expect(s.x).toBe(640);
        expect(s.y).toBe(400);
    });

    it("same world distance scales inversely with zoom (zoom out = more meters per px)", () => {
        const a = worldToScreen(1000, 0, 1280, 800, 1, 0, 0); // +1000 m at 1 px/m
        const b = worldToScreen(1000, 0, 1280, 800, 0.5, 0, 0); // same span at half zoom
        expect(a.x - 640).toBeCloseTo(1000, 6);
        expect(b.x - 640).toBeCloseTo(500, 6);
    });

    it("visibleSpaceMeters matches viewport/zoom", () => {
        expect(visibleSpaceMeters(1280, 1)).toBe(1280);
        expect(visibleSpaceMeters(1280, 0.5)).toBe(2560);
        expect(visibleSpaceMeters(412, 1.4)).toBeCloseTo(294.3, 1);
    });

    it("visibleRect is centered on the camera target", () => {
        const r = visibleRect(1280, 800, 1, 1000, -500);
        expect(r.width).toBe(1280);
        expect(r.height).toBe(800);
        expect(r.centerX).toBe(1000);
        expect(r.centerY).toBe(-500);
        expect(r.left).toBe(1000 - 640);
        expect(r.top).toBe(-500 - 400);
    });
});

describe("P05-T01 device-space (backing store)", () => {
    it("screen→device→screen round-trips for dpr 1, 2, 3 (2.5K phone)", () => {
        for (const dpr of [1, 1.5, 2, 3]) {
            const dev = screenToDevice(300, dpr);
            expect(deviceToScreen(dev, dpr)).toBeCloseTo(300, 9);
        }
    });

    it("one meter at rest zoom is dpr-independent in CSS px", () => {
        // cameraZoom is CSS px/meter; the JS canvas scale is zoom*dpr.
        // The rendered ship must occupy the same CSS-px size at any dpr.
        for (const dpr of [1, 3]) {
            const zoomCss = 1.0;
            const renderedDevicePx = 10 * zoomCss * dpr; // 10 m ship radius
            const inCssPx = deviceToScreen(renderedDevicePx, dpr);
            expect(inCssPx).toBeCloseTo(10, 9);
        }
    });
});

describe("P05-T01 camera interpolation vs physics", () => {
    it("camera chases the ship exponentially without moving it", () => {
        const ship = { x: 50_000, y: -30_000 };
        let cam: CameraTarget = { centerX: 0, centerY: 0, followRate: 5 };
        for (let i = 0; i < 200; i++) {
            cam = chaseCamera(cam, ship.x, ship.y, 0.016);
        }
        // after ~3.2 s at rate 5 the residue is e^-16 ≈ 0
        expect(Math.abs(cam.centerX - ship.x)).toBeLessThan(1);
        expect(Math.abs(cam.centerY - ship.y)).toBeLessThan(1);
        // the ship itself never moved
        expect(ship.x).toBe(50_000);
        expect(ship.y).toBe(-30_000);
    });

    it("chase is frame-rate independent: equal simulated time converges equally", () => {
        const ship = { x: 10_000, y: 5_000 };
        let a: CameraTarget = { centerX: 0, centerY: 0, followRate: 3 };
        let b: CameraTarget = { centerX: 0, centerY: 0, followRate: 3 };
        for (let i = 0; i < 100; i++) a = chaseCamera(a, ship.x, ship.y, 0.016); // 1.6 s
        for (let i = 0; i < 48; i++) b = chaseCamera(b, ship.x, ship.y, 0.0333); // ~1.6 s
        expect(Math.abs(a.centerX - b.centerX)).toBeLessThan(10);
        expect(Math.abs(a.centerY - b.centerY)).toBeLessThan(10);
    });

    it("rotation is never applied: screen axes stay aligned with world axes", () => {
        // world +x renders to screen +x (right); world +y to screen +y (down).
        const center = worldToScreen(10, 5, 800, 600, 1, 10, 5);
        const east = worldToScreen(15, 5, 800, 600, 1, 10, 5);
        const south = worldToScreen(10, 10, 800, 600, 1, 10, 5);
        expect(center.x).toBe(400);
        expect(center.y).toBe(300);
        expect(east.x - center.x).toBe(5);
        expect(east.y - center.y).toBe(0);
        expect(south.x - center.x).toBe(0);
        expect(south.y - center.y).toBe(5);
    });
});
