# P03-T04 — Parity regression suite — Completion Report

**Date:** 2026-11-07 · **Status:** VERIFIED

## What was done

1. **Determinism fix (deferred from T03):** `sim/Autopilot15.ts` no longer
   holds its own `rng = SYSTEM` (non-deterministic); random target selection
   when all planets are explored now consumes the seeded `sim.rng` stream.
   Replay parity restored for autopilot runs.
2. **Parity regression suite** `tests/parity-regression.test.ts` (5 tests):
   - autopilot picks the same random target from sim.rng for equal seeds,
   - nearest-unexplored targeting is seed-deterministic,
   - autopilot flight run (150 frames) is byte-identical for equal seeds,
   - identical scripted thrust inputs (90 frames thrust + 60 coast) produce
     byte-identical serialized trajectories,
   - 600-frame smoke run stays finite (no NaN in ship/planets).
3. **Docs:**
   - `docs/CONTENT_AUTHORING.md` — how to add a new object/mechanic: layer
     map, stable-ID rules, entity registration, serialization contract,
     render hookup, determinism rules (sim.rng only, no SYSTEM/Math.random/
     Date.now), required tests.
   - `docs/PLAYER_ROUTES.md` — repeatable Playwright routes (flight parity,
     touch robustness, velocity zoom, high-DPI camera) with known MCP
     pitfalls.

## Verification

- `npx vitest run`: **34/34 passed** (23 phase02 + 6 domain-layer + 5 parity).
- `npm run build`: clean.
- Player route (desktop 1280×800, seed 123456789): rest → thrust
  (THR 100%, VEL 4219 mid-accel) → release → drift VEL 5000 → pause →
  CONTINUE → resumed. **0 console errors.** Evidence t04-a..t04-d.

## How to extend (doc extract)

New objects follow `docs/CONTENT_AUTHORING.md`: class in `universe/`,
stable id range, `addEntity` in init order, `Removable` if removable,
serialize fields with save version `v`, render in VisibleUniverse15,
4 mandatory tests. New mechanics advance only through the simulator loop
and consume randomness only from `sim.rng`.

## Evidence

- `EVIDENCE/PHASE_03/P03-T04/t04-a-rest.png` … `t04-d-resumed.png`
- Test suite output: 34/34 vitest (run output in conversation log).

## Defects remaining

- None P0/P1.
