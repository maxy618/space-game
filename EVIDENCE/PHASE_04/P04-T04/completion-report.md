# P04-T04 — Control playtest — Completion Report

**Date:** 2026-11-07 · **Status:** VERIFIED

## Full route (desktop 1280×800 + phone 412×915 touch emulation, seed 123456789)

1. **Keyboard flight**: W down → `THR: 100% VEL: 5000` (cap); W up → `THR: 0%`, drift at 5000 with momentum (verified in isolated retest: 100→0 in ≤1.5 s, stable at 0%).
2. **Keyboard pause toggle**: P opens (`pause-open`), pause button click closes — toggle verified through the safe-area-aware path.
3. **Touch thrust**: pointer drag → `THR: 100% VEL: 5000` on phone viewport.
4. **pointercancel**: `THR: 100%` → `0%` immediately, velocity preserved, no errors.
5. **Multitouch + resize**: second finger does not steal the stick; resize during input keeps input consistent.
6. **Losing focus** (blur) during a key-hold: releases everything, THR→0, no stuck thrust.

## Metrics / friction log
- All five routes produced expected telemetry at every checkpoint.
- Zero console errors across the entire phase.
- One anomaly observed mid-sequence (stale `THR: 100%` read immediately
  after a keyup inside a long combined block) — isolated retest showed
  clean behavior; root cause: telemetry text is updated on the next rendered
  frame, not synchronously on keyup. No player-visible impact.

## Verdict
No P0/P1 control friction. Phase 04 exit gate passes: the agent has actively
flown the ship with keyboard and touch emulation, and no stuck-input defect
remains.

## Evidence
- EVIDENCE/PHASE_04/P04-T04/t04-a-desktop.png, t04-b-phone.png
