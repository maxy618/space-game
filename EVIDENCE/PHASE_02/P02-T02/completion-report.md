# P02-T02 — Core scene and starfield parity: completion report

**Date:** 2026-11-06
**Status:** VERIFIED
**Build:** Vite production build OK (52 modules, `dist/assets/index-*.js` 35.27 kB). Determinism suite: 8/8 passing (`npm test`).

## Scope delivered
- Ported all modules required for the initial scene, split by responsibility:
  - `src/core/` — Physics, XorWowRandom, RandomKt, Namer, CanvasHelper, Vec2, Maths and supporting core utilities (byte-identical logic, import paths adjusted, TS strict annotations added, Apache-2.0 headers preserved).
  - `src/universe/Universe.ts` — deterministic universe/star generation.
  - `src/render/VisibleUniverse.ts` — starfield/scene rendering.
  - `src/app/MainActivity.ts` — activity lifecycle and scene wiring.
  - `src/main.ts` — entry point rewritten to match reference `player.ts` exactly (SEED_MAX `9223372036854775807n` / SEED_MIN clamp, pinch/wheel zoom handlers, ResizeObserver).
- Scaffolding: `index.html`, `package.json`, `tsconfig.json`, `public/favicon.svg`, vitest test harness.
- Tests: `tests/determinism.test.ts` (8/8) covering seed determinism, naming stability and physics repeatability.

## Critical bug found and fixed
The fixed seed was previously not applied to universe generation. After the fix, our build exactly matches the reference for `#seed=123456789`:

| Metric | Reference (landroid.js.org) | Ours |
|---|---|---|
| Star | Upsidedowncake-Delta-1376 (UDC-56789) | identical |
| Class / Radius / Mass | K / 3630 / 7.518e+10 | identical |
| Bodies | 0/1 | identical |
| POS | < -20043,-106722> | identical |
| VEL | 2 | identical |

## Flight-stick parity
Repeated drag gesture (12-step diagonal drag, 40 ms steps) on our build vs fresh reference runs:

- Ours: POS `< -19702,-106944>` VEL 330; repeats VEL 343 / 342 / 329
- Reference: POS `< -19711,-106938>` VEL 326; range 326–341

Track is straight in both. Variance (VEL spread) is gesture-timing noise, not a physics regression: three consecutive fresh-page runs (forced via an `about:blank` navigation before each load, since re-navigating the same URL does not reload the page) clustered in 329–343, matching the reference's 326–341 band. Earlier anomalous readings (VEL 649/985/1327 with curved track) were traced to stale page state between runs — the ship kept accelerating from the previous run's velocity because the page never actually reloaded; after forcing a true fresh load and using the canonical gesture the parity holds (evidence: `ours-track-blanknav-0*.png` canonical runs, `ours-track-repeat-0*.png` anomalous stale-state runs kept for the record).

## Player QA performed (Playwright, Chromium desktop 1280x720)
- Startup: scene renders, star + HUD correct, 0 console errors.
- Flight stick: pressed, dragged, released — ship accelerates along drag vector, HUD POS/VEL updates live.
- Touch emulation (phone viewport): pinch zoom works, ship drag works.
- Zoom: wheel + pinch verified.
- Evidence: `game-desktop-0*.png`, `game-phone-0*.png`, `seed123456789-*` comparison series (ours vs reference at same seed).

## Environment
Windows 10.0.26300, Node v24.19.0, Playwright Chromium (desktop + touch emulation). BROWSER_DESKTOP and BROWSER_TOUCH_EMULATION used; no physical Android claimed.

## Definition of Done checklist (per task file)
- [x] Source ported into responsibility-based scene/world, celestial-data, rendering and configuration modules.
- [x] Initial scene recreated and rendered deterministically.
- [x] Seed parity proven vs live reference.
- [x] Played via Playwright with real inputs (mouse + touch emulation).
- [x] Console clean, no failed network requests.
- [x] Screenshots at normal size; HUD text inspected.
- [x] Tests pass, build passes, evidence saved.
