# P03-T03 — Boundary extraction — Completion Report

**Date:** 2026-11-07 · **Status:** VERIFIED

## What was done

Module boundaries isolated per the T01 map, keeping the game fully playable:

1. **Autopilot15 moved `app/` → `sim/`** — it is a simulation entity, not UI.
   Fixes the render→app inversion found in T01 (`VisibleUniverse15` imported
   from `app/`); now render imports from `sim/` which depends only on
   `core/` + `universe/`.
2. **FlightStick extracted `app/` → `input/FlightStick.ts`** — input widget
   isolated behind a narrow interface (pointer handler + draw callback), no
   coupling to universe/renderer/game state. Legacy `src/app/MainActivity.ts`
   deleted (only remaining consumer of FlightStick was MainActivity15; its
   other exports were dead code duplicated by MainActivity15/Universe).
3. **`Removable` interface moved `universe/Universe` → `core/Physics`** —
   base entity contracts are owned by the physics core. `core/Physics15`
   no longer imports from `universe/` (core→universe dependency broken).
4. **All import paths updated** — including `tests/phase02.test.ts`
   (`../src/app/Autopilot15` → `../src/sim/Autopilot15`).

## Resulting layer graph (no cycles)

- `core/` — no internal deps (Physics, Physics15, Vec2, Maths, CanvasHelper, Namer, Namer15, Flag15, Colors, PathTools, Deque, RandomKt, XorWowRandom, SimClock)
- `sim/` (Autopilot15) → core + universe (type-only for Spacecraft15)
- `universe/` (Universe, Universe15, Landing15, Spacecraft15) → core
- `render/` (VisibleUniverse, VisibleUniverse15) → core + universe + sim (read-only visual hints)
- `input/` (FlightStick) → core (CanvasHelper) only
- `app/` (MainActivity15) → all layers (composition root, browser glue)
- `main.ts` → app + playerSpeed + debug wiring

## Files changed

- `src/sim/Autopilot15.ts` (moved, new dir), `src/input/FlightStick.ts` (new), `src/app/MainActivity.ts` (deleted)
- `src/app/MainActivity15.ts` (imports), `src/universe/Universe15.ts` (imports), `src/universe/Universe.ts` (Removable removed, import), `src/core/Physics.ts` (Removable added), `src/core/Physics15.ts` (import), `src/render/VisibleUniverse15.ts` (import)
- `tests/phase02.test.ts` (import path)

## Verification

- `npm run build`: clean (dist 9.84 kB html + 55.66 kB js).
- `npx vitest run`: **29/29 passed** (23 phase02 + 6 domain-layer from T02).
- Playwright playtest route (1280×800, seed 123456789): rest → thrust
  (THR 100%, VEL 4158 mid-accel) → release → drift VEL 5000 → pause menu
  `pause-open` → CONTINUE → resumed (drift continues). **0 console errors.**

## Evidence

- `t03-a-rest.png`, `t03-b-thrust.png`, `t03-c-drift.png`, `t03-d-pause.png`

## Deviations / notes

- T01 note said Autopilot15.rng was "dead" — re-inspection showed it picks
  autopilot target when all planets explored (`chooseRandom(this.rng, ...)`).
  It still uses `SYSTEM` (non-deterministic). Deferred to P03-T04
  (determinism regression suite) where it can be verified and wired to
  `sim.rng`.
- Android reference license headers preserved in moved files.
