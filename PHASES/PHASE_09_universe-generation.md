# PHASE 09 — Universe, galaxies and deterministic systems

**Status:** PENDING  
**Dependency:** Phase 08 exit gate must pass.

## Goal
Build a persistent procedurally generated universe with stable identity and efficient streaming.

## Expected result
Hierarchical galaxy/sector/system/body generation, stable seeds/IDs and separate player-save data.

## Scope and working rules
Inspect the current code and relevant project docs before changing anything. This phase must be implemented in small runnable vertical slices. Research unresolved scientific/API/graphics questions in this phase rather than inventing answers. Use authoritative sources and a separate report when the research is substantial. Separate observed facts, inference, game abstraction and fiction. Keep future extensibility data-driven only where this phase creates a real content family.

## Ordered tasks

1. **P09-T01 — Hierarchy and coordinate model** (`TASKS/PHASE_09/P09-T01_hierarchy-and-coordinate-model.md`)
   - Focus: Define galaxy/region/sector/system/body/feature levels, identifiers, units and game-scale compression.
   - Completion result: Hierarchy and transforms documented; IDs stable and independent of array order.

2. **P09-T02 — Galaxy and region fields** (`TASKS/PHASE_09/P09-T02_galaxy-and-region-fields.md`)
   - Focus: Generate structured system distributions, sparse/dense regions and rare zones using deterministic spatial fields.
   - Completion result: Repeated seed stable; sampling a region does not generate the entire universe.

3. **P09-T03 — Star system generator** (`TASKS/PHASE_09/P09-T03_star-system-generator.md`)
   - Focus: Generate stars, multiplicity, orbital relationships, planets/moons and parameters using researched constraints and labeled abstractions.
   - Completion result: Generated systems pass relational/range validation.

4. **P09-T04 — Streaming and persistence** (`TASKS/PHASE_09/P09-T04_streaming-and-persistence.md`)
   - Focus: Separate immutable seeded worlds from discoveries/player changes; add caching, versioning, save/load and order-independent requests.
   - Completion result: Reload and different generation order preserve identity and state.

## Exit gate — phase Definition of Done
Same seed/revisit produces the same world; chunk/order changes do not alter generated results; streaming stays bounded.

Before closing: actively play the phase result in Playwright; inspect normal-size and close-up visuals; check console/network errors; fix and replay; update `TASK_INDEX.md`, `PROJECT_STATE.md`, `DECISION_LOG.md`, `RISK_REGISTER.md` and evidence. Commit tested work. Push and verify live Pages at stable checkpoints if remote/access is configured.

## Handoff
Record completed tasks, evidence paths, unresolved defects, performance, commit/push/Pages state and next phase. Do not mark the next phase active before this gate passes.
