# PHASE 10 — Star-system navigation and jumps

**Status:** PENDING  
**Dependency:** Phase 09 exit gate must pass.

## Goal
Let players discover systems, choose destinations and travel through satisfying, readable transitions.

## Expected result
Functional system map, route validation, jump animation and arrival continuity.

## Scope and working rules
Inspect the current code and relevant project docs before changing anything. This phase must be implemented in small runnable vertical slices. Research unresolved scientific/API/graphics questions in this phase rather than inventing answers. Use authoritative sources and a separate report when the research is substantial. Separate observed facts, inference, game abstraction and fiction. Keep future extensibility data-driven only where this phase creates a real content family.

## Ordered tasks

1. **P10-T01 — System map UX** (`TASKS/PHASE_10/P10-T01_system-map-ux.md`)
   - Focus: Design a minimal navigation map with focus, discovered/unknown status, range and route cues.
   - Completion result: Map works at desktop and phone sizes with accessible targets.

2. **P10-T02 — Jump rules and route state** (`TASKS/PHASE_10/P10-T02_jump-rules-and-route-state.md`)
   - Focus: Research/design understandable range, resource or cooldown rules only where useful; define fail/cancel behavior.
   - Completion result: Route logic is deterministic; failed travel does not deduct resources.

3. **P10-T03 — Warp animation and arrival** (`TASKS/PHASE_10/P10-T03_warp-animation-and-arrival.md`)
   - Focus: Build parallax/speed/camera/audio sequence while preserving destination, ship and travel state.
   - Completion result: Repeated jumps do not duplicate ship, reset state or land in wrong system.

4. **P10-T04 — Navigation player route** (`TASKS/PHASE_10/P10-T04_navigation-player-route.md`)
   - Focus: Play selection, cancel, jump, arrival, exploration and return via keyboard/touch.
   - Completion result: A first-time tester can complete journey with evidence and no dead control.

## Exit gate — phase Definition of Done
Repeated multi-system journeys arrive at correct systems, preserve player state and remain playable on touch.

Before closing: actively play the phase result in Playwright; inspect normal-size and close-up visuals; check console/network errors; fix and replay; update `TASK_INDEX.md`, `PROJECT_STATE.md`, `DECISION_LOG.md`, `RISK_REGISTER.md` and evidence. Commit tested work. Push and verify live Pages at stable checkpoints if remote/access is configured.

## Handoff
Record completed tasks, evidence paths, unresolved defects, performance, commit/push/Pages state and next phase. Do not mark the next phase active before this gate passes.
