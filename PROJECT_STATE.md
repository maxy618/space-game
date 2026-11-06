# Project state

**Active phase:** 02 — Faithful Android reference reconstruction
**Active task:** P02-T04 — End-to-end parity playtest (NEXT)
**Overall status:** P01 ✅ | P02-T01 ✅ | P02-T02 ✅ | P02-T03 ✅ | P02-T04 ⏳
**Last verified commit:** (see git log — P02-T03 commit)
**Latest QA evidence:** EVIDENCE/PHASE_02/P02-T03/ (completion-report.md, final-rest-desktop, final-flight-highspeed/decel, final-phone-viewport, final-debug-mode)

## Current checkpoint
- Completed tasks: P01-T01..T04, P02-T01, P02-T02, P02-T03
- In progress: none
- Blocked: none
- Next action: P02-T04 — End-to-end parity playtest.

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
2026-11-06 — Phase 01 complete. Changed: EVIDENCE/PHASE_01/*, TASK_INDEX.md, PROJECT_STATE.md, DECISION_LOG.md, RISK_REGISTER.md, .gitignore. Tests: reference played via Playwright keyboard input (route in EVIDENCE/PHASE_01/P01-T02/playtest-record.md), toolchain commands executed (P01-T03). No game code exists yet — first playable build is Phase 02. Player route: landroid.js.org/player.html, w×5 thrust, ship displaced. Commit f58da3d + a3bdaf7 pushed to origin/main. Pages not yet configured (Phase 27).

## Latest handoff
At every checkpoint record timestamp, phase/task, changed paths, tests, actual player route/inputs, viewport/browser, screenshots/video, console/network findings, performance, defects, commit SHA, push status, Pages URL/status and next action.
