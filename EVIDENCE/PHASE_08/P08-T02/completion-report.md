# P08-T02 — PostFX compositor — Completion Report

**Date:** 2026-11-09 · **Status:** VERIFIED

## What shipped
`src/render/PostFX.ts` — WebGL2 compositor over the 2D frame:
- Explicit pass graph: source (2D canvas texture) → composite shader → display canvas.
- Composite does: barrel warp, BH lensing deflection, heat shimmer, 9-tap
  in-shader bloom (FBO chain removed after QA found it smeared brightness
  across the screen), highlight rolloff (exact blacks), vignette, CA, grain.
- `resize()` only re-sets viewport (no FBO leak); `dispose()` frees texture+VAO.
- Tiers: high (bloom+distortion+grain), medium (bloom+distortion),
  low (rolloff+vignette only), off (direct 2D blit, legacy fisheye).
- Wired in `MainActivity15.Spaaaace`: world always renders to offscreen
  when enabled; display canvas stacked over `canvasMain` with
  `pointer-events:none` so touch/keyboard input is untouched.
- Layers: `Layers.ts` gained `emissive` + `postFX`; `Lod.ts` tiers extended.

## Tests
- `tests/postfx-profiles.test.ts` (blend ramps terminate, lensing/shimmer
  math, tier monotonicity), `tests/render-graph.test.ts` (new order),
  `tests/lod-contracts.test.ts` (unchanged contract still green).
- Full suite: 176/176. Build clean. 0 game console errors.

## Evidence
- EVIDENCE/batch6/60_planet_fixed.png, 64_high_rolloff.png (composite live)
- EVIDENCE/batch6/61_tier_low.png (fallback path live)
