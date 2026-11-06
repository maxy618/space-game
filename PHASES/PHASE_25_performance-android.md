# PHASE 25 — Performance and Android delivery

**Status:** PENDING  
**Dependency:** Phase 24 exit gate must pass.

## Goal
Measure demanding scenes, implement quality tiers, and build/test the Android app on the actual available Windows toolchain.

## Expected result
Performance reports, LOD/fallbacks, safe GPU lifecycle, reproducible Capacitor/APK workflow and honest device matrix.

## Scope and working rules
Inspect the current code and relevant project docs before changing anything. This phase must be implemented in small runnable vertical slices. Research unresolved scientific/API/graphics questions in this phase rather than inventing answers. Use authoritative sources and a separate report when the research is substantial. Separate observed facts, inference, game abstraction and fiction. Keep future extensibility data-driven only where this phase creates a real content family.

## Ordered tasks

1. **P25-T01 — Performance instrumentation** (`TASKS/PHASE_25/P25-T01_performance-instrumentation.md`)
   - Focus: Measure representative dense systems, postFX, entry, cloud/weather, ocean, organisms and rover scenes; record hardware, browser, viewport and frame-time distributions.
   - Completion result: Budgets are based on measured workloads, not guesses or empty scenes.

2. **P25-T02 — Quality tiers and fallback** (`TASKS/PHASE_25/P25-T02_quality-tiers-and-fallback.md`)
   - Focus: Implement LOD, render resolution scaling, bounded shader samples/particles, cloud detail reduction and low/medium/high settings.
   - Completion result: Low tier remains playable and visual hierarchy survives.

3. **P25-T03 — Memory/resource lifecycle** (`TASKS/PHASE_25/P25-T03_memory-resource-lifecycle.md`)
   - Focus: Audit caches, render targets, textures, filters, listeners, pooling and context loss through long sessions and repeated transitions.
   - Completion result: No unbounded growth or resource leaks across travel/planet transitions.

4. **P25-T04 — Capacitor Android build** (`TASKS/PHASE_25/P25-T04_capacitor-android-build.md`)
   - Focus: Verify official current Capacitor compatibility, local JDK/SDK and build tools; configure app lifecycle/safe areas/back/pause/resume and build debug APK.
   - Completion result: Documented Windows build commands succeed or exact toolchain blocker is recorded.

5. **P25-T05 — Device/emulation test matrix** (`TASKS/PHASE_25/P25-T05_device-emulation-test-matrix.md`)
   - Focus: Test desktop/mobile Playwright, touch emulation, Android emulator and physical Android only if available; test rotate/background/resume/touch/quality.
   - Completion result: Evidence is labeled correctly; no emulation is reported as physical test.

## Exit gate — phase Definition of Done
Representative scenes meet measured budgets or adapt gracefully; Android build/install succeeds when tooling/device are available.

Before closing: actively play the phase result in Playwright; inspect normal-size and close-up visuals; check console/network errors; fix and replay; update `TASK_INDEX.md`, `PROJECT_STATE.md`, `DECISION_LOG.md`, `RISK_REGISTER.md` and evidence. Commit tested work. Push and verify live Pages at stable checkpoints if remote/access is configured.

## Handoff
Record completed tasks, evidence paths, unresolved defects, performance, commit/push/Pages state and next phase. Do not mark the next phase active before this gate passes.
