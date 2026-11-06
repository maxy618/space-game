# PHASE 02 — Faithful Android reference reconstruction

**Status:** PENDING  
**Dependency:** Phase 01 exit gate must pass.

## Goal
First make a faithful, playable reconstruction of the selected Android reference. Do not invent the later dream-game features yet.

## Expected result
A playable reference-like baseline with version-specific behavior, controls and a source-backed parity report.

## Scope and working rules
Inspect the current code and relevant project docs before changing anything. This phase must be implemented in small runnable vertical slices. Research unresolved scientific/API/graphics questions in this phase rather than inventing answers. Use authoritative sources and a separate report when the research is substantial. Separate observed facts, inference, game abstraction and fiction. Keep future extensibility data-driven only where this phase creates a real content family.

## Ordered tasks

1. **P02-T01 — Reference behavior capture** (`TASKS/PHASE_02/P02-T01_reference-behavior-capture.md`)
   - Focus: Play every chosen reference version at desktop and phone sizes. Exercise startup, ship movement, camera/zoom, menus, object interactions and viewer/travel modes. Record inputs, state, video/screenshots and observed/inferred status.
   - Completion result: Version-by-version feature matrix and reproducible reference routes exist.

2. **P02-T02 — Core scene and starfield parity** (`TASKS/PHASE_02/P02-T02_core-scene-and-starfield-parity.md`)
   - Focus: Recreate initial scene composition, object placement, star distribution, scale cues, motion, deterministic behavior and responsive layout. Match reference before redesign.
   - Completion result: Matched seed/state/viewports are visually and behaviorally comparable; no random placeholder replaces reference behavior.

3. **P02-T03 — Ship and interaction parity** (`TASKS/PHASE_02/P02-T03_ship-and-interaction-parity.md`)
   - Focus: Recreate observed movement, orientation, acceleration/inertia, camera response, interactions and feedback. Reuse only license-cleared source and preserve notices.
   - Completion result: Player can perform every observed core interaction; actions are functional, not decorative.

4. **P02-T04 — End-to-end parity playtest** (`TASKS/PHASE_02/P02-T04_end-to-end-parity-playtest.md`)
   - Focus: Build Playwright routes and personally play through the baseline. Compare reference and clone under equivalent inputs, inspect runtime errors and document exact deviations.
   - Completion result: Parity report has route/input/evidence/browser details, pass/fail and known differences.

## Exit gate — phase Definition of Done
The agent has actually played the reconstruction through Playwright, and the major reference interactions work end-to-end. Screenshots alone do not pass.

Before closing: actively play the phase result in Playwright; inspect normal-size and close-up visuals; check console/network errors; fix and replay; update `TASK_INDEX.md`, `PROJECT_STATE.md`, `DECISION_LOG.md`, `RISK_REGISTER.md` and evidence. Commit tested work. Push and verify live Pages at stable checkpoints if remote/access is configured.

## Handoff
Record completed tasks, evidence paths, unresolved defects, performance, commit/push/Pages state and next phase. Do not mark the next phase active before this gate passes.
