# P05-T03 — Parallax depth layers — Completion Report

**Date:** 2026-11-07 · **Status:** VERIFIED

## What was implemented

Three depth layers, drawn inside `Spaaaace` (MainActivity15):

1. **Far starfield** — 140 deterministic dots (seed 123456789 via XorWow),
   `STARFIELD_PARALLAX_PX_PER_M = 0.08` px/m of camera travel. Responds to
   translation only, never to zoom (like a real distant sky). Wrapped in
   512 px tiles, drawn under the world grid before any world content.
2. **World plane** (unchanged) — grid, orbits, gravity rings, star, planets,
   ship and sparks — already the 1.0 px/m plane everything is relative to.
3. **Foreground dust** — 36 fainter dots, `DUST_PARALLAX_PX_PER_M = 1.3`
   px/m (hyper-parallax: drifts faster than the world, reads as nearby
   medium). Same tile/wrap machinery.

Parallax math lives in `src/camera/Camera.ts` (`wrapTile`,
`parallaxOffsetPx`, layer rate constants) — render code consumes it;
nothing about the simulation changed.

## Design decisions
- Parallax is **device-px based with the dpr multiplier**, so 2.5K phones
  get the same apparent density as desktops (consistent with the high-DPI
  camera fix).
- The reference grid stays (Phase 02 reference identity); its removal is a
  later art-direction call (user noted it may go), not a camera-phase one.
  Layers now sit *under* it, so depth is legible without touching parity.
- Dot sizes scale by dpr only; dot count is fixed (no per-frame allocation).

## Tests — `tests/camera-parallax.test.ts` (8)
Tile wrap topology and phase-locking; far layer slower than the world plane
(800 vs 10 000 px per 10 km); dust faster than world (13 000); dpr ratio in
the shift; sign matches world motion; seeded starfield determinism; tile
bounds.

## Player test
- Rest + high-speed flight (VEL 4609): starfield/dust visible with grid,
  ship readable, joystick + telemetry legible; VEL cap reached without
  camera jumps; **0 console errors**. Screenshots t03-rest / t03-flight.

## Verification
- `npm test`: **78/78**. `npm run build`: clean.

## Evidence
- EVIDENCE/PHASE_05/P05-T03/t03-rest.png, t03-flight.png
