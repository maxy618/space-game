# P09-gap closure — R-006 spawn/BH + P08 profiles wired (2026-11-09)

**Status fix:** closes the Done-only-when gaps flagged after the Phase 08
breakthrough: BH never seen, star close-up missing, nebula/impact profiles
unwired, spawn-in-void.

## What changed
1. **Spawn in orbit (R-006)**: ship spawns on the innermost planet's orbit
   track, 6 km ahead of it, with the planet's exact circular velocity —
   stable drift (impact=null, dist 6029 m stable over 3 s), no void spawn.
   Landmark was "random orbit 16–150 km + 0 velocity".
2. **Horizon cues**: star off-screen glare at the screen edge + nearest-
   planet edge diamond (EVIDENCE/batch6/78_spawn_cues.png) — first screen
   is navigable without teleporting.
3. **BH inside the system**: (180000,−140000) @ dist 228 km → (110000,−85000)
   @ 139 km (<200 km). Radar marker (always), tappable route node (id −777),
   info card, arrival = full stop. Close-up (82_bh_close.png): shadow +
   photon ring + Doppler disc + jets + lensing params live.
4. **Nebula profile wired**: `nebulaAt()` → PostFX `nebula+tint` params
   (85_nebula.png deep inside a sheet, profile active).
5. **Impact profile wired**: landing/discovery triggers flash+shake,
   exponential decay to exact 0 (tested in postfx-profiles).
6. **Comets (P07-T03 gap)**: two deterministic elliptical comets with coma
   + anti-sun tail (84_comet_close.png — breakthrough shot).

## Tests
- 178/178 (new `tests/bh-nebula.test.ts`: BH in range, nebulaAt bounds).
- Build clean. Live Pages smoke 0 game console errors.

## Honest remainders
- Star *disc* large-arc close-up remains view-width limited (450 m view vs
  15.5 km disc + kill zone); best evidence is limb + corona + scan-zoom
  (81_star_hold.png). A wider cinematic view is a future camera mission.
- Comet orbits are clock-driven visuals (no sim body), stated in code.
