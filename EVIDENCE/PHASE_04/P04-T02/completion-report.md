# P04-T02 — Ship handling and tuning — Completion Report

**Date:** 2026-11-07 · **Status:** VERIFIED

## What was done

Handling was measured through repeatable scripted routes (browser playtest)
and locked with unit tests (`tests/ship-handling.test.ts`, 8 tests).

**Handling contract (confirmed, units: meters/seconds):**
- Full-thrust acceleration = **1000 m/s²** (`MAIN_ENGINE_ACCEL`, reference value).
- Hard speed cap = **5000 m/s** (`CRAFT_SPEED_LIMIT`); cruise holds it exactly.
- No drag: coasting preserves velocity exactly (inertia = crux of play feel).
- Brake (S) rotates to retrograde and applies the same −1000 m/s².
- Half thrust → half rate (SCALED_THRUST linear scaling).
- Keyboard steering: heading changes at **1.8 rad/s** while held.
- **Frame-rate independence**: the simulator integrates `dt`, so equal
  simulated time at 16 ms vs 33 ms steps yields velocity within 5%
  (bounded by discrete-step grid), and capped cruise is identical.

**Test harness note (found bug, fixed in test, not engine):** calling the
scripted `runSteps` helper twice on the same universe resets its wall clock
to 1 ms, producing one step with dt=−0.96 s (negative thrust step). Tests now
use a fresh universe per assert (a→60 steps, a→150 steps). The engine itself
guarantees monotonic time via SimClock; reference parity preserved.

**Gravity isolation:** thrust tests zero stellar/planetary mass in-test,
because raw gravity (≈300–1400 m/s²) otherwise masks engine measurements.

## Player route
- Full thrust 6 s → approaching cap (browser-measured VEL 3410 — the ship
  fights seed gravity; sandbox tests confirm +1000 m/s² and the 5000 cap).
- Brake (S) 6 s → VEL 24 ≈ full stop.
- 0 console errors throughout.

## Verification
- `npm test`: **51/51** (43 before + 8 ship-handling). `npm run build`: clean.

## Evidence
- EVIDENCE/PHASE_04/P04-T02/t02-braking-stop.png

## Decisions
- No parameter changes were needed: reference values (accel/cap) measured
  correct; tuning achieved via the P04-T01 input layer (keyboard+brake+steer)
  on top of the reference physics. Kept 1.8 rad/s turn rate.
