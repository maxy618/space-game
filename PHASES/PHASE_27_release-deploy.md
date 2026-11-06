# PHASE 27 — Full QA, release and GitHub Pages deployment

**Status:** PENDING  
**Dependency:** Phase 26 exit gate must pass.

## Goal
Deliver a stable, beautiful, genuinely playable release with verified commits, pushes, automated CI and live GitHub Pages.

## Expected result
Release candidate, full player QA matrix, visual audit, GitHub Actions and live Pages evidence.

## Scope and working rules
Inspect the current code and relevant project docs before changing anything. This phase must be implemented in small runnable vertical slices. Research unresolved scientific/API/graphics questions in this phase rather than inventing answers. Use authoritative sources and a separate report when the research is substantial. Separate observed facts, inference, game abstraction and fiction. Keep future extensibility data-driven only where this phase creates a real content family.

## Ordered tasks

1. **P27-T01 — Full playthrough matrix** (`TASKS/PHASE_27/P27-T01_full-playthrough-matrix.md`)
   - Focus: Play system travel, objects, atmospheric entry, flight, storms, surface, landing, rover, discoveries, ecosystems, ships and upgrades; test reload/repeat transitions.
   - Completion result: Every major journey has route/input/device evidence and defects listed.

2. **P27-T02 — Visual close-inspection polish** (`TASKS/PHASE_27/P27-T02_visual-close-inspection-polish.md`)
   - Focus: Inspect all layers/icons/shaders/terrain/ocean/creatures/UI at gameplay scale and magnified crops; fix highest-impact defects and replay.
   - Completion result: No P0/P1 visual defect remains; lower risks tracked with evidence.

3. **P27-T03 — GitHub Actions Pages pipeline** (`TASKS/PHASE_27/P27-T03_github-actions-pages-pipeline.md`)
   - Focus: Set up CI install/test/build/deploy, correct Vite base path, Pages permissions and secret-safe workflow.
   - Completion result: Green Actions run and live URL loads exact commit assets/routes.

4. **P27-T04 — Commit, push and live smoke-play** (`TASKS/PHASE_27/P27-T04_commit-push-and-live-smoke-play.md`)
   - Focus: Review diff/secrets/tests, commit and push to intended branch; inspect actual workflow and open live URL; Playwright smoke-play it.
   - Completion result: Push and deploy SHAs match; live game responds to input; no force push or secrets.

5. **P27-T05 — Release handoff** (`TASKS/PHASE_27/P27-T05_release-handoff.md`)
   - Focus: Document notes, known limits, tests and devices actually covered, fresh-clone build/deploy steps, current state and next roadmap.
   - Completion result: Handoff distinguishes completed, partially verified and untested behavior.

## Exit gate — phase Definition of Done
Fresh clone builds/tests; critical journeys pass; Actions deploy is green; live Pages URL serves and can be actively played.

Before closing: actively play the phase result in Playwright; inspect normal-size and close-up visuals; check console/network errors; fix and replay; update `TASK_INDEX.md`, `PROJECT_STATE.md`, `DECISION_LOG.md`, `RISK_REGISTER.md` and evidence. Commit tested work. Push and verify live Pages at stable checkpoints if remote/access is configured.

## Handoff
Record completed tasks, evidence paths, unresolved defects, performance, commit/push/Pages state and next phase. Do not mark the next phase active before this gate passes.
