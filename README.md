# Space Exploration Game

A deep 2D space-and-planet exploration game built with **Canvas 2D + TypeScript + Vite**, targeting desktop browsers and Android (Capacitor, later phase). Phase by phase the project turns a faithful reconstruction of the Android space Easter-egg reference into a procedural universe: star-system travel, atmospheric entry, flight, landing, rovers, ecosystems, exploration rewards, unlockable ships and visible modular upgrades.

**Play now:** https://maxy618.github.io/space-game/

## Controls

- **Flight stick** — press and drag anywhere on the canvas; drag distance sets thrust (0–100%), direction aims the ship.
- **Pause** — button in the top-right corner (Continue / Settings / Exit placeholders).
- Debug-only tools (sim speed, pause-check, manual zoom, seed selection) are hidden behind `#debug=1` in the URL.

## Development model

Development follows a gated 27-phase roadmap:

- `ROADMAP.md` — the phase plan; `PHASES/` — per-phase goals and exit gates.
- `TASKS/` — detailed task files with Definitions of Done; `MISSIONS/` — the short mission prompts.
- `PROJECT_STATE.md`, `TASK_INDEX.md` — live tracker; `EVIDENCE/` — playtest routes, screenshots, reports.
- `DECISION_LOG.md`, `RISK_REGISTER.md` — engineering decisions and known risks.
- `AGENTS.md` — working rules for agent contributors.

Every phase ends with a real player test: the build is run and **actively played** via Playwright inputs (keyboard/mouse/touch emulation), with console/network checks and screenshots saved as evidence. A task is VERIFIED only after its Definition of Done and player test pass.

## Tech stack

| Layer     | Technology |
|-----------|------------|
| Rendering | Canvas 2D (planned: PixiJS layered render graph in Phase 06) |
| Language  | TypeScript, small modules, Apache-2.0 ported reference core |
| Build     | Vite (`base: /space-game/`), `tsc` strict checks |
| Tests     | Vitest (determinism, SimClock, autopilot, phase regression suites) |
| QA        | Playwright — real input routes, not screenshot-only checks |
| Deploy    | GitHub Actions → GitHub Pages on every push to `main` |

## Getting started

```bash
npm install
npm run dev        # dev server (or use #seed=... to fix the universe)
npm test           # vitest suite
npm run build      # tsc + production build
npm run preview    # serve dist/ with the /space-game/ base
```

## Status

- **Phase 01 — reference study & toolchain:** complete.
- **Phase 02 — faithful Android reference reconstruction:** complete (flight, telemetry, autopilot visuals, pause menu, live Pages deploy, high-DPI camera fix).
- **Phase 03 — modular deterministic core:** in progress (dependency/state map done).
- **Next:** ship controls, camera/scale, art direction, celestial visuals, procedural universe.

See `PROJECT_STATE.md` for the authoritative checkpoint.
