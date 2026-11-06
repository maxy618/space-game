# PHASE 19 — Skillful landing and takeoff

**Status:** PENDING  
**Dependency:** Phase 18 exit gate must pass.

## Goal
Make landing a meaningful piloting interaction affected by terrain, weather, ship capability and approach quality.

## Expected result
A continuous approach/touchdown/takeoff loop connected to rover deployment and space exit.

## Scope and working rules
Inspect the current code and relevant project docs before changing anything. This phase must be implemented in small runnable vertical slices. Research unresolved scientific/API/graphics questions in this phase rather than inventing answers. Use authoritative sources and a separate report when the research is substantial. Separate observed facts, inference, game abstraction and fiction. Keep future extensibility data-driven only where this phase creates a real content family.

## Ordered tasks

1. **P19-T01 — Site suitability and landing readiness** (`TASKS/PHASE_19/P19-T01_site-suitability-and-landing-readiness.md`)
   - Focus: Use slope, roughness, obstacles, surface material, wind/weather, ship stats and stability to decide site/readiness.
   - Completion result: Readiness derives from actual world state and is repeatable.

2. **P19-T02 — Approach and touchdown** (`TASKS/PHASE_19/P19-T02_approach-and-touchdown.md`)
   - Focus: Implement controlled alignment/descent, stabilization, touchdown timing/animation and recoverable failed approaches.
   - Completion result: Landing is piloted, preserves local coordinates and never teleports.

3. **P19-T03 — Takeoff constraints and feedback** (`TASKS/PHASE_19/P19-T03_takeoff-constraints-and-feedback.md`)
   - Focus: Implement launch/thrust/clearance with environmental/ship capability; explain unsupported sites.
   - Completion result: Supported ships can take off; failures do not softlock.

4. **P19-T04 — Integrated landing-to-rover route** (`TASKS/PHASE_19/P19-T04_integrated-landing-to-rover-route.md`)
   - Focus: Play entry→flight→site selection→landing→rover→return→takeoff→space repeatedly in varied conditions.
   - Completion result: Continuous recorded route proves state and control continuity.

## Exit gate — phase Definition of Done
Player chooses a site, controls descent, lands at the exact approach location, deploys rover, relaunches and recovers from bad approaches.

Before closing: actively play the phase result in Playwright; inspect normal-size and close-up visuals; check console/network errors; fix and replay; update `TASK_INDEX.md`, `PROJECT_STATE.md`, `DECISION_LOG.md`, `RISK_REGISTER.md` and evidence. Commit tested work. Push and verify live Pages at stable checkpoints if remote/access is configured.

## Handoff
Record completed tasks, evidence paths, unresolved defects, performance, commit/push/Pages state and next phase. Do not mark the next phase active before this gate passes.
