# PHASE 22 — Ship fleet, roles and hangar

**Status:** PENDING  
**Dependency:** Phase 21 exit gate must pass.

## Goal
Add a fleet of unlockable ships that differ mechanically and visually.

## Expected result
Data-driven roster, hangar, ownership/purchase and tested ship-specific flight profiles.

## Scope and working rules
Inspect the current code and relevant project docs before changing anything. This phase must be implemented in small runnable vertical slices. Research unresolved scientific/API/graphics questions in this phase rather than inventing answers. Use authoritative sources and a separate report when the research is substantial. Separate observed facts, inference, game abstraction and fiction. Keep future extensibility data-driven only where this phase creates a real content family.

## Ordered tasks

1. **P22-T01 — Ship roles and data schema** (`TASKS/PHASE_22/P22-T01_ship-roles-and-data-schema.md`)
   - Focus: Define roles, base handling, range/utility, atmospheric ability, cargo/scanner traits, equipment slots and unlocks.
   - Completion result: New hull can be added through data and authored visuals without game-loop rewrite.

2. **P22-T02 — Distinct ship silhouettes** (`TASKS/PHASE_22/P22-T02_distinct-ship-silhouettes.md`)
   - Focus: Create original hull outlines, engine/wing/landing structures and animation states per role.
   - Completion result: Ships remain recognizable at phone scale and close-up; not recolors.

3. **P22-T03 — Hangar and unlock flow** (`TASKS/PHASE_22/P22-T03_hangar-and-unlock-flow.md`)
   - Focus: Build minimal bespoke UI for preview, comparison, price/condition, ownership, selection and insufficient-funds feedback.
   - Completion result: Player can buy/unlock/select/launch; state persists.

4. **P22-T04 — Ship gameplay comparison** (`TASKS/PHASE_22/P22-T04_ship-gameplay-comparison.md`)
   - Focus: Play same controlled space/atmosphere/landing route using multiple hulls; tune trade-offs and avoid one best ship.
   - Completion result: Measured matrix shows meaningful, viable differences.

## Exit gate — phase Definition of Done
Player earns/buys/selects ships and feels real differences in space and atmosphere.

Before closing: actively play the phase result in Playwright; inspect normal-size and close-up visuals; check console/network errors; fix and replay; update `TASK_INDEX.md`, `PROJECT_STATE.md`, `DECISION_LOG.md`, `RISK_REGISTER.md` and evidence. Commit tested work. Push and verify live Pages at stable checkpoints if remote/access is configured.

## Handoff
Record completed tasks, evidence paths, unresolved defects, performance, commit/push/Pages state and next phase. Do not mark the next phase active before this gate passes.
