# PHASE 17 — Weather, hazards and screen-reactive effects

**Status:** PENDING  
**Dependency:** Phase 16 exit gate must pass.

## Goal
Create coherent weather that changes visuals, sound, flight, visibility, landing and screen distortion.

## Expected result
Weather fronts and distinct effects for storms, dust, snow, fog, lightning, ash, heat and oceans.

## Scope and working rules
Inspect the current code and relevant project docs before changing anything. This phase must be implemented in small runnable vertical slices. Research unresolved scientific/API/graphics questions in this phase rather than inventing answers. Use authoritative sources and a separate report when the research is substantial. Separate observed facts, inference, game abstraction and fiction. Keep future extensibility data-driven only where this phase creates a real content family.

## Ordered tasks

1. **P17-T01 — Weather fields and fronts** (`TASKS/PHASE_17/P17-T01_weather-fields-and-fronts.md`)
   - Focus: Define world-space direction, speed, intensity, density, duration and planet prerequisites; separate climate, regional weather and transient events.
   - Completion result: Weather is stable across chunks and not random flicker per frame.

2. **P17-T02 — Weather visuals and audio** (`TASKS/PHASE_17/P17-T02_weather-visuals-and-audio.md`)
   - Focus: Build recognizable dust/sandstorm, blizzard, fog, precipitation, lightning, ash and ocean-storm layers and sound states.
   - Completion result: Each has identity beyond a tinted overlay and clean state transitions.

3. **P17-T03 — Gameplay consequences** (`TASKS/PHASE_17/P17-T03_gameplay-consequences.md`)
   - Focus: Connect conditions to flight handling, visibility, rover traction, landing readiness and scan reliability, with readable warnings.
   - Completion result: Tests show understandable effects and player can anticipate/recover.

4. **P17-T04 — Contextual screen profiles** (`TASKS/PHASE_17/P17-T04_contextual-screen-profiles.md`)
   - Focus: Use masks/intensity curves for dust veiling, snow/ice, heat shimmer, lightning exposure, water drops, fog and turbulence; respect reduced motion.
   - Completion result: Effects react to region/intensity and restore completely after leaving.

5. **P17-T05 — Weather gameplay route** (`TASKS/PHASE_17/P17-T05_weather-gameplay-route.md`)
   - Focus: Play calm→storm→clear sequences while flying, driving and landing on supported worlds; test low quality/reduced motion.
   - Completion result: Evidence includes weather state, input, visual effect and gameplay impact.

## Exit gate — phase Definition of Done
Weather is spatially consistent and changes gameplay; filters blend in/out cleanly and never obscure critical controls.

Before closing: actively play the phase result in Playwright; inspect normal-size and close-up visuals; check console/network errors; fix and replay; update `TASK_INDEX.md`, `PROJECT_STATE.md`, `DECISION_LOG.md`, `RISK_REGISTER.md` and evidence. Commit tested work. Push and verify live Pages at stable checkpoints if remote/access is configured.

## Handoff
Record completed tasks, evidence paths, unresolved defects, performance, commit/push/Pages state and next phase. Do not mark the next phase active before this gate passes.
