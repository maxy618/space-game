# PHASE 24 — Animation, sound, interface and accessibility

**Status:** PENDING  
**Dependency:** Phase 23 exit gate must pass.

## Goal
Give actions and worlds authored motion/audio feedback while keeping a clear minimal interface.

## Expected result
Reusable motion grammar, event-driven sound, bespoke HUD and persistent accessibility settings.

## Scope and working rules
Inspect the current code and relevant project docs before changing anything. This phase must be implemented in small runnable vertical slices. Research unresolved scientific/API/graphics questions in this phase rather than inventing answers. Use authoritative sources and a separate report when the research is substantial. Separate observed facts, inference, game abstraction and fiction. Keep future extensibility data-driven only where this phase creates a real content family.

## Ordered tasks

1. **P24-T01 — Motion grammar** (`TASKS/PHASE_24/P24-T01_motion-grammar.md`)
   - Focus: Define anticipation, easing, duration, secondary motion, interruptibility, transition priority and reduced-motion alternatives.
   - Completion result: Shared animation rules work and interrupted states recover.

2. **P24-T02 — Sound and ambient layers** (`TASKS/PHASE_24/P24-T02_sound-and-ambient-layers.md`)
   - Focus: Add event audio for engines, warp, entry, weather, landing, rover, scan, discoveries and life, with mix priorities and mute/volume.
   - Completion result: Sounds follow actual events and do not overlap uncontrollably.

3. **P24-T03 — HUD and bespoke feedback** (`TASKS/PHASE_24/P24-T03_hud-and-bespoke-feedback.md`)
   - Focus: Build minimal contextual interface, original icons, target cues and concise notices; remove fake telemetry/placeholders.
   - Completion result: HUD is usable at phone size and has no generic icon-pack artwork.

4. **P24-T04 — Accessibility/settings** (`TASKS/PHASE_24/P24-T04_accessibility-settings.md`)
   - Focus: Implement pause, sensitivity, volume, quality, reduced motion, contrast/readability as needed, and persistence.
   - Completion result: Settings survive reload/app lifecycle; reduced motion preserves essential cues.

5. **P24-T05 — Integrated feel playtest** (`TASKS/PHASE_24/P24-T05_integrated-feel-playtest.md`)
   - Focus: Play travel, celestial events, entry, weather, fauna, landing, rover and upgrades; audit timing/audio/UI and revise.
   - Completion result: Event-by-event test log and fixes; no important action lacks feedback.

## Exit gate — phase Definition of Done
Core interactions have coherent feedback; motion can be reduced; UI remains legible and uncluttered.

Before closing: actively play the phase result in Playwright; inspect normal-size and close-up visuals; check console/network errors; fix and replay; update `TASK_INDEX.md`, `PROJECT_STATE.md`, `DECISION_LOG.md`, `RISK_REGISTER.md` and evidence. Commit tested work. Push and verify live Pages at stable checkpoints if remote/access is configured.

## Handoff
Record completed tasks, evidence paths, unresolved defects, performance, commit/push/Pages state and next phase. Do not mark the next phase active before this gate passes.
