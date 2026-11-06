# PHASE 01 — Project audit and safe foundation

**Status:** PENDING  
**Dependency:** No prior phase.

## Goal
Inspect the actual repository, preserve all existing work, verify licensing and tooling, and establish a reliable workflow.

## Expected result
A reproducible baseline, source/license ledger, task tracker, risk/decision logs and safe first checkpoint.

## Scope and working rules
Inspect the current code and relevant project docs before changing anything. This phase must be implemented in small runnable vertical slices. Research unresolved scientific/API/graphics questions in this phase rather than inventing answers. Use authoritative sources and a separate report when the research is substantial. Separate observed facts, inference, game abstraction and fiction. Keep future extensibility data-driven only where this phase creates a real content family.

## Ordered tasks

1. **P01-T01 — Repository inventory** (`TASKS/PHASE_01/P01-T01_repository-inventory.md`)
   - Focus: Map source, entry points, renderer, simulation, controls, persistence, scripts, tests, assets, docs, uncommitted work and open branches. Record exact paths and working/broken states.
   - Completion result: Inventory and baseline run record exist; no destructive cleanup.

2. **P01-T02 — Reference source and license audit** (`TASKS/PHASE_01/P01-T02_reference-source-and-license-audit.md`)
   - Focus: Run the Android Easter Egg/LAndroid reference, inspect the selected source revision, trace core modules, verify LICENSE/NOTICE/asset provenance and record reusable versus prohibited/unclear files.
   - Completion result: Source map includes URLs, revision, date, file paths and license obligations; unclear assets/code are not copied.

3. **P01-T03 — Toolchain verification** (`TASKS/PHASE_01/P01-T03_toolchain-verification.md`)
   - Focus: Verify Node/npm, JDK, Android SDK/build-tools, browser, Playwright and available emulator/device. Run current app and inspect console, network and runtime failures.
   - Completion result: Exact versions and commands are recorded from actual execution; no unsupported environment claims.

4. **P01-T04 — Project state and first checkpoint** (`TASKS/PHASE_01/P01-T04_project-state-and-first-checkpoint.md`)
   - Focus: Initialize task statuses, evidence folders, decision/risk logs, safe ignore rules and commit convention. Preserve local changes and secrets.
   - Completion result: All phases/tasks are indexed, local files excluded, and a safe baseline commit exists where Git is configured.

## Exit gate — phase Definition of Done
The existing project is inventoried and runnable or its exact blocker is documented; no user work was lost; source reuse is license-checked; baseline Git state is safe.

Before closing: actively play the phase result in Playwright; inspect normal-size and close-up visuals; check console/network errors; fix and replay; update `TASK_INDEX.md`, `PROJECT_STATE.md`, `DECISION_LOG.md`, `RISK_REGISTER.md` and evidence. Commit tested work. Push and verify live Pages at stable checkpoints if remote/access is configured.

## Handoff
Record completed tasks, evidence paths, unresolved defects, performance, commit/push/Pages state and next phase. Do not mark the next phase active before this gate passes.
