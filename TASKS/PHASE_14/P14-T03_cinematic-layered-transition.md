# P14-T03 — Cinematic layered transition

**Phase:** 14 — Seamless atmospheric entry and trajectory continuity  
**Status:** PENDING  
**Depends on:** Prior tasks in this phase and prior phase gate.

## Objective
Animate camera scale, curvature/horizon, atmospheric rim, haze, clouds, parallax, lighting and event filters; pre-stream terrain before reveal.

## Exact work requirements
1. Inspect the real implementation and current docs first. Identify actual entry points, state ownership, dependencies and likely regressions. Do not assume a previous phase was implemented correctly.
2. Define the player-visible behavior this task must produce. Separate research, code, content/data, visuals, tests and documentation. For unresolved research questions, compare options using sources and record assumptions before coding.
3. Implement a complete small vertical slice; keep the game runnable. Do not fake a feature with placeholder UI or screenshots. Use maintainable modules and named parameters.
4. Keep stable IDs, deterministic seeds, explicit coordinate spaces/units and resource ownership. Separate generated base data from player changes. Avoid unnecessary framework/abstraction.
5. Add automated tests for deterministic logic, transitions, persistence, compatibility, calculations and edge cases.
6. Update project docs and explain how future content extends the system.

## Task-specific scope
Animate camera scale, curvature/horizon, atmospheric rim, haze, clouds, parallax, lighting and event filters; pre-stream terrain before reveal.

## Mandatory player test
Launch the actual build and use Playwright inputs to PLAY this feature. Do not rely only on internal state mutation. Use the real keyboard/mouse/pointer/touch path, execute a repeatable route and observe the result. Test desktop and phone touch-emulation sizes where relevant. Check simultaneous input, release, pointercancel, focus loss, pause/resume and resize for control-related tasks. For transitions, repeat them and actively steer. For visual tasks, inspect normal gameplay scale and magnified crops.

Save the exact route/seed, input sequence, viewport/browser, screenshots/video, console/page errors, failed requests and remaining defects. If build or Playwright is unavailable, mark BLOCKED with real evidence; do not mark VERIFIED.

## Definition of Done
Full-speed and frame-by-frame review shows no black-frame shortcut, loading gap, pop or input remap.

Additionally: build/tests pass or a real blocker is documented; the player-facing feature was actively played; visual changes were inspected at normal and close-up sizes; no unresolved P0/P1 regression remains; task index/state/decision/risk docs are updated; a descriptive Git commit exists. Push to the expected remote when configured and safe; record a concrete blocker otherwise.

## Completion report
Record changed files/modules, decision(s), tests actually run, player route and inputs, evidence paths, performance observations, known issues, commit SHA, push status and Pages verification status.
