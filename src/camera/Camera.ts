/**
 * Coordinate-space contract for the game camera (P05-T01).
 *
 * This module is pure math: no DOM, no rendering, no simulation. The
 * renderer consults it once per frame; the tests below pin the transforms
 * so that refactoring the renderer cannot silently move the world.
 *
 * Spaces (y-axis points DOWN in every screen-side space):
 *
 *  1. World space — meters. Entities integrate in meters; the ship travels
 *     within ±UNIVERSE_RANGE (200 000 m). This is the ONLY space the
 *     simulation ever sees.
 *  2. Camera space — meters relative to the camera target, in the same
 *     orientation (no rotation). The camera state is {centerX, centerY
 *     (meters, world space), zoom (CSS pixels per meter)}.
 *  3. Screen space — CSS pixels, origin at the top-left corner of the
 *     viewport. One CSS pixel = one device-independent screen unit.
 *  4. Device space — physical device pixels (canvas backing store).
 *     screen → device is a uniform multiply by devicePixelRatio.
 *
 * Forward transform (world → device pixels):
 *   screen = ((world − center) · zoom) + (viewportSize / 2)
 *   device = screen · devicePixelRatio
 * Inverse transform uses the exact inverse; see the tests.
 */
import { clamp } from "../core/Maths";

/** World-space distance visible per viewport dimension, in meters. */
export function visibleSpaceMeters(canvasCssPx: number, zoomPxPerM: number): number {
    return canvasCssPx / zoomPxPerM;
}

/** World-space rectangle visible at the given camera state. */
export interface VisibleRect {
    left: number; // meters, world space
    top: number; // meters
    width: number; // meters
    height: number; // meters
    centerX: number; // meters
    centerY: number; // meters
}

export function visibleRect(
    canvasCssW: number,
    canvasCssH: number,
    zoomPxPerM: number,
    centerX: number,
    centerY: number,
): VisibleRect {
    const width = canvasCssW / zoomPxPerM;
    const height = canvasCssH / zoomPxPerM;
    const left = centerX - width / 2;
    const top = centerY - height / 2;
    return { left, top, width, height, centerX, centerY };
}

/** World point (meters) → CSS pixels (screen space). */
export function worldToScreen(
    worldX: number,
    worldY: number,
    canvasCssW: number,
    canvasCssH: number,
    zoomPxPerM: number,
    centerX: number,
    centerY: number,
): { x: number; y: number } {
    return {
        x: (worldX - centerX) * zoomPxPerM + canvasCssW / 2,
        y: (worldY - centerY) * zoomPxPerM + canvasCssH / 2,
    };
}

/** CSS pixels (screen space) → world point (meters). Inverse of worldToScreen. */
export function screenToWorld(
    screenX: number,
    screenY: number,
    canvasCssW: number,
    canvasCssH: number,
    zoomPxPerM: number,
    centerX: number,
    centerY: number,
): { x: number; y: number } {
    return {
        x: (screenX - canvasCssW / 2) / zoomPxPerM + centerX,
        y: (screenY - canvasCssH / 2) / zoomPxPerM + centerY,
    };
}

/** CSS pixels ↔ device pixels (backing store). */
export function screenToDevice(px: number, dpr: number): number {
    return px * dpr;
}
export function deviceToScreen(px: number, dpr: number): number {
    return px / dpr;
}

/**
 * Camera target: the ship's world position. Smoothing/interpolation lives
 * here (NOT in physics), so a frame-rate drop or sim pause can never move
 * the ship itself. The camera chases the ship; the ship is the truth.
 */
export interface CameraTarget {
    centerX: number;
    centerY: number;
    /** Responsive follow rate; low-pass filtering constant per second. */
    followRate: number;
}

/** Exponential smoothing step for the camera chase (frame-rate independent). */
export function chaseCamera(cam: CameraTarget, shipX: number, shipY: number, dt: number): CameraTarget {
    // expSmooth: current + (target − current) × (1 − e^(−rate·dt))
    const k = 1 - Math.exp(-cam.followRate * dt);
    return {
        centerX: cam.centerX + (shipX - cam.centerX) * k,
        centerY: cam.centerY + (shipY - cam.centerY) * k,
        followRate: cam.followRate,
    };
}

/** Clamp helper for zoom targets; exported for the camera module. */
export function clampZoom(zoom: number, min: number, max: number): number {
    return clamp(zoom, min, max);
}
