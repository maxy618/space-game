# PHASE 03 — Modularization and deterministic game core

**Status:** PENDING  
**Dependency:** Phase 02 exit gate must pass.

## Goal
Refactor the playable baseline into clear modules without changing the behavior.

## Expected result
Small coherent modules, stable IDs/seeds, simulation/render/input/save boundaries and regression coverage.

## Scope and working rules
Inspect the current code and relevant project docs before changing anything. This phase must be implemented in small runnable vertical slices. Research unresolved scientific/API/graphics questions in this phase rather than inventing answers. Use authoritative sources and a separate report when the research is substantial. Separate observed facts, inference, game abstraction and fiction. Keep future extensibility data-driven only where this phase creates a real content family.

## Ordered tasks

1. **P03-T01 — Dependency and state map** (`TASKS/PHASE_03/P03-T01_dependency-and-state-map.md`)
   - Focus: Trace mutable state, imports, update loop, event flow, render objects, input handlers and data ownership. Identify cycles and hidden side effects.
   - Completion result: Target module map assigns each responsibility and avoids speculative abstractions.

2. **P03-T02 — Deterministic domain layer** (`TASKS/PHASE_03/P03-T02_deterministic-domain-layer.md`)
   - Focus: Separate persistent world identity and simulation state from Pixi display objects and screen coordinates. Define stable IDs, seeded PRNG and units.
   - Completion result: Repeatability/order-independence and serialization tests pass.

3. **P03-T03 — Boundary extraction** (`TASKS/PHASE_03/P03-T03_boundary-extraction.md`)
   - Focus: Isolate simulation, input mapping, camera, renderer resources, UI and persistence behind narrow interfaces. Keep domain code independent from browser/Pixi where practical.
   - Completion result: Module boundaries are implemented and tested; resource ownership is explicit.

4. **P03-T04 — Parity regression suite** (`TASKS/PHASE_03/P03-T04_parity-regression-suite.md`)
   - Focus: Add unit/smoke tests and Playwright player routes for core actions. Document how to add a new object/mechanic.
   - Completion result: Reference parity survives refactoring and docs match actual code.

## Exit gate — phase Definition of Done
Reference routes still pass; the game remains runnable; new content can be added without rewriting the game loop.

Before closing: actively play the phase result in Playwright; inspect normal-size and close-up visuals; check console/network errors; fix and replay; update `TASK_INDEX.md`, `PROJECT_STATE.md`, `DECISION_LOG.md`, `RISK_REGISTER.md` and evidence. Commit tested work. Push and verify live Pages at stable checkpoints if remote/access is configured.

## Handoff
Record completed tasks, evidence paths, unresolved defects, performance, commit/push/Pages state and next phase. Do not mark the next phase active before this gate passes.
