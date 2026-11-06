# PHASE 20 — Planetary rover and surface vehicle

**Status:** PENDING  
**Dependency:** Phase 19 exit gate must pass.

## Goal
Let players deploy a ground vehicle and explore planetary terrain in a different way from flight.

## Expected result
Responsive rover, suspension/traction, distinct camera/controls and persistent ship-to-rover flow.

## Scope and working rules
Inspect the current code and relevant project docs before changing anything. This phase must be implemented in small runnable vertical slices. Research unresolved scientific/API/graphics questions in this phase rather than inventing answers. Use authoritative sources and a separate report when the research is substantial. Separate observed facts, inference, game abstraction and fiction. Keep future extensibility data-driven only where this phase creates a real content family.

## Ordered tasks

1. **P20-T01 — Vehicle model research** (`TASKS/PHASE_20/P20-T01_vehicle-model-research.md`)
   - Focus: Compare 2D vehicle models for wheel/track contact, suspension, traction and terrain resistance.
   - Completion result: Model spec records controls, abstractions, limits and test cases.

2. **P20-T02 — Rover handling and camera** (`TASKS/PHASE_20/P20-T02_rover-handling-and-camera.md`)
   - Focus: Implement drive/brake/steer/suspension/wheels/terrain following and rover-specific framing.
   - Completion result: Rover can be controlled on keyboard/touch and reacts to terrain materials/slopes.

3. **P20-T03 — Deploy/return and persistence** (`TASKS/PHASE_20/P20-T03_deploy-return-and-persistence.md`)
   - Focus: Implement ship-to-rover deployment, dismount/return, proximity, position ownership and save/load.
   - Completion result: Same vehicle/position persists without duplication or teleport.

4. **P20-T04 — Drive and explore playtest** (`TASKS/PHASE_20/P20-T04_drive-and-explore-playtest.md`)
   - Focus: Drive across flat, rocky, sandy, icy/coastal and chunk boundary terrain; scan and test recovery from obstacles.
   - Completion result: Playwright route proves steering, traction, exploration, return and escape/recovery.

## Exit gate — phase Definition of Done
Player deploys, drives across varied surfaces, scans, returns to ship and retains exact rover position.

Before closing: actively play the phase result in Playwright; inspect normal-size and close-up visuals; check console/network errors; fix and replay; update `TASK_INDEX.md`, `PROJECT_STATE.md`, `DECISION_LOG.md`, `RISK_REGISTER.md` and evidence. Commit tested work. Push and verify live Pages at stable checkpoints if remote/access is configured.

## Handoff
Record completed tasks, evidence paths, unresolved defects, performance, commit/push/Pages state and next phase. Do not mark the next phase active before this gate passes.
