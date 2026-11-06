# PHASE 08 — Ray-marching, optics and contextual screen filters

**Status:** PENDING  
**Dependency:** Phase 07 exit gate must pass.

## Goal
Implement spectacular optical effects and many screen-layer effects without false hardware-RT claims or constant filter spam.

## Expected result
Measured post-processing graph with selective lensing, distortion, scattering/reflection approximations, contextual profiles and quality tiers.

## Scope and working rules
Inspect the current code and relevant project docs before changing anything. This phase must be implemented in small runnable vertical slices. Research unresolved scientific/API/graphics questions in this phase rather than inventing answers. Use authoritative sources and a separate report when the research is substantial. Separate observed facts, inference, game abstraction and fiction. Keep future extensibility data-driven only where this phase creates a real content family.

## Ordered tasks

1. **P08-T01 — Technique research and proof scenes** (`TASKS/PHASE_08/P08-T01_technique-research-and-proof-scenes.md`)
   - Focus: Compare GLSL ES/WebGL-compatible ray marching, SDF, screen-space methods, analytic shading, lensing, scattering, shadows and reflections. Verify renderer limitations and benchmark prototypes.
   - Completion result: Report honestly distinguishes hardware RT/path tracing from software approximations and includes proof measurements.

2. **P08-T02 — PostFX compositor** (`TASKS/PHASE_08/P08-T02_postfx-compositor.md`)
   - Focus: Build explicit pass graph with ordering, masks, render targets, resolution scale, color space, cleanup and resize handling.
   - Completion result: Effects are independently enabled and no framebuffer feedback/resource leak exists.

3. **P08-T03 — Optics and light cues** (`TASKS/PHASE_08/P08-T03_optics-and-light-cues.md`)
   - Focus: Implement selected lensing, warp distortion, atmospheric refraction, heat shimmer, selective reflection/shadows and emissive scattering with bounded samples.
   - Completion result: Effects stay localized/readable and have stable temporal behavior.

4. **P08-T04 — Contextual full-screen profiles** (`TASKS/PHASE_08/P08-T04_contextual-full-screen-profiles.md`)
   - Focus: Create profiles for warp, black hole, atmosphere entry, sandstorm, blizzard, lightning, nebula, ocean storm and landing impact; define blend curves and exit conditions.
   - Completion result: Screen changes only when event/region warrants it and restores perfectly after exit.

5. **P08-T05 — Performance and visual validation** (`TASKS/PHASE_08/P08-T05_performance-and-visual-validation.md`)
   - Focus: Profile frame time, render targets, memory and samples at tiers; test resize, repeat triggers and reduced motion; fix artifacts.
   - Completion result: Each effect has evidence, cost and graceful fallback; no unsupported Android performance claim.

## Exit gate — phase Definition of Done
At least two signature effects trigger in gameplay; event profiles cleanly enter/exit; low-tier/reduced-motion modes work.

Before closing: actively play the phase result in Playwright; inspect normal-size and close-up visuals; check console/network errors; fix and replay; update `TASK_INDEX.md`, `PROJECT_STATE.md`, `DECISION_LOG.md`, `RISK_REGISTER.md` and evidence. Commit tested work. Push and verify live Pages at stable checkpoints if remote/access is configured.

## Handoff
Record completed tasks, evidence paths, unresolved defects, performance, commit/push/Pages state and next phase. Do not mark the next phase active before this gate passes.
