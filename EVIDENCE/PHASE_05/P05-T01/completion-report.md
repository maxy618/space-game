# P05-T01 — Coordinate spaces — Completion Report

**Date:** 2026-11-07 · **Status:** VERIFIED

## What was implemented

### New module — `src/camera/Camera.ts` (pure math, DOM-free, sim-free)
Documents and implements the four-space contract used by the renderer:

1. **World** — meters, the only space the simulation sees (y-down camera).
2. **Camera** — meters relative to the camera target, same orientation.
3. **Screen** — CSS pixels, viewport origin top-left.
4. **Device** — physical backing-store pixels (×devicePixelRatio).

Functions: `visibleSpaceMeters`, `visibleRect`, `worldToScreen`,
`screenToWorld` (exact inverse), `screenToDevice`/`deviceToScreen`,
`chaseCamera` (exponential follow — interpolation physically separate from
the ship) and a zoom clamp helper.

### Why this matters (follow-up risk from T01 map)
Before this module the world→screen math existed only inline in the
`Spaaaace` closure of MainActivity15. The contract is now pinned by tests,
so future renderer rewrites (PixiJS in Phase 06) can replace drawing code
without moving the world.

### Tests — `tests/camera-coordinates.test.ts` (10, all passing)
- round-trip world↔screen at rest zoom with a real ship position from a live run
- ship at center → viewport center; inverse-zoom scaling; visibleSpaceMeters arithmetic; visibleRect centering
- device/screen round-trips for dpr 1/1.5/2/3 (2.5K phone); meter size is dpr-independent in CSS px
- camera chase converges onto the ship; chase is frame-rate independent (16 vs 33 ms steps equal time → equal result); screen axes are never rotated

## Player test
- Camera regression route (thrust to VEL 979 with velocity zoom-out active):
  no jumps, no orientation loss, 0 console errors. Screenshot t01-hispeed.

## Verification
- `npm test`: **61/61** (51 before + 10 camera). `npm run build`: clean.

## Evidence
- EVIDENCE/PHASE_05/P05-T01/t01-hispeed.png
