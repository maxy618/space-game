# Relativistic dynamics, heating, fisheye and visual fixes

**Mission:** `MISSIONS/temp_mission.txt` (executed 2026-11-08).
**Status:** implemented, 135/135 vitest green, `tsc+vite` build green.

## Units (verified, not assumed)

Positions meters, `dt` seconds, velocity m/s, mass arbitrary game units,
`GRAVITATION = 1e-2`. Ship `mass = 10` is now `spec.restMass = 10` (same
number). Thrust `MAIN_ENGINE_ACCEL = 1000 m/s²`, engine limits 4000/6000 —
all unchanged. Tests isolate gravity by zeroing source mass (ship tests).

## Research sources (retrieved 2026-11-08)

- OpenStax University Physics Vol 3 §5.8 *Relativistic Momentum* —
  https://openstax.org/books/university-physics-volume-3/pages/5-8-relativistic-momentum
  Claims used: `p = γ·m0·v`, `γ = 1/√(1−u²/c²)`, momentum →∞ as u→c,
  classical equals relativistic at low speed.
- LibreTexts Physics 27.3 *Relativistic Quantities* —
  https://phys.libretexts.org/Bookshelves/University_Physics/Physics_(Boundless)/27%3A__Special_Relativity/27.3%3A_Relativistic_Quantities
  Claims used: `F = dp/dt` with `p = γ·m0·v` is Lorentz-invariant; rest mass
  invariant (no "mass increases with velocity" bookkeeping — code keeps
  `restMass` constant).
- Wikipedia *Lorentz factor* — https://en.wikipedia.org/wiki/Lorentz_factor
  Claims used: `γ = √(1 + (p/m0c)²)` (momentum form) and the stable inverse
  `v = C·p/√((m0C)² + p²)`.

**Model honesty:** Special Relativity for the spacecraft + Newtonian
gravity `a = G_eff·M/d²` as the force. This is NOT general relativity;
no spacetime curvature, no GR precession. Near the star GR matters in
reality; the game documents it as an artistic approximation.

## C_GAME = 60 000 (chosen, not arbitrary)

| C | γ(4000) | γ(6000) | γ(30000) | verdict |
|---|---|---|---|---|
| 20 000 | 1.0206 | 1.0483 | 1.80 | too visible at cruise |
| 40 000 | 1.0050 | 1.0114 | 1.25 | borderline |
| **60 000** | **1.0022** | **1.0050** | **1.155** | **<0.5% at boost; gradual; noticeable >20k** |
| 100 000 | 1.0008 | 1.0018 | 1.06 | invisible until >30k |

4000/6000 were not moved. `tests/relativity.test.ts` pins γ values,
round-trip `v↔p`, `v < C` for impulses to 1e20, and shrinking Δv near C.

## What changed (and what did not)

- **Gravity** (`Universe.updateAll`): was `Δv = dt·G·M_ship·M/d²`
  (dimensional error: acceleration ∝ ship mass). Now
  `a = G_eff·M/d²` with `G_eff = G·10 = 0.1` — the exact well strength the
  old code produced for the default ship, now ship-mass-independent.
  `GRAVITATION` itself is untouched. Gravity is also no longer switched off
  inside the star surface (softened at `max(d, R)`); the 2 s MECO grace is
  kept. Asteroid gravity was aligned to the same `G_eff`.
- **Engine** (`Spacecraft.update` + `Universe15`): the hard clamp
  (snap-to-limit + boost brake-drag) is gone. `applyEngineThrust` splits
  thrust into longitudinal/transverse in momentum space: above the limit,
  speed-increasing longitudinal thrust is dropped, braking and transverse
  steering work; below the limit it lands exactly at the limit. Gravity
  (outside the limiter) is never truncated, so slingshots exceed 4000/6000
  up to `C_GAME`. Disabling boost never changes velocity.
- **Fisheye**: `setBoostEngaged` is now a no-op; the warp follows actual
  speed via `fisheyeTargetFromSpeed` (0 at rest, 1 at 6000, →1.12 at high
  speed, 1.114 at 30000). The offscreen is overscanned (margin 45% of the
  long side) and the mapping samples outward (`srcR = r/(1−k·t²)`), which
  is the fix for star/bodies disappearing at the edges. Centre stays sharp.
- **Heating/destruction** (`Universe.heatingStep` + `updateAll`): danger
  inside 2×R, quadratic heat-up (0 at 2R → 0.25/s at R, ×spec scale),
  cooling 0.10/s outside, destroy on heat ≥ max **or** crossing inside 1×R.
  Destruction = flash + 40 generic sparks (model-independent), 1.5 s, then
  respawn at the initial spawn point with world data preserved. Telemetry
  shows `HEAT: %` + `CORONA DANGER`; ship gets an orange halo ∝ heat.
- **Ship architecture** (`ShipSpec.ts`): physics (mass, accel, limits,
  heating) is read from `spec`; rendering reads the art model. The default
  spec is the current ship. No hangar/fleet was built.
- **Trail**: `rgba(0,255,0,0.55)` + subdivision to ≤8 CSS px steps so the
  high-speed line is solid. **Ship**: hull art scaled to ≥10 CSS px when
  fully zoomed out (outline compensated to ~1.3 CSS px), hitbox unchanged.
  **Nebula**: radial-gradient soft edge, alphas ×1.4 (capped 0.19), same
  palette. **Pause button**: 44→56 px, matches boost; safe-area kept.

## Verification (mathematical, not visual)

- `tests/relativity.test.ts` (23 tests): γ, round-trips, extremes,
  longitudinal/transverse, boost on/off, gravity >6000, mass independence,
  determinism, dt convergence (16 ms vs 8 ms <2%), fisheye curve.
- `tests/heating.test.ts` (10 tests): pure heating, relative scaling,
  inner/critical destroy, cool-down, respawn preserves world, serialize.
- `tests/ship-handling.test.ts`: 2 above-cap tests re-pinned to the new
  engine-limit semantics (below-cap behaviour unchanged).
- Full suite: **15 files, 135 tests, all green.** `npm run build` green.
