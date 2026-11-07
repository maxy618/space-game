# Project state

**Active phase:** 03 — Modularization and deterministic game core
**Active task:** P03-T02 — Deterministic domain layer (NEXT)
**Overall status:** P01 ✅ | P02 ✅ | P03-T01 ✅ | P03-T02..T04 ⏳
**Last verified commit:** cbf5098 (P02-T03 high-DPI camera fix) + P03-T01 docs commit
**Latest QA evidence:** EVIDENCE/PHASE_03/P03-T01/ (dependency-state-map.md, t01-a..t01-c route)

## Current checkpoint
- Completed tasks: P01-T01..T04, P02-T01..T04, P03-T01
- In progress: P03-T02 — deterministic domain layer
- Blocked: none
- Next action: P03-T02 → P03-T03 → P03-T04, then Phase 04.

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
