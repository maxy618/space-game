# P06-T02 — Multi-layer render graph — Completion Report

**Date:** 2026-11-07 · **Status:** VERIFIED

## What was produced

`src/camera/Layers.ts` — the explicit render graph:

| # | Layer | Space | Alpha | Owner |
|---|---|---|---|---|
| 0 | backdrop (void fill) | screen | 1.00 | MainActivity15.Spaaaace |
| 1 | far starfield | screen | 0.85 | MainActivity15.Spaaaace |
| 2 | world grid | world | 1.00 | MainActivity15.Spaaaace |
| 3 | celestial (orbits, rings, stars, planets) | world | 1.00 | render/VisibleUniverse15 |
| 4 | entities (sparks, ship, exhaust, track) | world | 1.00 | render/VisibleUniverse15 |
| 5 | foreground dust | screen | 0.16 | MainActivity15.Spaaaace |
| 6 | UI (telemetry/pause/joystick) | screen | 1.00 | main.ts + input/FlightStick |

- Draw order is a single fixed array (`layerOrder()`); new families insert a
  row + a draw section — order is never implicit.
- `validateGraph()` enforces: unique ids, alphas in [0,1], UI last + opaque.
- The live `Spaaaace` draw sequence matches this table exactly (layers 0–5
  in canvas, layer 6 in DOM).
- Future systems slot in cleanly: local terrain (world, between celestial and
  entities), haze/clouds (screen, above world below UI), postFX (after 5).

## Tests — `tests/render-graph.test.ts` (5)
Order equality, graph validity, lookup owners/spaces, non-empty names/owners,
alpha budgets (UI/backdrop opaque, foreground ≤0.2, far ≤0.9).

## Player test
- Full thrust route (VEL 1218 mid-run): all layers visible in documented
  order with correct apparent depth; 0 console errors.
- Screenshot `t02-layers.png`.

## Verification
- `npm test`: **89/89**. `npm run build`: clean.

## Evidence
- EVIDENCE/PHASE_06/P06-T02/t02-layers.png
