# PHASE 15 — Atmospheric flight physics and handling

**Status:** PENDING  
**Dependency:** Phase 14 exit gate must pass.

## Goal
Make atmospheric flight a distinctive piloting mechanic with environment- and ship-dependent behavior.

## Expected result
Researched 2D flight model, flight modes, recovery and tuning matrix.

## Scope and working rules
Inspect the current code and relevant project docs before changing anything. This phase must be implemented in small runnable vertical slices. Research unresolved scientific/API/graphics questions in this phase rather than inventing answers. Use authoritative sources and a separate report when the research is substantial. Separate observed facts, inference, game abstraction and fiction. Keep future extensibility data-driven only where this phase creates a real content family.

## Ordered tasks

1. **P15-T01 — Flight-model research** (`TASKS/PHASE_15/P15-T01_flight-model-research.md`)
   - Focus: Compare real flight principles and 2D game models for gravity, density, thrust, lift/drag inspiration, wind, turbulence, hover and stabilization.
   - Completion result: Report cites sources, units, alternatives, assumptions and chosen model.

2. **P15-T02 — Core simulation** (`TASKS/PHASE_15/P15-T02_core-simulation.md`)
   - Focus: Implement deterministic frame-rate-independent flight with centralized parameters and testable state update.
   - Completion result: Physics tests cover edge cases, stability and frame-rate independence.

3. **P15-T03 — Flight modes and recovery** (`TASKS/PHASE_15/P15-T03_flight-modes-and-recovery.md`)
   - Focus: Implement climb/descent, brake, hover/VTOL where supported, unstable approach recovery and space exit.
   - Completion result: Player can deliberately control altitude/speed and recover.

4. **P15-T04 — Environment/ship matrix** (`TASKS/PHASE_15/P15-T04_environment-ship-matrix.md`)
   - Focus: Tune and playtest representative atmospheres, gravity/wind, ship classes and visible modules.
   - Completion result: Measured matrix demonstrates fair and meaningful differences.

## Exit gate — phase Definition of Done
Same manoeuvre responds meaningfully to different atmospheres and ship configurations; flight is controllable and recoverable.

Before closing: actively play the phase result in Playwright; inspect normal-size and close-up visuals; check console/network errors; fix and replay; update `TASK_INDEX.md`, `PROJECT_STATE.md`, `DECISION_LOG.md`, `RISK_REGISTER.md` and evidence. Commit tested work. Push and verify live Pages at stable checkpoints if remote/access is configured.

## Handoff
Record completed tasks, evidence paths, unresolved defects, performance, commit/push/Pages state and next phase. Do not mark the next phase active before this gate passes.
