# P08-T05 — Performance + visual validation — Completion Report

**Date:** 2026-11-09 · **Status:** VERIFIED

## Profiled
- Desktop (Playwright, seed 42): 2D 129 fps → composite 115–137 fps.
- Upload cost is per-frame `texImage2D(canvas)`; measured steady-state
  overhead ~11%, acceptable.
- Tiers: high (desktop default), medium (DPR>2.4), low (fallback),
  off (2D direct). Each tier tested live: high (64_high_rolloff.png),
  low (63_low_rolloff.png), off (46_star_nopostfx.png).
- Reduced motion: distortion/shimmer/shake/grain gated (shader `uReduced`);
  DOM pulses already gated. Verified by code + tier-low equivalence.
- Resize: `PostFXCompositor.resize()` re-sets viewport only (no FBOs, no
  leak); `dispose()` frees texture/VAO. Canvas resize observer in `main.ts`
  drives it (existing path).
- No unsupported Android claim: mobile numbers are *not* claimed (R-003);
  medium tier + DPR gate is the documented fallback.

## Artifacts fixed during validation
1. FBO bloom chain smeared brightness → replaced by 9-tap in-shader bloom.
2. ACES tripled the blacks → replaced by exact-black highlight rolloff.
3. Corona linear gradients washed the screen → exponential falloff stops.

## Full gate
- Tests 176/176, build clean, 0 game console errors.
- P06/P07 re-audit notes: `docs/RESEARCH_PHASE_06_07_08.md` §1 (spawn-in-
  void recorded as R-006, out of 06–08 scope but documented).
