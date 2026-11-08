# Project state

**Active phase:** 08 — Ray-marching, optics and contextual screen filters (COMPLETE)
**Active task:** none — Phase 08 closed (P08-T01..T05 VERIFIED)
**Overall status:** P01 ✅ | P02 ✅ | P03 ✅ | P04 ✅ | P05 ✅ | P06 ✅ | P07 ✅ | P08 ✅
**Last verified commit:** 49e21c0 (Batch 6 UI) + Phase 08 graphics breakthrough (this commit)
**Latest QA evidence:** EVIDENCE/PHASE_08/P08-T01..T05 + EVIDENCE/batch6/ (planet/star/BH/tier proofs)

## Phase 08 graphics breakthrough (2026-11-09, large research first)
- Research: `docs/RESEARCH_PHASE_06_07_08.md` — renderer constraint (Canvas2D,
  no HW-RT), FBM/nebulae, stellar physics, planet atmosphere, BH lensing
  (screen-space vs geodesic), PostFX design + tiers. Full URLs + confidence.
- Celestial sprites: `src/render/CelestialArt.ts` (seeded FBM, palettes, sun
  lighting) + `src/render/SpriteBaker.ts` (star/planet/cloud baking, 384px,
  1 blit/body). LOD-wired (`lodFor`): macro=glow disc, fine/micro=procedural
  base at extreme close-up (no sprite blur).
- WebGL2 PostFX compositor `src/render/PostFX.ts`: barrel warp, BH screen-space
  lensing, heat shimmer/glare, 9-tap in-shader bloom, exact-black highlight
  rolloff, CA, vignette, grain. Tiers high/medium/low/off, reduced-motion
  gated, `resize()`/`dispose()` leak-free. Input untouched (pointer-events none).
- QA-found fixes: FBO bloom smeared screen → 9-tap; ACES tripled blacks →
  rolloff; corona linear wash → exponential stops.
- Perf (desktop Playwright): 129→115–137 fps (−11%). 0 game console errors.
  Tests 176/176 (new: celestial-art 10, postfx-profiles 7).
- Known non-blocking: spawn-in-void + BH outside playable range recorded as
  R-006 (out of 06–08 scope, next mission).

## Physics/visuals fix round (2026-11-08, user brief)
- ENGINE-ONLY speed caps: Spacecraft clamps each burn to max(pre-burn speed, cap) — regular engine 4000, boost 6000; total velocity is never reduced by the cap, gravity can exceed both. boostLatched drag removed (it bled speed on boost release — the reported bug).
- ShipProfile.ts: data-driven ship config (engineAccel, caps, boost multiplier, heat tolerance, glow color, destruction scale) — architecture for future ships, no hangar.
- Gravity ×4 for the ship only (UniverseConst.SHIP_GRAVITY_MULTIPLIER); asteroids/orbits keep Kepler calibration. Live-measured free-fall ~220 px/s² at 11 km from the seed star.
- Fisheye now velocity-driven (Camera.fisheyeTargetForSpeed): 0 at ≤6000, log curve above, subtle 0.6 target at 30000; warp mapping/orientation untouched.
- Boost neon edge glow (#boostGlow overlay) while boost AND thrust>0; verified release/boost-off/respawn drop it; separate from the fisheye.
- Star hazard (StarHeat.ts + VisibleUniverse15): corona 1.9R heat start, kill 1.45R, quadratic proximity rate, cooldown 0.3/s; destruction = flash rings + particles + debris + respawn = initial spawn (universe/explored preserved, opos synced to avoid phantom velocity). Verified live twice.
- Trail: single-path translucent stroke rgba(80,255,140,0.35) — culling gaps (dotted look) removed. Ship outline capped at 2.4 m + faint halo when the hull is sub-pixel. Nebula: shadow-blur soft edges, alpha 0.08–0.16.
- Pause button 56px (= boost button; user override of the 44px decision).
- Tests: 120/120 (new: engine-limits 7, star-hazard 8, fisheye-curve 3; ship-handling updated to engine-only caps). Build green. Evidence: EVIDENCE/fix-round/.

## Current checkpoint
- Completed tasks: P01-T01..T04, P02-T01..T04, P03-T01..T04, P04-T01..T04 (Phase 04 COMPLETE)
- In progress: none
- Blocked: none
- Next action: Phase 04 exit gate passed → Phase 05 (camera/scale/navigation feel).

## P04-T01 highlights (2026-11-07)
- Input action abstraction: src/input/InputActions.ts — one layer fed by
  keyboard/mouse/touch; W/A/S/D + arrows, E/Q/L/P/Escape edges, stick wins
  while active, blur releases everything. Camera moved back 1.4x
  (CAMERA_DISTANCE, user request) on all devices. Pause toggle bug fixed
  (pauseMenu.hidden sync). tests/input-actions.test.ts 9 tests.

## P04-T02 highlights (2026-11-07)
- Ship handling locked: 1000 m/s² accel, 5000 cap, symmetric brake, no drag,
  frame-rate independence confirmed; tests/ship-handling.test.ts 8 tests
  (gravity isolated in-test). vitest 51/51.

## P04-T03 highlights (2026-11-07)
- Touch controls: safe-area insets (CSS env() for pause button + JS mirror),
  bespoke joystick pressed states, multitouch/resize release verified on
  412x915. 0 console errors.

## P04-T04 highlights (2026-11-07)
- Full control playtest: keyboard flight, pause toggle, touch thrust,
  pointercancel, blur release — all metrics as expected, 0 errors, no P0/P1
  friction. Phase 04 exit gate passed.

## P03-T04 highlights (2026-11-07)
- Parity regression suite: tests/parity-regression.test.ts (5 tests) — autopilot target determinism (sim.rng replaces SYSTEM), byte-identical autopilot flight, scripted thrust parity, NaN-free smoke run. vitest 34/34 at that point, build clean.
- Docs: docs/CONTENT_AUTHORING.md, docs/PLAYER_ROUTES.md.
- Player route re-verified post-refactor: rest→thrust→drift→pause→resume, 0 console errors.

## P03-T03 highlights (2026-11-07)
- Boundary extraction: Autopilot15 → src/sim/, FlightStick → src/input/, legacy MainActivity.ts deleted, Removable → core/Physics. No layer cycles.

## P03-T02 highlights (2026-11-07)
- Deterministic domain layer: stable IDs (0, 1..N, 1000), runtime RNG seeded (SYSTEM removed), serialize/deserialize with order-independent restore + 6 tests.

## P03-T01 highlights (2026-11-07)
- Dependency/state map: module inventory, state ownership, layering violations, coordinate-space contract, target module map — EVIDENCE/PHASE_03/P03-T01/.

## Environment evidence
- Node.js v24.19.0, npm 11.17.0, TypeScript 5.9.3, Vite 6.4.5, Vitest 5.1.0
- GitHub Pages: live at https://maxy618.github.io/space-game/
