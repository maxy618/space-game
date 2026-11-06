# PHASE 16 — Planet surface atmosphere and visual environments

**Status:** PENDING  
**Dependency:** Phase 15 exit gate must pass.

## Goal
Make sky, haze, cloud, terrain and ocean scenes visually rich, layered and unmistakably different by world family.

## Expected result
A family-based local planetary renderer with distinctive atmospheric depth, lighting and material response.

## Scope and working rules
Inspect the current code and relevant project docs before changing anything. This phase must be implemented in small runnable vertical slices. Research unresolved scientific/API/graphics questions in this phase rather than inventing answers. Use authoritative sources and a separate report when the research is substantial. Separate observed facts, inference, game abstraction and fiction. Keep future extensibility data-driven only where this phase creates a real content family.

## Ordered tasks

1. **P16-T01 — Sky and atmosphere profiles** (`TASKS/PHASE_16/P16-T01_sky-and-atmosphere-profiles.md`)
   - Focus: Build planet-driven sky, horizon, haze, scattering approximation, day/night and stellar lighting profiles.
   - Completion result: Profiles are data-driven and unique; no simple same-sky hue swap.

2. **P16-T02 — Cloud decks and depth layers** (`TASKS/PHASE_16/P16-T02_cloud-decks-and-depth-layers.md`)
   - Focus: Create coherent cloud decks, shadows, gaps, parallax and traversable cloud crossing with bounded cost.
   - Completion result: Clouds have spatial identity and do not pop or become noisy fullscreen overlays.

3. **P16-T03 — Surface lighting and material response** (`TASKS/PHASE_16/P16-T03_surface-lighting-and-material-response.md`)
   - Focus: Integrate light/shadow for terrain, ship, ice, vegetation and water using suitable 2D/shader methods.
   - Completion result: Lighting stays coherent through movement; cost measured by quality tier.

4. **P16-T04 — Curated world scenes** (`TASKS/PHASE_16/P16-T04_curated-world-scenes.md`)
   - Focus: Compose sky/cloud/ocean/terrain/starlight combinations for varied climates and distinct visual identity.
   - Completion result: At least six showcase environments can be reached by fixed seeds in gameplay.

5. **P16-T05 — Close-up and low-tier audit** (`TASKS/PHASE_16/P16-T05_close-up-and-low-tier-audit.md`)
   - Focus: Inspect normal phone-size scene and zoomed crops; fix aliasing, shimmer, pattern repetition, layer seams and bad fallbacks.
   - Completion result: P0/P1 visual defects fixed; low tier preserves silhouettes and readability.

## Exit gate — phase Definition of Done
Several planet families are immediately distinguishable in actual flight and remain coherent during movement/zoom/weather.

Before closing: actively play the phase result in Playwright; inspect normal-size and close-up visuals; check console/network errors; fix and replay; update `TASK_INDEX.md`, `PROJECT_STATE.md`, `DECISION_LOG.md`, `RISK_REGISTER.md` and evidence. Commit tested work. Push and verify live Pages at stable checkpoints if remote/access is configured.

## Handoff
Record completed tasks, evidence paths, unresolved defects, performance, commit/push/Pages state and next phase. Do not mark the next phase active before this gate passes.
