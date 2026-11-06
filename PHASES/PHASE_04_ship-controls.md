# PHASE 04 — Ship controls and movement feel

**Status:** PENDING  
**Dependency:** Phase 03 exit gate must pass.

## Goal
Make the ship feel responsive, precise and intuitive across keyboard, mouse and touch.

## Expected result
Input abstraction, tuned ship handling, bespoke touch controls and tested edge cases.

## Scope and working rules
Inspect the current code and relevant project docs before changing anything. This phase must be implemented in small runnable vertical slices. Research unresolved scientific/API/graphics questions in this phase rather than inventing answers. Use authoritative sources and a separate report when the research is substantial. Separate observed facts, inference, game abstraction and fiction. Keep future extensibility data-driven only where this phase creates a real content family.

## Ordered tasks

1. **P04-T01 — Input action abstraction** (`TASKS/PHASE_04/P04-T01_input-action-abstraction.md`)
   - Focus: Map thrust, steer, brake, interact, scan, land/launch and pause independently of device; handle focus loss, keyup loss and pointer cancellation.
   - Completion result: Keyboard/mouse/touch feed one action layer; edge-case tests pass.

2. **P04-T02 — Ship handling and tuning** (`TASKS/PHASE_04/P04-T02_ship-handling-and-tuning.md`)
   - Focus: Tune acceleration, inertia, braking, turning, speed bounds and stability through repeatable player routes, not intuition alone.
   - Completion result: Low/high-speed movement is predictable and frame-rate independent.

3. **P04-T03 — Touch controls** (`TASKS/PHASE_04/P04-T03_touch-controls.md`)
   - Focus: Build a minimal bespoke joystick/contextual action layout with safe areas, thumb reach, multitouch and pressed states.
   - Completion result: Playwright touch inputs steer and trigger actions simultaneously; cancel/resize release inputs.

4. **P04-T04 — Control playtest** (`TASKS/PHASE_04/P04-T04_control-playtest.md`)
   - Focus: Play full routes on desktop and touch emulation; log response, misses, accidental touches and learnability; tune and replay.
   - Completion result: Before/after evidence shows no P0/P1 control friction.

## Exit gate — phase Definition of Done
Agent has actively flown the ship with keyboard and touch emulation; no stuck-input defect remains.

Before closing: actively play the phase result in Playwright; inspect normal-size and close-up visuals; check console/network errors; fix and replay; update `TASK_INDEX.md`, `PROJECT_STATE.md`, `DECISION_LOG.md`, `RISK_REGISTER.md` and evidence. Commit tested work. Push and verify live Pages at stable checkpoints if remote/access is configured.

## Handoff
Record completed tasks, evidence paths, unresolved defects, performance, commit/push/Pages state and next phase. Do not mark the next phase active before this gate passes.
