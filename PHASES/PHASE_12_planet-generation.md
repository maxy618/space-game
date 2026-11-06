# PHASE 12 — Planet generation and climate identity

**Status:** PENDING  
**Dependency:** Phase 11 exit gate must pass.

## Goal
Generate coherent planets whose climate, geography and local environments arise from a connected set of world parameters.

## Expected result
Deterministic planet pipeline with climate regions and stable biome identity.

## Scope and working rules
Inspect the current code and relevant project docs before changing anything. This phase must be implemented in small runnable vertical slices. Research unresolved scientific/API/graphics questions in this phase rather than inventing answers. Use authoritative sources and a separate report when the research is substantial. Separate observed facts, inference, game abstraction and fiction. Keep future extensibility data-driven only where this phase creates a real content family.

## Ordered tasks

1. **P12-T01 — Planet model and parameters** (`TASKS/PHASE_12/P12-T01_planet-model-and-parameters.md`)
   - Focus: Define gravity, size, rotation, atmosphere, pressure/composition, volatiles, water/ice, geology, star and orbit, with units/uncertainty.
   - Completion result: Typed parameters validate; synthetic/estimated/unknown values are distinguished.

2. **P12-T02 — Climate research and game model** (`TASKS/PHASE_12/P12-T02_climate-research-and-game-model.md`)
   - Focus: Research combined climate drivers and compare models; distinguish supported science from gameplay simplification.
   - Completion result: Report cites sources and describes interactions, limits and assumptions.

3. **P12-T03 — Climate and biome field generation** (`TASKS/PHASE_12/P12-T03_climate-and-biome-field-generation.md`)
   - Focus: Generate coherent region maps, bands, water distribution and biome transitions from planetary identity.
   - Completion result: Biome placement depends on world parameters, not random tile-by-tile selection.

4. **P12-T04 — Stable regional seeds and saves** (`TASKS/PHASE_12/P12-T04_stable-regional-seeds-and-saves.md`)
   - Focus: Derive child seeds for regions, terrain, organisms and weather; keep player edits separate.
   - Completion result: Chunk order/save-load do not alter generated base world.

5. **P12-T05 — Seed showcase and validation** (`TASKS/PHASE_12/P12-T05_seed-showcase-and-validation.md`)
   - Focus: Create curated desert/ice/ocean/volcanic/temperate/airless worlds and inspect approach routes.
   - Completion result: Showcase seeds are documented and visibly distinct, with QA evidence.

## Exit gate — phase Definition of Done
Same planet seed reproduces the same regions; different planet families are visibly and environmentally distinct.

Before closing: actively play the phase result in Playwright; inspect normal-size and close-up visuals; check console/network errors; fix and replay; update `TASK_INDEX.md`, `PROJECT_STATE.md`, `DECISION_LOG.md`, `RISK_REGISTER.md` and evidence. Commit tested work. Push and verify live Pages at stable checkpoints if remote/access is configured.

## Handoff
Record completed tasks, evidence paths, unresolved defects, performance, commit/push/Pages state and next phase. Do not mark the next phase active before this gate passes.
