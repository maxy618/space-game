# PHASE 11 — Astronomy catalogue and rare encounters

**Status:** PENDING  
**Dependency:** Phase 10 exit gate must pass.

## Goal
Add a scientifically honest range of astronomical classes and unusual encounters with clear gameplay identity.

## Expected result
Typed evidence-labeled catalogue and playable encounters integrated with seeded universe generation.

## Scope and working rules
Inspect the current code and relevant project docs before changing anything. This phase must be implemented in small runnable vertical slices. Research unresolved scientific/API/graphics questions in this phase rather than inventing answers. Use authoritative sources and a separate report when the research is substantial. Separate observed facts, inference, game abstraction and fiction. Keep future extensibility data-driven only where this phase creates a real content family.

## Ordered tasks

1. **P11-T01 — Taxonomy schema** (`TASKS/PHASE_11/P11-T01_taxonomy-schema.md`)
   - Focus: Define class/type/event/property axes, evidence state, units, uncertainty, sources and generation eligibility.
   - Completion result: Schema rejects unsupported “confirmed” claims and preserves unknowns.

2. **P11-T02 — Rare stars and compact objects research** (`TASKS/PHASE_11/P11-T02_rare-stars-and-compact-objects-research.md`)
   - Focus: Research remnants, pulsars, neutron stars, magnetars, black-hole populations and disputed candidates from authoritative sources.
   - Completion result: Cited data entries separate observed objects from candidate/hypothetical cases.

3. **P11-T03 — Transient and unusual phenomena** (`TASKS/PHASE_11/P11-T03_transient-and-unusual-phenomena.md`)
   - Focus: Research supernovae, flares, lensing, tidal disruptions and nebular events; distinguish transient events from persistent objects.
   - Completion result: Each implemented phenomenon has state/lifetime and evidence-backed presentation.

4. **P11-T04 — Playable encounters and encyclopedia** (`TASKS/PHASE_11/P11-T04_playable-encounters-and-encyclopedia.md`)
   - Focus: Implement unique observation/navigation/scan interaction with scientific-status explanations.
   - Completion result: Player can encounter each supported class; encyclopedia status is truthful and visible.

## Exit gate — phase Definition of Done
All entries trace to sources; candidate/hypothetical/fictional labels are correct and encounters can be found/inspected in-game.

Before closing: actively play the phase result in Playwright; inspect normal-size and close-up visuals; check console/network errors; fix and replay; update `TASK_INDEX.md`, `PROJECT_STATE.md`, `DECISION_LOG.md`, `RISK_REGISTER.md` and evidence. Commit tested work. Push and verify live Pages at stable checkpoints if remote/access is configured.

## Handoff
Record completed tasks, evidence paths, unresolved defects, performance, commit/push/Pages state and next phase. Do not mark the next phase active before this gate passes.
