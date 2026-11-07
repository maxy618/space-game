# P03-T01 — Dependency and state map

**Date:** 2026-11-07 · **Status basis:** code as of commit `cbf5098` (post Phase 02 + high-DPI camera fix).

## 1. Module inventory (actual, measured)

| Module | KB | Role | Imports from |
|---|---|---|---|
| `src/main.ts` | 17.3 | **Composition root**: URL params (#debug, #seed, #zoom, #flag, #is16, #speedzoom), RAF loop, SimClock wiring, canvas/DPR sizing, FlightStick listener attach, pause button/menu + pulses, debug controls (speed/pause-check/zoom select), autopilot button | app/MainActivity15, core/SimClock, core/Flag15, playerSpeed |
| `src/app/MainActivity15.ts` | 17.5 | Gameplay root: seed selection, FlightStick→ship.thrust mapping, camera (Spaaaace) incl. velocity zoom, Telemetry DOM | core/*, render/VisibleUniverse15, universe/Universe+Universe15, app/FlightStick(from MainActivity), app/Autopilot15 |
| `src/app/MainActivity.ts` | 17.6 | **Legacy port of the original player** (camera, telemetry, FlightStick source). Only `FlightStick` is live-imported by MainActivity15; the rest is dead code kept as reference | core/*, universe/Universe, render/VisibleUniverse |
| `src/app/Autopilot15.ts` | 8.1 | Autopilot entity: target selection + strategy state machine (CHASING/APPROACHING/LANDING/LANDED/LAUNCHING), debug telemetry string | core/*, universe/Universe, universe/Universe15 |
| `src/render/VisibleUniverse15.ts` | 15.3 | Canvas-2D renderer for the V15 world: star, planets, orbits, gravity rings, ship+legs, sparks, landing marker, autopilot visuals; extends VisibleUniverse15→VisibleUniverse(universe domain) | core/*, universe/*, app/Autopilot15 (value import) |
| `src/render/VisibleUniverse.ts` | 15.3 | Base renderer + ZoomedDrawScope; used only by legacy MainActivity.ts path | core/*, universe/Universe |
| `src/universe/Universe.ts` | 21.4 | Simulation domain: UniverseConst, Planet/Star/Spacecraft/Spark/Landing/Track, Universe extends Simulator (gravity, landing/impact, ringfence) | core/Physics, core/* |
| `src/universe/Universe15.ts` | 3.5 | V15 sim extension: Spacecraft15 (+autopilot ref), Landing15 (+Fuse, text) | universe/Universe, core/Physics15, core/Flag15, **type-only** app/Autopilot15 |
| `src/core/Physics.ts` | 6.3 | Simulator (entities/constraints Sets, step PDB loop), Body, Constraint, Container | @thi.ng/random (SYSTEM), core/RandomKt, core/Vec2 |
| `src/core/Physics15.ts` | 1.5 | Fuse lifetime helper | universe/Universe (Removable) |
| `src/core/SimClock.ts` | 1.9 | **Pure, DOM-free** play-speed/pause arithmetic | none |
| `src/core/Namer.ts` / `Namer15.ts` | 10.4 / 3.7 | Procedural naming/descriptions (pure) | core/Randomness, Arrays |
| `src/core/XorWowRandom.ts`, `RandomKt.ts` | 3.8 / 1.2 | Seeded XoRWow PRNG (Kotlin-compatible), `newRandom(seed)` | @thi.ng/random |
| `src/core/*` misc | — | Vec2, Maths (clamp/lexp/expSmooth), MathHelpers(lerp), Colors, CanvasHelper (render util), Flag15 (global flag), Debug (LOG const), Deque, Arrays, PathTools, Randomness | — |
| `src/playerSpeed.ts` | 4.8 | Debug speed-picker DOM (integral/decimal pages) | none (DOM ids) |
| `tests/` | — | `determinism.test.ts` (PRNG/Namer/Universe seed determinism), `phase02.test.ts` (SimClock, Fuse, Namer15, Autopilot15, Spacecraft15 launch) | — |

## 2. Data-flow: one frame

```
RAF(millis) → SimClock.drawTime(millis)          [main.ts owns wall-time]
            → drawFn(drawTime) = MainActivity15.draw
                 → universe.simulateFrame(millis)   [VisibleUniverse15: dt-throttle → Simulator.step]
                      → updateAll: entities.update (planets orbit velocity, ship thrust/launch, autopilot strategy, sparks)
                      → solveAll: constraints (ringfence container, landing constraint)
                      → postUpdateAll: velocity recompute, spark exhaustion removal
                 → Spaaaace(ctx, helper)             [camera: zoom policy → world→screen transform → grid → ZoomedDrawScope.drawUniverse]
                 → flightStick.draw                  [debug circle overlay]
                 → Telemetry(millis)                 [DOM text mutation: top/bottom/autopilot]
```

Input (async, event-driven):
```
canvas pointer/touch events → FlightStick.pointerInput closure
   → onStickChanged(dx,dy) → ship.angle + ship.thrust (direct mutation into sim state)
```

## 3. Mutable state inventory & ownership

### 3.1 Module-level globals (hidden state)

| Variable | File | Mutators | Notes |
|---|---|---|---|
| `RANDOM_SEED_TYPE`, `FIXED_RANDOM_SEED` | MainActivity15.ts (+ duplicated in MainActivity.ts) | setters from main.ts via URL params | seed policy; also **read at construction time only** |
| `camZoom`, `DYNAMIC_ZOOM`, `SPEED_ZOOM_ENABLED` | MainActivity15.ts (+ dup in MainActivity.ts) | setters; wheel/pinch (debug), zoomSelect (debug) | camera zoom target |
| `playSpeed` | MainActivity15.ts | setPlaySpeed from speed picker | duplicates SimClock.playSpeed — **two sources of truth** |
| `isBaklava`, `isControlsShow` | MainActivity15.ts | setIsBaklava (also **mutates DOM favicon** — hidden side effect) | reference parity mode |
| `cachedMassString` | MainActivity15.ts | set at construction | telemetry cache |
| `drawFlag` | core/Flag15.ts | setDrawFlag from URL params | global render flag |
| `LOG` | core/Debug.ts | none (const) | fine |

All these are read by closures; they survive across universes and make `MainActivity15` non-reentrant. `MainActivity.ts` duplicates the whole set (dead path) — must not be re-enabled accidentally.

### 3.2 Simulation-owned state

- `Simulator`: `entities: Set<Entity>`, `constraints: Set<Constraint>`, `now` (sim seconds), `dt` (last step), `randomSeed`, `rngForInit` (**seeded**, XorWow), `rng` (**SYSTEM — non-deterministic runtime RNG**).
- `Body`: pos/opos/velocity/mass/radius/angle. Ship adds thrust/launchClock/landing/track. Planet adds orbitCenter/speed/explored/description/atmosphere/flora/fauna (player-discovered annotations live **on the same objects** as generated data — flagged for P03-T02 separation).
- `Autopilot15`: enabled/target/strategy timers + rendering fields (leadingPos/leadingVector) — sim + render state mixed in one class.

### 3.3 Frame/render state

- `Spaaaace` closure: `cameraZoom` (smoothed), `cameraOffsetX/Y` — per-activity, but zoom policy reads globals (§3.1).
- `ZoomedDrawScope15`: zoom/context/helper assigned per frame; SVG paths pre-parsed.
- `CanvasHelper`: mutable x/y/width/height/radius assigned per frame — a mutable render-context object.
- `window.devicePixelRatio` read every frame (high-DPI fix cbf5098: cameraZoom is CSS px/meter, scale = zoom·dpr).

### 3.4 Input state

- `FlightStick` closure: isDown/isDownTouch/origin/target — self-contained; writes directly into `ship.thrust/angle` via callback (domain mutation from input layer, acceptable but the callback is the boundary).
- `main.ts` touch-zoom (two-finger pinch, debug-only) writes `camZoom` global.

### 3.5 UI/DOM state

- Telemetry closures own text nodes + reveal timers (opacity animation uses `Math.random()` — cosmetic).
- Pause button/menu + pulse chain + collision avoidance (`keepPauseButtonClear`) in main.ts — DOM only, does not touch sim except `clock.pause/resume` and `enableTouch/disableTouch` (listener toggling).
- Debug: speed picker (playerSpeed.ts), pauseCheck, zoomSelect.

## 4. Dependency cycles and layering violations

1. **render → app edge:** `render/VisibleUniverse15.ts` imports `Autopilot15` (value import) for `drawAutopilot`, while `app/MainActivity15.ts` imports the renderer. Folder-level cycle app ⇄ render (no ES module cycle because Autopilot15 does not import back, but layering is inverted: render knows about app logic).
2. **universe → app (type-only):** `Universe15` imports `Autopilot15` type — safe (`import type`) but couples domain to app.
3. **core/Physics15 → universe/Universe:** `Fuse` imports `Removable` from universe — core depends on universe (inverted; `Removable` should live in core/Physics).
4. **Legacy duplication:** `MainActivity.ts` carries a full second copy of camera/telemetry/seed globals. Only `FlightStick` is imported. Dead code = drift risk (already caused one near-miss: seed/zoom setters exist in two files).
5. **Non-deterministic runtime:** `Simulator.rng = SYSTEM` (@thi.ng OS randomness) used for sparks/impact; discovery of `explored` flags etc. deterministic, but spark placement is not — acceptable for effects, but any future logic depending on `sim.rng` would break determinism. `Autopilot15.rng` is also SYSTEM (currently unused — dead field).
6. **Two play-speed sources:** `SimClock.playSpeed` (real timing) and `playSpeed` global (telemetry FPS math) — must be unified.

## 5. Coordinate spaces / units (contract)

- **World:** meters (reference convention; positions up to ±UNIVERSE_RANGE 200 000). `Planet.pos` = world center, `radius` in meters. `velocity` in meters/s, cap `CRAFT_SPEED_LIMIT = 5000`. `thrust` = unit vector 0..1 (MAIN_ENGINE_ACCEL 1000 m/s² × thrust).
- **Camera:** `cameraZoom` = **CSS pixels per meter** (post-cbf5098; before it was device px/m — high-DPI bug). `deviceScale = cameraZoom × dpr` applied via `context.scale`; visible-space math divides canvas.width (device px) by deviceScale. Grid step adapts `gridStep × deviceScale ≥ 32 CSS px`.
- **Screen:** device pixels on canvas; CSS px for DOM overlays (flight stick radii via `toLocalPx = css × dpr`, since stick math runs in device px space of clientX×dpr).
- **Sim time:** seconds (dt), `Simulator.now` in seconds; wall→sim via SimClock.drawTime (playSpeed/pause compensated).

## 6. Target module map (for P03-T02/T03 — no speculative abstractions)

```
src/
  core/            # pure engine primitives (no DOM, no Pixi, no window)
    physics.ts     # Simulator/Body/Constraint/Container + Removable (moved here)
    simclock.ts    # play-speed/pause arithmetic (pure)
    vec2.ts, maths.ts, rng.ts (XorWow/newRandom), deque, paths, colors, canvas-helper
  sim/             # deterministic domain: world identity + simulation state
    universe15.ts  # constants, Star/Planet/Spacecraft15/Landing15/Spark/Track, gravity, landing
    autopilot.ts   # strategy state machine (pure sim entity; render fields split out)
  input/           # device events → domain intents
    flight-stick.ts# pointer→stick vector mapping (device-px aware); emits {angle, thrust}
  camera/          # zoom policy + world→screen transform
    camera.ts      # velocity zoom (player), dynamic/manual zoom (debug), dpr contract
  render/          # display objects, DrawScopes, per-frame drawing
    visible-universe15.ts
  ui/              # DOM: telemetry text, pause menu, autopilot button, debug controls
  main.ts          # composition root: build sim+input+camera+render, wire RAF + events
```

Rules going forward: domain never imports render/ui/browser; render imports domain + camera only; input emits intents, does not mutate ship directly; every module keeps its current license headers; behavior parity is the gate (reference routes must keep passing).

## 7. Risks identified for refactor (input to RISK_REGISTER)

- R: touching camera zoom math can regress the high-DPI fix or freeze page (gridStep loop) → keep clamp + tests.
- R: moving `Removable` breaks `implements` chains → move type only, keep import paths stable.
- R: unifying playSpeed must keep SimClock.setSpeed semantics (offset arithmetic) — unit tests exist.
- R: legacy MainActivity.ts removal may drop needed reference snippets → keep file until Phase 04 review, marked clearly as reference-only.

## 8. Player test (game unchanged by this task)

Standard route re-played on dev server (see `t01-a..d` screenshots): load → thrust → release/drift → pause → continue, desktop 1280×800. Route passed post-mapping; no behavioral change intended or observed.
