# P04-T01 — Input action abstraction — Completion Report

**Date:** 2026-11-07 · **Status:** VERIFIED (part of uncommitted batch with P04-T02)

## What was implemented

### New module — `src/input/InputActions.ts` (device-independent action layer)
- `InputActionLayer`: merges all device sources into one set of actions.
  The flight stick wins while active (pointer down); the keyboard fills in
  when it is not.
- `KeyboardSource`: tracks held keys, dispatches atomic edge actions
  (interact, scan, landLaunch, pause) once per physical press (auto-repeat
  filtered via `ke.repeat`), and releases **everything** on window blur
  (lost keyup can never leave a key stuck).

### Key mapping (physical codes, layout-independent)
- **Thrust**: `W` / `ArrowUp`; **brake**: `S` / `ArrowDown`;
  **steer**: `A`,`D` / `ArrowLeft`, `ArrowRight` (opposites cancel to zero).
- **Edges**: `E` interact, `Q` scan, `L` land/launch, `P`/`Escape` pause.
  The game systems for interact/scan/landLaunch arrive in later phases; they
  are mapped and consumed so they never pile up.
- **Pause toggle**: P/Escape route through the same `setEdgeHandler("pause")`
  → `pauseButton.click()` path as the on-screen button (same pause menu).

### Keyboard flight (in `MainActivity15.applyKeyboardFlight`, per frame)
- W: thrust along current heading (same `ship.thrust` mapping as the stick).
- S: rotate ship to retrograde and burn — the physics engine always applies
  deltaV along `ship.angle` (Universe15), so braking must rotate first.
- A/D: heading changes at 1.8 rad/s while held.
- Stick active → keyboard zeroed (stick wins), so no double control.

### Other fixes in this slice
- `main.ts`: `pauseMenu.hidden` now synced inside `setPlayerPaused` (was never
  toggled — the button toggle always called `setPlayerPaused(true)`, so the
  pause button could never resume; only CONTINUE worked).
- `src/input/FlightStick.ts`: callback gained an explicit `isDown` flag so
  the action layer can distinguish "released" from "centered".
- `src/app/MainActivity15.ts`: **camera pulled back 1.4×** (`CAMERA_DISTANCE
  = 1.4`, user request 2026-11-07 — phones felt too close at rest, on both
  high-res and regular-resolution screens).

### Tests — `tests/input-actions.test.ts` (9 tests, all passing against a
FakeEventTarget):
hold/cancel/alias mapping, brake, edge once-per-press + repeat filter,
pause edges, blur full release, stick priority over keyboard, handler
dispatch vs poll queue.

## Playwright player test (seed 123456789, Chromium, 1280×800)
- Rest `THR: 0% VEL: 76` → W hold → `THR: 100% VEL: 3689` (t01-a/b).
- W release → drift `THR: 0% VEL: 5000` (t01-c).
- D+W steering: direction of POS delta turned right ~22°→28° (t01-d).
- S brake: VEL 4630 → 1355 → 7 over ~6 s (t01-b-brake).
- P pause toggle: `pause-open` opened, P again closed, Escape opened,
  CONTINUE closed — all four paths (t01-f + state sequence probe).
- Blur during W-hold: THR 100% → 0% immediately, momentum preserved
  (VEL 3107), no stuck thrust.
- Touch-pointer stick regression: `THR: 100% VEL: 4179` → release → drift
  VEL 4550 (0 console errors throughout).

## Verification
- `npm run build`: clean. `npm test`: **43/43** (34 before + 9 input actions).

## Evidence
- EVIDENCE/PHASE_04/P04-T01/: t01-a-rest, t01-b-keyboard-thrust, t01-c-drift,
  t01-d-steer, t01-b-brake, t01-f-keyboard-pause, camdistance-* (before/after).

## Known limitations (for later phases)
- interact/scan/landLaunch are mapped but have no game systems yet (P04-T02/T03).
- Keyboard turn rate (1.8 rad/s) is a first value, tuned in P04-T02.
