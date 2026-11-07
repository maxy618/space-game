# Project state

**Active phase:** 04 — Ship controls and movement feel (COMPLETE)
**Active task:** none — Phase 04 closed (P04-T04 VERIFIED)
**Overall status:** P01 ✅ | P02 ✅ | P03 ✅ | P04-T01 ✅ | P04-T02 ✅ | P04-T03 ✅ | P04-T04 ✅
**Last verified commit:** 78d9a5b (P04-T03) + P04-T04 commit
**Latest QA evidence:** EVIDENCE/PHASE_04/P04-T04/ (completion-report.md, t04-a..b)

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
