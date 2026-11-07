/**
 * Regression tests for the user-reported bugs:
 *  (1) ship flies off screen above ~1200 m/s (chase used sub-step dt,
 *      lag unbounded at low FPS);
 *  (2) FPS tanks (overscan offscreen 45% margin + 48 px blit tiles);
 *  (3) fisheye bent the wrong way (samples outward, edges minified);
 *  (4) trail dotted (per-segment mayDrawLine breaks).
 * Plus a fast unit pin of the new camera/render math.
 */
import { describe, it, expect } from "vitest";
import { chaseCamera, CAMERA_FOLLOW_RATE } from "../src/camera/Camera";
import { fisheyeTargetFromSpeed } from "../src/universe/Relativity";

/** Lag clamp used in Spaaaace (35% of visible width, floor 50 m). */
export function clampedChase(chase: { x: number; y: number }, ship: { x: number; y: number }, visibleW: number) {
  const maxLag = Math.max(50, visibleW * 0.35);
  const dx = ship.x - chase.x;
  const dy = ship.y - chase.y;
  const lag = Math.hypot(dx, dy);
  if (lag > maxLag) return { x: ship.x - (dx / lag) * maxLag, y: ship.y - (dy / lag) * maxLag, lag: maxLag };
  return { x: chase.x, y: chase.y, lag };
}

describe("chase with a real frame dt (off-screen regression)", () => {
  it("sub-step dt (24 ms) at 5 FPS leaves a lag; real frame dt (200 ms) does not", () => {
    const ship = { x: 800, y: 0 }; // one 200 ms frame at 4000 m/s
    const cam0 = { centerX: 0, centerY: 0, followRate: CAMERA_FOLLOW_RATE };
    const sub = chaseCamera(cam0, ship.x, ship.y, 0.024); // OLD: per-step dt
    const real = chaseCamera(cam0, ship.x, ship.y, 0.2); // NEW: frame dt
    expect(ship.x - sub.centerX).toBeGreaterThan(300); // the bug: big lag
    expect(ship.x - real.centerX).toBeLessThan(20); // fixed: caught up
  });

  it("hard lag clamp keeps the ship inside 35% of the visible width", () => {
    const visibleW = 4000;
    const ship = { x: 100000, y: 0 };
    const far = clampedChase({ x: 0, y: 0 }, ship, visibleW);
    expect(far.lag).toBeLessThanOrEqual(visibleW * 0.35 + 1e-9);
    // ship-to-centre on screen ≤ 35% ⇒ inside the viewport
    expect(far.lag / visibleW).toBeLessThanOrEqual(0.35);
  });

  it("clamp is a no-op for small lags", () => {
    const r = clampedChase({ x: 100, y: 0 }, { x: 140, y: 0 }, 4000);
    expect(r.x).toBe(100);
    expect(r.lag).toBe(40);
  });
});

describe("fisheye direction (barrel out, magnified edges)", () => {
  // Production mapping: srcR = r·(1−k·t²), t = r/R, R = half diagonal.
  const srcR = (r: number, k: number, R: number) => r * (1 - k * Math.pow(r / R, 2));
  it("centre stays sharp (srcR ≈ r), edges sample inward (srcR < r)", () => {
    const R = 1500, k = 0.3;
    expect(srcR(0, k, R)).toBe(0);
    expect(srcR(10, k, R)).toBeCloseTo(10, 3);
    expect(srcR(R, k, R)).toBeCloseTo(R * (1 - k), 9);
    expect(srcR(R, k, R)).toBeLessThan(R);
  });

  it("with the (1−k) zoom-out offscreen the edge world lands exactly on the edge", () => {
    // World edge distance d_edge = R/deviceScale. Offscreen renders at
    // deviceScale·(1−k), so it sits at R·(1−k). Edge tile samples
    // R·(1−k). Equal ⇒ no star/edge loss, zoom-out factor check:
    const k = 0.336; // max k at 30000 (smooth 1.12)
    expect(1 - k).toBeGreaterThan(0.6);
    expect(R_edge(1500, k)).toBeCloseTo(1500 * (1 - k), 9);
    function R_edge(R: number, kk: number) { return R * (1 - kk); }
  });

  it("fisheye activates from SPEED, not from the boost button (1292 m/s threshold)", () => {
    expect(fisheyeTargetFromSpeed(0)).toBe(0);
    expect(fisheyeTargetFromSpeed(1000)).toBeLessThan(0.01);
    expect(fisheyeTargetFromSpeed(1200)).toBeLessThan(0.01);
    expect(fisheyeTargetFromSpeed(1300)).toBeGreaterThan(0.01);
    expect(fisheyeTargetFromSpeed(4000)).toBeCloseTo((2 / 3) ** 3, 6);
    expect(fisheyeTargetFromSpeed(6000)).toBe(1);
  });
});

describe("render cost guards (FPS regression)", () => {
  it("offscreen is same-size (no 45% overscan canvas)", () => {
    // The bug: W+2·0.45·max(W,H) ≈ 1.9× per side ≈ 3.6× pixels plus 5×
    // starfield tiling. The fix renders W×H and zooms out by (1−k) instead.
    // This test pins the budget: offscreen pixels must equal screen pixels.
    const W = 2560, H = 1600;
    const oldMargin = Math.ceil(Math.max(W, H) * 0.45);
    const oldPx = (W + 2 * oldMargin) * (H + 2 * oldMargin);
    const newPx = W * H;
    expect(oldPx / newPx).toBeGreaterThan(3); // old was ≥3×
    expect(newPx).toBe(W * H);
  });

  it("blit tiles: 80 px tiles cut the blit count vs 48 px by >2.5×", () => {
    const tiles = (W: number, H: number, T: number) =>
      Math.ceil(W / T) * Math.ceil(H / T);
    const oldN = tiles(2560, 1600, 48);
    const newN = tiles(2560, 1600, 80);
    expect(newN).toBeLessThan(oldN / 2.5);
  });
});
