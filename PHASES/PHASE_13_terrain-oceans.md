# PHASE 13 — Geology, terrain and enormous oceans

**Status:** PENDING  
**Dependency:** Phase 12 exit gate must pass.

## Goal
Build continuous streamed side-view surfaces with striking geological forms and long-distance ocean exploration.

## Expected result
Terrain/shore/ocean representation with coherent material families, collision and seamless chunks.

## Scope and working rules
Inspect the current code and relevant project docs before changing anything. This phase must be implemented in small runnable vertical slices. Research unresolved scientific/API/graphics questions in this phase rather than inventing answers. Use authoritative sources and a separate report when the research is substantial. Separate observed facts, inference, game abstraction and fiction. Keep future extensibility data-driven only where this phase creates a real content family.

## Ordered tasks

1. **P13-T01 — Terrain data and chunk system** (`TASKS/PHASE_13/P13-T01_terrain-data-and-chunk-system.md`)
   - Focus: Select a 2D terrain representation; define coordinates, boundaries, collision source, streaming and async generation.
   - Completion result: Rendered and collidable surface share data; generation is order-independent.

2. **P13-T02 — Geological macroforms** (`TASKS/PHASE_13/P13-T02_geological-macroforms.md`)
   - Focus: Build dunes, mountains, cliffs, canyons, craters, volcanoes, glaciers, ice shelves and salt flats with unique silhouettes.
   - Completion result: Each type has distinct large form, regional variation and close detail.

3. **P13-T03 — Ocean, coast and archipelago** (`TASKS/PHASE_13/P13-T03_ocean-coast-and-archipelago.md`)
   - Focus: Build large basins, islands, shores, ice edges, wave hierarchy, reflections and horizon continuity.
   - Completion result: Oceans feel vast; coastline and water level remain continuous across chunks.

4. **P13-T04 — Surface materials and lighting** (`TASKS/PHASE_13/P13-T04_surface-materials-and-lighting.md`)
   - Focus: Create layered rock/ice/sand/soil/water materials with erosion, fractures, vegetation anchors and light response.
   - Completion result: Close crops remain authored and visually coherent; no noisy texture wallpaper.

5. **P13-T05 — Terrain gameplay QA** (`TASKS/PHASE_13/P13-T05_terrain-gameplay-qa.md`)
   - Focus: Play through chunk boundaries, slopes, cliffs, water edges and varied speeds using ship/rover when available.
   - Completion result: No invisible walls, seams, falling through terrain or camera mismatch.

## Exit gate — phase Definition of Done
Player flies/drives across multiple landforms and huge water regions without seams, collision mismatch or obvious tile repetition.

Before closing: actively play the phase result in Playwright; inspect normal-size and close-up visuals; check console/network errors; fix and replay; update `TASK_INDEX.md`, `PROJECT_STATE.md`, `DECISION_LOG.md`, `RISK_REGISTER.md` and evidence. Commit tested work. Push and verify live Pages at stable checkpoints if remote/access is configured.

## Handoff
Record completed tasks, evidence paths, unresolved defects, performance, commit/push/Pages state and next phase. Do not mark the next phase active before this gate passes.
