# PHASE 07 — Signature celestial visuals

**Status:** PENDING  
**Dependency:** Phase 06 exit gate must pass.

## Goal
Create memorable layered visual families for stars, planets, rings, asteroids, nebulae and black holes.

## Expected result
A coherent in-game visual library with distinct silhouettes, materials, light, animation and distance/close LOD.

## Scope and working rules
Inspect the current code and relevant project docs before changing anything. This phase must be implemented in small runnable vertical slices. Research unresolved scientific/API/graphics questions in this phase rather than inventing answers. Use authoritative sources and a separate report when the research is substantial. Separate observed facts, inference, game abstraction and fiction. Keep future extensibility data-driven only where this phase creates a real content family.

## Ordered tasks

1. **P07-T01 — Stars and luminous events** (`TASKS/PHASE_07/P07-T01_stars-and-luminous-events.md`)
   - Focus: Build distinct star types and activity states using core/surface structure, corona, flares and restrained emissive layers—not just hue-shifted gradients.
   - Completion result: Multiple stars read as different families at gameplay size.

2. **P07-T02 — Planets, moons and rings** (`TASKS/PHASE_07/P07-T02_planets-moons-and-rings.md`)
   - Focus: Build layered planet discs with regional structure, terminator, atmosphere, clouds and optional rings/moons; avoid plastic glossy spheres.
   - Completion result: Planet families are recognizable from orbit and stable at zoom changes.

3. **P07-T03 — Nebulae, dust and debris** (`TASKS/PHASE_07/P07-T03_nebulae-dust-and-debris.md`)
   - Focus: Create coherent nebula macroforms, dust lanes, asteroid fields and comets using spatial fields and bounded particles.
   - Completion result: Large forms are readable; density and motion have LOD budgets.

4. **P07-T04 — Black-hole encounter** (`TASKS/PHASE_07/P07-T04_black-hole-encounter.md`)
   - Focus: Build an art-directed event-horizon silhouette, layered accretion disc and gravitational-lensing-inspired distortion; clearly identify approximations.
   - Completion result: Playable memorable encounter with masks/fallbacks and honest scientific wording.

5. **P07-T05 — Integration gallery** (`TASKS/PHASE_07/P07-T05_integration-gallery.md`)
   - Focus: Place assets in seeded systems and actively fly/zoom around them; inspect visual hierarchy and update defect log.
   - Completion result: Every supported family is available in gameplay with test seeds/evidence.

## Exit gate — phase Definition of Done
Players can encounter and inspect each family in actual play; all have close-up and normal-size evidence.

Before closing: actively play the phase result in Playwright; inspect normal-size and close-up visuals; check console/network errors; fix and replay; update `TASK_INDEX.md`, `PROJECT_STATE.md`, `DECISION_LOG.md`, `RISK_REGISTER.md` and evidence. Commit tested work. Push and verify live Pages at stable checkpoints if remote/access is configured.

## Handoff
Record completed tasks, evidence paths, unresolved defects, performance, commit/push/Pages state and next phase. Do not mark the next phase active before this gate passes.
