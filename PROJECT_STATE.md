# Project state

**Active phase:** 03 — Modularization and deterministic game core
**Active task:** P03-T04 — Parity regression suite (NEXT)
**Overall status:** P01 ✅ | P02 ✅ | P03-T01 ✅ | P03-T02 ✅ | P03-T03 ✅ | P03-T04 ⏳
**Last verified commit:** (see git log — P03-T03 boundary extraction)
**Latest QA evidence:** EVIDENCE/PHASE_03/P03-T03/ (completion-report.md, t03-a..t03-d route)

## Current checkpoint
- Completed tasks: P01-T01..T04, P02-T01..T04, P03-T01, P03-T02, P03-T03
- In progress: none
- Blocked: none
- Next action: P03-T04 — parity regression suite, then Phase 03 exit gate → Phase 04.

## P03-T03 highlights (2026-11-07)
- Boundary extraction: Autopilot15 → src/sim/, FlightStick → src/input/,
  legacy src/app/MainActivity.ts deleted, Removable interface → core/Physics
  (core→universe dependency broken). No layer cycles remain.
- vitest 29/29, build clean, playtest route clean (rest→thrust→drift→
  pause→continue) with 0 console errors.
- Deferred follow-up for P03-T04: Autopilot15.rng still uses SYSTEM
  (picks target when all planets explored) — wire to sim.rng for determinism.

## P03-T02 highlights (2026-11-07)
- Deterministic domain layer implemented: `Body.id` stable identity scheme
  (star=0, planets=1..N, ship=1000; sparks stay -1/ephemeral), runtime RNG
  seeded (was SYSTEM — effects now replay deterministically for a seed),
  `Universe.serialize()`/`deserialize()` canonical JSON snapshot with exact
  planet-order preservation (gravity accumulation is FP-order-sensitive).
- tests/domain-layer.test.ts: 6 new tests — id scheme, byte-identical
  repeatability, full round-trip restore, bit-identical continuation after
  restore (order-independence), explored-data persistence.
- vitest 29/29, build clean. Player route re-verified (rest→thrust 3659→
  drift cap 5000→pause→continue), 0 console errors.
- Follow-ups for P03-T03: remove dead Autopilot15.rng=SYSTEM; legacy
  MainActivity.ts cleanup; move Removable to core; save version `v:1` bump
  policy recorded.

## P03-T01 highlights (2026-11-07)
- Full dependency/state map produced (EVIDENCE/PHASE_03/P03-T01/dependency-state-map.md):
  module inventory with sizes, frame data-flow, mutable-state ownership table
  (globals duplicated in legacy MainActivity.ts flagged), layering violations
  (render→app value import, core/Physics15→universe, dead legacy path,
  SYSTEM rng for effects, two playSpeed sources), coordinate-space contract
  (cameraZoom now CSS px/meter post-cbf5098), target module map for T02/T03,
  refactor risks. Play route re-verified (rest→thrust 5000→drift→pause→continue),
  0 console errors.

## Environment evidence
Verified by execution on 2026-11-06 (P01-T03, Windows 10.0.26300):
- Node.js v24.19.0, npm 11.17.0, TypeScript 5.9.3, Vite 6.4.5, Vitest 5.1.0
- OpenJDK 17, Android SDK at D:\android\sdk (build-tools 34/35, emulator + system images)
- Playwright MCP Chromium: verified working (reference played in P01-T02, 144 FPS)
- GitHub Pages: live at https://maxy618.github.io/space-game/ (deploy run #4 green)
