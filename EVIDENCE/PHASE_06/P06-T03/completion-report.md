# P06-T03 — LOD and material contracts — Completion Report

**Date:** 2026-11-07 · **Status:** VERIFIED

## What was produced

`src/camera/Lod.ts` — LOD + material contracts:

- **Size bands** (projected CSS px diameter): macro <8, regional 8–64,
  fine 64–480, micro ≥480. Selection is by projected size, never by world
  zoom — the same planet renders correctly at phone size and at 4× crop.
- **Budgets**: textures ≤512 px per family tile; ≤4 path layers at fine LOD;
  ≤200 parallax dots; shader policy documented (2D canvas only today;
  highp/mediump fallback when Phase 08 adds shaders).
- **Resolution policy**: all screen art drawn in device px via zoom·dpr, so
  high-DPI phones show proportionally more detail.
- **Quality tiers** (high/medium/low) as a monotone degradation contract;
  the actual tier switch lands in P25-T02, but the contract exists now.

## Tests — `tests/lod-contracts.test.ts` (6)
Band partition without gaps; ship-at-phone-size = regional (silhouette
carried); macro/fine/micro spot checks; exhaustive partition check over
0–2000 px; budget sanity; tier monotonicity.

## Player test
Regression route (rest + flight): no pops or LOD flicker during the
velocity-zoom sweep (view transitions cross bands smoothly under the
exp-smoothed zoom); 0 console errors.

## Verification
- `npm test`: **95/95**. `npm run build`: clean.

## Evidence
- EVIDENCE/PHASE_06/P06-T03/completion-report.md (this file)
