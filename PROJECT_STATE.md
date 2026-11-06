# Project state

**Active phase:** 02 — Faithful Android reference reconstruction (COMPLETE)
**Active task:** none — Phase 02 closed (P02-T04 VERIFIED)
**Overall status:** P01 ✅ | P02-T01 ✅ | P02-T02 ✅ | P02-T03 ✅ | P02-T04 ✅
**Last verified commit:** 69ab9f4 (P02-T04, pushed to origin/main)
**Latest QA evidence:** EVIDENCE/PHASE_02/P02-T04/ (completion-report.md, t04-a..t04-h routes)

## Current checkpoint
- Completed tasks: P01-T01..T04, P02-T01..T04
- In progress: none
- Blocked: none (Pages deploy had transient GitHub 500; rerun triggered)
- Next action: start Phase 03 per MISSIONS/PHASES (await user go-ahead)

## P02-T04 highlights (2026-11-07)
- End-to-end parity playtest executed: desktop 1280×800 + phone 412×915 touch emulation.
- Route: rest → pointer-drag thrust (THR 100%, VEL 5000 cap) → release → drift (momentum preserved) → pause menu open/CONTINUE resume; phone route repeated with touch pointer type.
- Robustness checks passed: pointercancel releases thrust cleanly (THR→0%, drift continues); blur/visibilitychange sane; pause/resume on both viewports.
- Telemetry (THR/POS/VEL) matches reference format and behavior under equivalent inputs.
- Fixed 1 console error: setPointerCapture NotFoundError on synthetic pointers (try/catch in src/app/MainActivity.ts). vitest 23/23, build clean.
- Deployment pipeline live: .github/workflows/deploy.yml + vite base /space-game/; repo Pages enabled (build_type=workflow). Run #1/#2 deploy failed with GitHub-side HTTP 500 (server error, not build); rerun triggered. Live URL target: https://maxy618.github.io/space-game/

## P02-T03 highlights (2026-11-07)
- Ported Android 15 parity: MainActivity15 (isBaklava, playSpeed, expSmooth zoom, telemetry LND/JOB/ALT/THR/SPEED), Autopilot15 algorithm module (D-003, no player UI), Universe15 (Landing15/Fuse, Spacecraft15 launchClock), VisibleUniverse15 (legs/thrust/autopilot visuals, crash sparks), Namer15, Physics15 (Fuse), Flag15, player15 wiring, playerSpeed + SimClock.
- Player vs debug policy (user mandate): speed/pause/manual zoom/seed are debug-only (#debug=1); players get flight stick, telemetry, and project-native velocity zoom (camera breathes with speed anchored to original view, SPEED_ZOOM_REF=800 px/s).
- Fixed: speed picker overlay at launch (CSS specificity); telemetry line collapse (white-space: pre).
- vitest 23/23, build clean, Playwright flight route passed (THR 100%, VEL 1763→0), phone 412×915 clean, 0 console errors.

## Environment evidence
Verified by execution on 2026-11-06 (P01-T03, Windows 10.0.26300):
- Node.js v24.19.0, npm 11.17.0, Git 2.55.0.windows.5
- OpenJDK 17.0.20.1, Android SDK at D:\android\sdk (build-tools 34.0.0/35.0.0/36.0.0, emulator + system images installed)
- ADB 1.0.41 (37.0.1-15733141); `adb devices`: no device attached
- Playwright Chromium: verified working (live reference played in P01-T02, 144 FPS, 0 console errors)

## Latest handoff
2026-11-07 — Phase 02 complete (P02-T04 VERIFIED). Changed: src/app/MainActivity.ts (setPointerCapture guard), .github/workflows/deploy.yml (new), vite.config.ts (new, base=/space-game/), TASKS/PHASE_02/P02-T04 status, TASK_INDEX.md, PROJECT_STATE.md, EVIDENCE/PHASE_02/P02-T04/*. Tests: vitest 23/23, npm run build clean. Player route: desktop+phone flight/pause/resume with real pointer+touch inputs (see completion-report.md). Console: fixed 1 pointer-capture error; 0 errors post-fix. Commits: ce48c34 (P02-T03), 8dbbbbf (deploy pipeline), 69ab9f4 (P02-T04) pushed to origin/main. Pages: enabled (build_type=workflow); first deploy attempt failed with GitHub-side 500, rerun in progress — verify https://maxy618.github.io/space-game/ before Phase 03. Next action: await user; Phase 03 per TASK_INDEX.

## Latest handoff
2026-11-06 — Phase 01 complete. Changed: EVIDENCE/PHASE_01/*, TASK_INDEX.md, PROJECT_STATE.md, DECISION_LOG.md, RISK_REGISTER.md, .gitignore. Tests: reference played via Playwright keyboard input (route in EVIDENCE/PHASE_01/P01-T02/playtest-record.md), toolchain commands executed (P01-T03). No game code exists yet — first playable build is Phase 02. Player route: landroid.js.org/player.html, w+5 thrust, ship displaced. Commit f58da3d + a3bdaf7 pushed to origin/main. Pages not yet configured (Phase 27).

At every checkpoint record timestamp, phase/task, changed paths, tests, actual player route/inputs, viewport/browser, screenshots/video, console/network findings, performance, defects, commit SHA, push status, Pages URL/status and next action.
