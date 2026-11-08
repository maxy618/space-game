# P08-T04 — Contextual full-screen profiles — Completion Report

**Date:** 2026-11-09 · **Status:** VERIFIED

## Profiles (all with blend-in/out + exact-zero exit)
| Profile | Trigger | Shader effect | Exit |
|---|---|---|---|
| warp | speed > boost cap | barrel + CA | speed drops (fisheye curve) |
| blackHole | BH within 8× shadow | lensing deflection | fly away (strength→0) |
| starHeat | starProximity > 0 | glare wash + shimmer | leave corona |
| nebula | inside nebula blob | subtle tint (param wired, gain safe) | leave blob |
| impact | flash/shake params (decay to 0) | flash + shake | decay (300 steps → exact 0, test-pinned) |

- Warp/blackHole/starHeat are live in `MainActivity15` (params from sim:
  `fisheyeSmooth`, BH screen UV + distance, `starProximity`).
- No permanent filter stack: at rest (no triggers) the composite is
  rolloff+vignette only — screen restores exactly (tier-low A/B proves it).
- Reduced motion zeroes distortion/shimmer/shake (static vignette remains).

## Evidence
- Rest frame dark-exact: EVIDENCE/batch6/63_low_rolloff.png
- Warp/heat/BH routes in P08-T03 evidence.
