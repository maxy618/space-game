# PHASE 05 — Space camera, scale and navigation feel

**Status:** PENDING  
**Dependency:** Phase 04 exit gate must pass.

## Goal
Make camera movement communicate scale and speed without disorienting the player.

## Expected result
Stable coordinate contract, follow/zoom, parallax and event-based camera feedback.

## Scope and working rules
Inspect the current code and relevant project docs before changing anything. This phase must be implemented in small runnable vertical slices. Research unresolved scientific/API/graphics questions in this phase rather than inventing answers. Use authoritative sources and a separate report when the research is substantial. Separate observed facts, inference, game abstraction and fiction. Keep future extensibility data-driven only where this phase creates a real content family.

## Ordered tasks

1. **P05-T01 — Coordinate spaces** (`TASKS/PHASE_05/P05-T01_coordinate-spaces.md`)
   - Focus: Specify world/system/ship/camera/screen/UI coordinates and transforms; separate camera interpolation from physics coordinates.
   - Completion result: Transforms and restore behavior have tests.

2. **P05-T02 — Follow, zoom and framing** (`TASKS/PHASE_05/P05-T02_follow-zoom-and-framing.md`)
   - Focus: Implement responsive follow, speed-aware framing, bounded zoom, easing and close-pass handling.
   - Completion result: Player and critical objects remain readable without jitter.

3. **P05-T03 — Parallax depth layers** (`TASKS/PHASE_05/P05-T03_parallax-depth-layers.md`)
   - Focus: Create distant/nearby/foreground layers with correct coordinate scaling and consistent motion.
   - Completion result: Depth is legible while system geometry remains coherent at varied zoom.

4. **P05-T04 — Camera feedback** (`TASKS/PHASE_05/P05-T04_camera-feedback.md`)
   - Focus: Add short event-driven shake/drift/zoom pulses and reduced-motion behavior; test warp, resize and pause.
   - Completion result: Effects terminate cleanly and do not obscure controls.

## Exit gate — phase Definition of Done
No camera jumps, orientation loss, jitter or unreadable zoom remains across viewports.

Before closing: actively play the phase result in Playwright; inspect normal-size and close-up visuals; check console/network errors; fix and replay; update `TASK_INDEX.md`, `PROJECT_STATE.md`, `DECISION_LOG.md`, `RISK_REGISTER.md` and evidence. Commit tested work. Push and verify live Pages at stable checkpoints if remote/access is configured.

## Handoff
Record completed tasks, evidence paths, unresolved defects, performance, commit/push/Pages state and next phase. Do not mark the next phase active before this gate passes.
