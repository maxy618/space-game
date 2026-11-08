# P08-T03 — Optics and light cues — Completion Report

**Date:** 2026-11-09 · **Status:** VERIFIED

## What shipped
- **Black-hole lensing (screen-space):** UV deflection toward the hole,
  `offset ∝ rShadow²/dist²` clamped 0.4, plus 2D accretion disc with
  Doppler ramp + photon rim + jets (`VisibleUniverse15.drawBlackHoleMark`).
  Labelled approximation everywhere (no “ray tracing”/“true lensing” claims).
- **Warp distortion:** radial barrel tied to `fisheyeTargetForSpeed`
  (speed>cap) + radial CA. Replaces the old 2D tile fisheye when enabled.
- **Heat shimmer + glare:** radial mask from the star UV, amplitude gated
  by `starProximity`, disabled under reduced motion.
- **Light cues in 2D:** star corona exponential gradients (bloom source),
  planet atmosphere rim + terminator, BH halo. All bounded & localized.

## Played
- Planet close-up with bloom (EVIDENCE/batch6/64_high_rolloff.png)
- Star corona near-field (EVIDENCE/batch6/67_star_corona.png)
- BH landmark approach (EVIDENCE/batch6/72_bh_limb.png — void-edge aware)

## Tests / QA
- Lens/shimmer math pinned in `tests/postfx-profiles.test.ts`.
- 0 errors. FPS: composite −11% vs 2D.
