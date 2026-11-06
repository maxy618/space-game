# PHASE 26 — Content expansion and long-session balance

**Status:** PENDING  
**Dependency:** Phase 25 exit gate must pass.

## Goal
Turn the implemented features into a coherent, replayable exploration game with meaningful variety and persistence.

## Expected result
Curated seed catalogue, balanced progression, reduced repetition and reliable long-session saves.

## Scope and working rules
Inspect the current code and relevant project docs before changing anything. This phase must be implemented in small runnable vertical slices. Research unresolved scientific/API/graphics questions in this phase rather than inventing answers. Use authoritative sources and a separate report when the research is substantial. Separate observed facts, inference, game abstraction and fiction. Keep future extensibility data-driven only where this phase creates a real content family.

## Ordered tasks

1. **P26-T01 — Repetition and content-gap audit** (`TASKS/PHASE_26/P26-T01_repetition-and-content-gap-audit.md`)
   - Focus: Play existing content and identify repeated terrain, empty systems, samey ships/fauna, meaningless discoveries and dead ends.
   - Completion result: Prioritized player-impact report proposes targeted additions only.

2. **P26-T02 — Curated showcase content** (`TASKS/PHASE_26/P26-T02_curated-showcase-content.md`)
   - Focus: Build fixed-seed systems/worlds with diverse stars, planets, oceans, weather, species, terrain and rare encounters.
   - Completion result: Catalogue states expected features and actual tested routes.

3. **P26-T03 — Economy/ship/upgrade balance** (`TASKS/PHASE_26/P26-T03_economy-ship-upgrade-balance.md`)
   - Focus: Test early/mid/late unlock paths, currency sinks, ship roles and equipment tradeoffs; remove dominant builds and grind.
   - Completion result: Multiple viable progression paths exist with data-tunable prices/rewards.

4. **P26-T04 — Long-session persistence and recovery** (`TASKS/PHASE_26/P26-T04_long-session-persistence-and-recovery.md`)
   - Focus: Test saving across systems, planets, rover, discoveries, currency, purchases, modules, settings and interrupted transitions.
   - Completion result: Close/reopen resumes same world/progression; migration/failure paths are documented.

## Exit gate — phase Definition of Done
Multiple distinct journeys are playable; progress survives reload; content systems reinforce one another rather than feel isolated.

Before closing: actively play the phase result in Playwright; inspect normal-size and close-up visuals; check console/network errors; fix and replay; update `TASK_INDEX.md`, `PROJECT_STATE.md`, `DECISION_LOG.md`, `RISK_REGISTER.md` and evidence. Commit tested work. Push and verify live Pages at stable checkpoints if remote/access is configured.

## Handoff
Record completed tasks, evidence paths, unresolved defects, performance, commit/push/Pages state and next phase. Do not mark the next phase active before this gate passes.
