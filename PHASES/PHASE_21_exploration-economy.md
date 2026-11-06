# PHASE 21 — Exploration, scanning and currency economy

**Status:** PENDING  
**Dependency:** Phase 20 exit gate must pass.

## Goal
Give exploration purpose and persistent rewards; discoveries earn the currency used for ships and equipment.

## Expected result
A balanced first-discovery economy, scanner/journal, persistent rewards and anti-duplication rules.

## Scope and working rules
Inspect the current code and relevant project docs before changing anything. This phase must be implemented in small runnable vertical slices. Research unresolved scientific/API/graphics questions in this phase rather than inventing answers. Use authoritative sources and a separate report when the research is substantial. Separate observed facts, inference, game abstraction and fiction. Keep future extensibility data-driven only where this phase creates a real content family.

## Ordered tasks

1. **P21-T01 — Discovery event taxonomy** (`TASKS/PHASE_21/P21-T01_discovery-event-taxonomy.md`)
   - Focus: Define first system/planet/biome/region/organism/geology/phenomenon events and stable keys, revisit rules and prerequisites.
   - Completion result: Events are auditable and do not duplicate after reload.

2. **P21-T02 — Currency model and pacing** (`TASKS/PHASE_21/P21-T02_currency-model-and-pacing.md`)
   - Focus: Design reward curves, early/mid/late progression, sinks and anti-farming around varied exploration activities.
   - Completion result: Reward/sink tables and example progression paths are tunable in data.

3. **P21-T03 — Scanner and discovery journal** (`TASKS/PHASE_21/P21-T03_scanner-and-discovery-journal.md`)
   - Focus: Implement in-world scan action, progress, first-discovery feedback, concise entries and evidence labels.
   - Completion result: Scanning is gameplay, records persist and feedback does not block piloting.

4. **P21-T04 — Persistence and exploit tests** (`TASKS/PHASE_21/P21-T04_persistence-and-exploit-tests.md`)
   - Focus: Connect stable IDs, save/versioning, wallet, discoveries and migrations; test duplicates/corruption/reloads.
   - Completion result: Rewards cannot be minted by repeating one scan; valid progression survives reload.

5. **P21-T05 — Exploration loop balancing** (`TASKS/PHASE_21/P21-T05_exploration-loop-balancing.md`)
   - Focus: Play multi-planet journey and measure discovery frequency, currency pace, motivation, clarity and purchase timing.
   - Completion result: Playable short/mid progression route and tuning report exist.

## Exit gate — phase Definition of Done
Player earns currency from new discoveries, reloads, revisits without duplicate rewards and buys a meaningful unlock.

Before closing: actively play the phase result in Playwright; inspect normal-size and close-up visuals; check console/network errors; fix and replay; update `TASK_INDEX.md`, `PROJECT_STATE.md`, `DECISION_LOG.md`, `RISK_REGISTER.md` and evidence. Commit tested work. Push and verify live Pages at stable checkpoints if remote/access is configured.

## Handoff
Record completed tasks, evidence paths, unresolved defects, performance, commit/push/Pages state and next phase. Do not mark the next phase active before this gate passes.
