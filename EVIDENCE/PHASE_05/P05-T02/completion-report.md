# P05-T02 — Follow, zoom and framing — Completion Report

**Date:** 2026-11-07 · **Status:** VERIFIED

## What was implemented

### Extracted zoom curve (no behavior change)
`velocityZoomFactor(speed, near, far, ref, max)` moved from the Spaaaace
closure into `src/camera/Camera.ts`; MainActivity15 imports it. Curve
contract pinned by tests: 0→0.7, REF→1.0 exactly, LIMIT→1.7, monotone,
kink-free at the junction (Δ<0.005 over ±0.5 m/s), clamped outside range.

### Smoothed follow (the actual fix)
The camera offset now chases the ship via `chaseCamera` (exponential,
frame-rate independent, `CAMERA_FOLLOW_RATE = 30`) instead of snapping to
`follow.pos` every frame. Why:
- Instant follow rendered discrete physics steps as visible jumps at low
  frame rates (250 m/step at 20 fps → up to ~105 px on-screen jumps).
- The chase eliminates the jumps; steady-state lag is `v/k` = 167 m at
  max speed → **≤70 px** at zoom-out 0.42 px/m, ~0 at rest.
- First frame snaps the chase to the ship (no swoop on load); dt=0 frames
  are no-ops (pause safe).

### Zoom bounds already in place, kept
expSmooth rate 2.5 on zoom, clamped to [MIN_CAMERA_ZOOM, MAX_CAMERA_ZOOM]
(positive-range guard prevents grid-loop freeze), CAMERA_DISTANCE=1.4.

### Tests — `tests/camera-follow.test.ts` (9)
Curve endpoints/monotonicity/junction-smoothness/clamping/framing factor;
lag bound ≤200 m (≤90 px at max zoom-out), convergence at rest, dt=0 no-op,
60 s outlier snaps without NaN.

## Player test
- Full thrust with chase follow: steady flight at high speed (VEL 4629),
  no visible jitter, ship centered, readable (t02-follow-fast).
- Autopilot close-pass approach (`#debug=1` button): `THR: 100% VEL: 4971`
  chasing; no camera jumps or orientation loss (t02-autopilot).
- **0 console errors.**

## Verification
- `npm test`: **70/70**. `npm run build`: clean.

## Evidence
- EVIDENCE/PHASE_05/P05-T02/t02-follow-fast.png, t02-autopilot.png
