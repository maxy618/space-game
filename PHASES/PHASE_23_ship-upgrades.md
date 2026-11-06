# PHASE 23 — Visible modular ship equipment and upgrades

**Status:** PENDING  
**Dependency:** Phase 22 exit gate must pass.

## Goal
Make upgrades real physical additions to the ship that visibly alter its structure and change gameplay.

## Expected result
Attachment anchors, original module art, compatibility rules, stat/ability effects, purchases and saved loadouts.

## Scope and working rules
Inspect the current code and relevant project docs before changing anything. This phase must be implemented in small runnable vertical slices. Research unresolved scientific/API/graphics questions in this phase rather than inventing answers. Use authoritative sources and a separate report when the research is substantial. Separate observed facts, inference, game abstraction and fiction. Keep future extensibility data-driven only where this phase creates a real content family.

## Ordered tasks

1. **P23-T01 — Attachment and compatibility model** (`TASKS/PHASE_23/P23-T01_attachment-and-compatibility-model.md`)
   - Focus: Define anchors, orientation, scale, z-order, module families, capacity, conflicts and hull exceptions in data.
   - Completion result: Current ships declare attachment layouts and invalid combinations are clearly rejected.

2. **P23-T02 — Visible module art and assembly** (`TASKS/PHASE_23/P23-T02_visible-module-art-and-assembly.md`)
   - Focus: Draw engines, thrusters, scanner hardware, cargo, protection/landing parts etc. as integrated animated geometry.
   - Completion result: Modules align through rotation/zoom and alter the hull silhouette at normal gameplay scale.

3. **P23-T03 — Real gameplay effects** (`TASKS/PHASE_23/P23-T03_real-gameplay-effects.md`)
   - Focus: Connect modules to thrust/efficiency, steering, hover, scan, cargo, environment tolerance or landing behavior; avoid fake stat tooltips.
   - Completion result: Each module has tests and observable in-play effects/trade-offs.

4. **P23-T04 — Economy and saved loadouts** (`TASKS/PHASE_23/P23-T04_economy-and-saved-loadouts.md`)
   - Focus: Integrate purchase/equip/remove/compare/save/load with progression currency and compatibility feedback.
   - Completion result: A bought/equipped configuration persists and can be tested in play.

5. **P23-T05 — Before/after customization audit** (`TASKS/PHASE_23/P23-T05_before-after-customization-audit.md`)
   - Focus: Fly identical routes with base and upgraded hulls; compare silhouette, behavior, economy and mobile rendering.
   - Completion result: Before/after evidence and compatibility matrix pass.

## Exit gate — phase Definition of Done
Every supported upgrade is visibly attached and produces measurable behavior; removal reverts behavior and saves persist.

Before closing: actively play the phase result in Playwright; inspect normal-size and close-up visuals; check console/network errors; fix and replay; update `TASK_INDEX.md`, `PROJECT_STATE.md`, `DECISION_LOG.md`, `RISK_REGISTER.md` and evidence. Commit tested work. Push and verify live Pages at stable checkpoints if remote/access is configured.

## Handoff
Record completed tasks, evidence paths, unresolved defects, performance, commit/push/Pages state and next phase. Do not mark the next phase active before this gate passes.
