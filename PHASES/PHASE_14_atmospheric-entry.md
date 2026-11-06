# PHASE 14 — Seamless atmospheric entry and trajectory continuity

**Status:** PENDING  
**Dependency:** Phase 13 exit gate must pass.

## Goal
Create a cinematic space-to-atmosphere transition that preserves the same ship and manoeuvre.

## Expected result
Playable entry where ship, planet region, mapped position, heading, momentum and player control carry into local flight.

## Scope and working rules
Inspect the current code and relevant project docs before changing anything. This phase must be implemented in small runnable vertical slices. Research unresolved scientific/API/graphics questions in this phase rather than inventing answers. Use authoritative sources and a separate report when the research is substantial. Separate observed facts, inference, game abstraction and fiction. Keep future extensibility data-driven only where this phase creates a real content family.

## Ordered tasks

1. **P14-T01 — Entry research and state machine** (`TASKS/PHASE_14/P14-T01_entry-research-and-state-machine.md`)
   - Focus: Study atmospheric-entry gameplay references and relevant dynamics; specify states, thresholds, abort/no-atmosphere cases and persistent variables.
   - Completion result: State machine and transition specification are reviewed before implementation.

2. **P14-T02 — Coordinate mapping and continuity** (`TASKS/PHASE_14/P14-T02_coordinate-mapping-and-continuity.md`)
   - Focus: Map orbital approach coordinates, velocity, orientation and local target region into side-view coordinates without spawning a new ship.
   - Completion result: Tests prove same seed/approach yields same region and position/heading/velocity continuity within defined tolerances.

3. **P14-T03 — Cinematic layered transition** (`TASKS/PHASE_14/P14-T03_cinematic-layered-transition.md`)
   - Focus: Animate camera scale, curvature/horizon, atmospheric rim, haze, clouds, parallax, lighting and event filters; pre-stream terrain before reveal.
   - Completion result: Full-speed and frame-by-frame review shows no black-frame shortcut, loading gap, pop or input remap.

4. **P14-T04 — Abort and edge cases** (`TASKS/PHASE_14/P14-T04_abort-and-edge-cases.md`)
   - Focus: Support shallow/steep/high/slow entries, pull-up, no atmosphere, blocked cloud, resize, pause/resume and repeated entry/exit.
   - Completion result: Every state recovers without duplicate ship, lost state or stuck filter.

5. **P14-T05 — Actual trajectory playtest** (`TASKS/PHASE_14/P14-T05_actual-trajectory-playtest.md`)
   - Focus: Play several approaches, steer during descent, continue in atmosphere, land/abort and repeat at desktop/touch viewports.
   - Completion result: Recorded Playwright session proves trajectory and controls; screenshots alone do not pass.

## Exit gate — phase Definition of Done
Player can steer during entry, continue the same trajectory in atmosphere, abort/retry and later land; no teleport or black fade.

Before closing: actively play the phase result in Playwright; inspect normal-size and close-up visuals; check console/network errors; fix and replay; update `TASK_INDEX.md`, `PROJECT_STATE.md`, `DECISION_LOG.md`, `RISK_REGISTER.md` and evidence. Commit tested work. Push and verify live Pages at stable checkpoints if remote/access is configured.

## Handoff
Record completed tasks, evidence paths, unresolved defects, performance, commit/push/Pages state and next phase. Do not mark the next phase active before this gate passes.
