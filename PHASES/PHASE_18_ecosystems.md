# PHASE 18 — Flora, fauna and living ecosystems

**Status:** PENDING  
**Dependency:** Phase 17 exit gate must pass.

## Goal
Create beautiful, strange, unsettling and compelling procedural life with actual behaviors and ecological context.

## Expected result
Stable species catalogue, bespoke organism visuals, habitat logic, animation, observation and discovery.

## Scope and working rules
Inspect the current code and relevant project docs before changing anything. This phase must be implemented in small runnable vertical slices. Research unresolved scientific/API/graphics questions in this phase rather than inventing answers. Use authoritative sources and a separate report when the research is substantial. Separate observed facts, inference, game abstraction and fiction. Keep future extensibility data-driven only where this phase creates a real content family.

## Ordered tasks

1. **P18-T01 — Ecology model and research** (`TASKS/PHASE_18/P18-T01_ecology-model-and-research.md`)
   - Focus: Define species traits, niches, habitat conditions, populations, activity cycles and behavior states; research ecology/astrobiology while marking alien life fictional.
   - Completion result: Report/data schema documents habitat logic and uncertainty.

2. **P18-T02 — Visual taxonomy and creature art** (`TASKS/PHASE_18/P18-T02_visual-taxonomy-and-creature-art.md`)
   - Focus: Create varied body plans, scale, silhouette, appendages, surface patterns, translucency/bioluminescence, camouflage and eerie/beautiful forms.
   - Completion result: Starter species have distinct silhouettes and close-up quality, not recolored clones.

3. **P18-T03 — Behavior and animation** (`TASKS/PHASE_18/P18-T03_behavior-and-animation.md`)
   - Focus: Implement roaming, hovering, burrowing, clustering, feeding, migration, retreat, curiosity or display states reacting to environment/proximity.
   - Completion result: Organisms move believably, are deterministic enough to test and do not clip/freeze.

4. **P18-T04 — Plants and habitat composition** (`TASKS/PHASE_18/P18-T04_plants-and-habitat-composition.md`)
   - Focus: Build plant/fungal/coral-like families and spatial patterns tied to climate, soil, water/light/weather and ecosystem niches.
   - Completion result: Habitats form coherent compositions; region changes alter ecology visibly.

5. **P18-T05 — Observation/scanning playtest** (`TASKS/PHASE_18/P18-T05_observation-scanning-playtest.md`)
   - Focus: Play encounters, approach/observe/scan/discover, leave and revisit the same seed; review beauty, eeriness and readability.
   - Completion result: Species journal and stable world encounters work; no menu-only creatures.

## Exit gate — phase Definition of Done
Players can encounter, observe, scan and revisit distinctive species; they react to the world/player rather than sit as decoration.

Before closing: actively play the phase result in Playwright; inspect normal-size and close-up visuals; check console/network errors; fix and replay; update `TASK_INDEX.md`, `PROJECT_STATE.md`, `DECISION_LOG.md`, `RISK_REGISTER.md` and evidence. Commit tested work. Push and verify live Pages at stable checkpoints if remote/access is configured.

## Handoff
Record completed tasks, evidence paths, unresolved defects, performance, commit/push/Pages state and next phase. Do not mark the next phase active before this gate passes.
