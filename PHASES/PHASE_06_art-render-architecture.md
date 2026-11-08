# PHASE 06 — Art direction and layered rendering architecture

**Status:** COMPLETE  
**Dependency:** Phase 05 exit gate must pass.

## Goal
Define a distinctive layered 2D visual identity and a renderer capable of rich depth without generic glossy 3D.

## Expected result
Art bible, render graph, material/LOD contracts, original icon grammar and reviewed visual prototype.

## Scope and working rules
Inspect the current code and relevant project docs before changing anything. This phase must be implemented in small runnable vertical slices. Research unresolved scientific/API/graphics questions in this phase rather than inventing answers. Use authoritative sources and a separate report when the research is substantial. Separate observed facts, inference, game abstraction and fiction. Keep future extensibility data-driven only where this phase creates a real content family.

## Ordered tasks

1. **P06-T01 — Art bible and reference board** (`TASKS/PHASE_06/P06-T01_art-bible-and-reference-board.md`)
   - Focus: Define silhouette, macro composition, palette, material language, line/edge treatment, animation rhythm and examples for space, surface, fauna, ships and UI.
   - Completion result: ART_DIRECTION.md includes lawful attributed references and explicit anti-goals.

2. **P06-T02 — Multi-layer render graph** (`TASKS/PHASE_06/P06-T02_multi-layer-render-graph.md`)
   - Focus: Design layers for backdrop, parallax, celestial bodies, local terrain, haze, clouds, ships, foreground, emissive, postFX and UI; define order/masks/coordinate space/resource owner.
   - Completion result: Layers are independently controllable with no accidental filter nesting or buffer loops.

3. **P06-T03 — LOD and material contracts** (`TASKS/PHASE_06/P06-T03_lod-and-material-contracts.md`)
   - Focus: Set projected-size thresholds for macro/regional/fine/micro detail, resolution policy, texture/noise budgets, shader precision and quality tiers.
   - Completion result: Each family has LOD and fallback; silhouette survives at phone scale.

4. **P06-T04 — Bespoke interface art** (`TASKS/PHASE_06/P06-T04_bespoke-interface-art.md`)
   - Focus: Draw original SVG/Pixi geometry icons with coherent shapes, negative space, stroke/fill and interaction states.
   - Completion result: No emoji, generic icon pack or placeholder icon ships as final art.

5. **P06-T05 — Visual prototype audit** (`TASKS/PHASE_06/P06-T05_visual-prototype-audit.md`)
   - Focus: Render representative assets via the real pipeline; inspect gameplay size and magnified crops; fix noise, blur, repetition, seams and hierarchy.
   - Completion result: Visual QA log and after-fix evidence exist; placeholders are not called final.

## Exit gate — phase Definition of Done
Representative star, ship, planet, nebula, surface and UI look authored at actual game scale and close crop; layer costs and purposes are documented.

Before closing: actively play the phase result in Playwright; inspect normal-size and close-up visuals; check console/network errors; fix and replay; update `TASK_INDEX.md`, `PROJECT_STATE.md`, `DECISION_LOG.md`, `RISK_REGISTER.md` and evidence. Commit tested work. Push and verify live Pages at stable checkpoints if remote/access is configured.

## Handoff
Record completed tasks, evidence paths, unresolved defects, performance, commit/push/Pages state and next phase. Do not mark the next phase active before this gate passes.

