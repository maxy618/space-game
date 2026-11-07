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

/**
 * Velocity-driven zoom factor (visible-space multiplier), extracted from
 * MainActivity15's Spaaaace camera (P04-T01/P05-T02). Pure: the same speed
 * always maps to the same factor.
 *
 * One smooth curve, no kinks: both halves flatten at the junction
 * (speed == refSpeed), so the zoom glides instead of stepping through two
 * stages.
 *
 *  - speed = 0            → nearFactor (closer)
 *  - speed = refSpeed     → 1.0 exactly (the original reference view)
 *  - speed = maxSpeed     → farFactor (farther)
 */
export function velocityZoomFactor(
    speed: number,
    nearFactor: number,
    farFactor: number,
    refSpeed: number,
    maxSpeed: number,
): number {
    let factor: number;
    if (speed <= refSpeed) {
        const x = clamp(speed / refSpeed, 0, 1);
        factor = 1 - (1 - nearFactor) * (1 - x) * (1 - x);
    } else {
        const t = clamp((speed - refSpeed) / (maxSpeed - refSpeed), 0, 1);
        factor = 1 + (farFactor - 1) * t * t;
    }
    return factor;
}

/**
 * Speed-driven fisheye strength (user 2026-11-08), normalized 0..1.
 *
 * Zero at or below the boost cap (normal flight and boost cruise look
 * exactly as before); above it the warp grows with logarithmically
 * diminishing increments and stays subtle — only slightly stronger even
 * at 30 000. The caller applies the same radial barrel mapping as before
 * (center = farthest point, unchanged).
 *
 * @param speed    ship speed (total velocity, px/s)
 * @param boostCap the speed where the warp starts (6000)
 */
export function fisheyeTargetForSpeed(speed: number, boostCap: number): number {
    if (speed <= boostCap) return 0;
    // log5 curve: 6000 → 0, 12 000 → 0.43, 30 000 → 1 (diminishing increments)
    const t = clamp(Math.log(speed / boostCap) / Math.log(5), 0, 1);
    return 0.6 * t;
}

/** Smooth follow rate (per second) used by the ship-chase camera. */
export const CAMERA_FOLLOW_RATE = 30;

/** Worst-case steady-state chase lag in meters at vmax (v / rate). */
export function chaseLagMeters(speed: number): number {
    return speed / CAMERA_FOLLOW_RATE;
}

/**
 * Totally distant parallax layer: device-px shift per meter of camera
 * travel. Independent of camera zoom by design — like a real starfield at
 * infinity, it only responds to camera translation, never to zoom.
 */
export const STARFIELD_PARALLAX_PX_PER_M = 0.08;

/** Foreground dust: moves faster than the world plane (hyper-parallax). */
export const DUST_PARALLAX_PX_PER_M = 1.3;

/** Event-driven camera feedback (decay kick). */
export interface CameraKick {
    x: number; // meters offset
    y: number;
}

/**
 * Exponential kick decay; snaps to exact zero below 0.5 m (no eternal
 * sub-pixel drift, clean termination guaranteed).
 */
export function decayKick(kick: CameraKick, dt: number, rate: number): CameraKick {
    const k = Math.exp(-rate * dt);
    const x = kick.x * k;
    const y = kick.y * k;
    const zero = Math.abs(x) < 0.5 && Math.abs(y) < 0.5;
    return { x: zero ? 0 : x, y: zero ? 0 : y };
}

/** Convert a desired screen-px kick into meters at the current zoom. */
export function kickMetersForScreenPx(targetPx: number, zoomPxPerM: number): number {
    return targetPx / zoomPxPerM;
}

/** Wrap a screen-space coordinate into a repeating tile (topology-safe). */
export function wrapTile(v: number, tile: number): number {
    return ((v % tile) + tile) % tile;
}

/**
 * Device-px offset for a parallax layer at the given camera position.
 * Two tiles of stars with the same seed stay phase-locked forever.
 */
export function parallaxOffsetPx(cameraMeters: number, dpr: number, pxPerM: number): number {
    return cameraMeters * pxPerM * dpr;
}
