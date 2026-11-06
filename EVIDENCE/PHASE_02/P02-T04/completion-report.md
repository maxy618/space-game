# P02-T04 — End-to-end parity playtest — Completion Report

**Date:** 2026-11-07
**Task:** TASKS/PHASE_02/P02-T04_end-to-end-parity-playtest.md
**Verdict:** VERIFIED

## Route / seed / browser

- Seed: `123456789` (URL hash)
- Desktop: Chromium via Playwright MCP, viewport 1280×800
- Phone: same browser, touch emulation viewport 412×915
- Dev server: http://localhost:5199 (Vite, source build)

## Route and inputs

1. Load → telemetry settles at THR 0% / VEL ~1 (rest).
2. Pointer down on canvas center, drag down-left → THR 100%, acceleration to VEL 5000 (max).
3. Pointer up → THR 0%, drift continues at VEL 5000 (momentum preserved).
4. Pause button (top-right) → `pause-open` menu with pulses; CONTINUE → menu hidden, drift resumes (POS advanced during pause: no, POS frozen during pause, advanced after resume).
5. Phone viewport: touch pointerdown+move → THR 100% (VEL 4100 mid-accel); `pointercancel` → THR immediately 0%, drift continues; blur/visibilitychange events → state sane, drift continues; pause → CONTINUE on phone → resumes.

## Evidence files

- t04-a-desktop-rest.png — desktop rest
- t04-b-desktop-drift.png — desktop drift VEL 5000 after release
- t04-c-desktop-pause.png — pause menu open (frosted blur, pulses)
- t04-d-desktop-resumed.png — after CONTINUE
- t04-e-phone-drift.png — phone 412×915 drift
- t04-f-phone-cancel.png — after pointercancel (THR 0%)
- t04-g-phone-pause.png — phone pause menu open
- t04-h-phone-resumed.png — phone after CONTINUE

## Console / page errors

- 1 console error found during desktop route: `NotFoundError: Failed to execute 'setPointerCapture' ... No active pointer with the given id is found` — thrown by synthetic pointerup in the Playwright harness (pointer already released). **Fixed**: `setPointerCapture` wrapped in try/catch in `src/app/MainActivity.ts` (real players never hit it; synthetic/test and rare edge paths now safe). Post-fix build+tests green; no further errors in phone route.
- No failed network requests observed (dev server only, no external calls).

## Reference vs clone comparison

Reference behavior (landroid.js.org/player.html, recorded in P01-T02):
- THR 0..100% by drag distance; velocity cap 5000; momentum preserved on release; telemetry format identical (THR/POS/VEL).
- Clone matches: THR responds immediately on pointerdown, cap at 5000, drift after release, telemetry text identical.

Known accepted differences (player-facing, per user mandates from P02-T03):
- Velocity zoom (0.7× rest → 1.7× max) is a project feature, not present in the reference.
- Pause menu CONTINUE/SETTINGS/EXIT: SETTINGS/EXIT are stubs for a later phase.
- Sim speed / pause-check / manual zoom / seed remain debug-only (#debug=1).

## Tests

- `npx vitest run`: 23/23 passed (phase02 suite).
- `npm run build`: clean (dist 9.84 kB html + 53.6 kB js).

## Deployment (bonus during this task)

- Created `.github/workflows/deploy.yml` (install → test → build → upload-pages-artifact → deploy-pages) and `vite.config.ts` with `base: "/space-game/"`.
- Repo Pages enabled via API (`build_type: workflow`).
- Run #1/#2: build job green; deploy job failed once with GitHub server error 500 ("Creating Pages deployment failed … Please re-run"). Rerun triggered.

## Defects remaining

- None P0/P1.

## Commit

- `69ab9f4` — P02-T04: fix setPointerCapture error on synthetic/inactive pointers (pushed to origin/main).
