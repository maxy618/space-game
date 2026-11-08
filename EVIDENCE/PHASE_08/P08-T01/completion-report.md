# P08-T01 — Technique research + proof — Completion Report

**Date:** 2026-11-09 · **Status:** VERIFIED

## Research
`docs/RESEARCH_PHASE_06_07_08.md` (§0–§9): renderer constraint (Canvas2D, no
HW-RT), FBM/nebula, stellar physics (limb darkening, granulation, exponential
corona), planet atmosphere (rim/terminator), BH (screen-space vs geodesic,
rejected with reason), PostFX design + tiers + reduced motion. Every claim
carries URL + confidence + uncertainty.

## Proof measurements (Playwright, seed 42, desktop test machine)
| Route | FPS |
|---|---|
| 2D only (`#postfx=off`) | 129 |
| WebGL composite high tier | 115–137 (variance run-to-run) |
| Composite cost | ~11% |
| Console errors (game) | 0 (only Vite HMR WS warnings, dev-only) |

Decision: composite ships as **default** (high tier desktop, medium on
DPR>2.4 mobile), `#postfx=off` / `#tier=low` fallback preserved.

## Evidence
- EVIDENCE/batch6/59_nobloom.png vs 64_high_rolloff.png (bloom A/B)
- EVIDENCE/batch6/62_low_aces.png vs 63_low_rolloff.png (tonemap A/B — ACES
  tripled the blacks, replaced by exact-black rolloff)
- FPS numbers above.
