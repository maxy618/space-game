# Space Exploration Game

A deep 2D space-and-planet exploration game built with **PixiJS + TypeScript + Vite**, targeting desktop browsers and Android (Capacitor). The project reconstructs the Android Easter-egg reference as a playable baseline, then expands it phase by phase into a procedural universe: star-system travel, atmospheric entry, flight, landing, rovers, ecosystems, ships and visible modular upgrades.

**Play now:** https://maxy618.github.io/space-game/

## What makes it distinctive

- **Layered authored 2D** — macro silhouettes, regional structure, material response, motion and postFX; not generic glossy 3D, not palette swaps.
- **Continuous gameplay** — atmospheric entry is a playable manoeuvre: the same ship, trajectory and momentum carry from space into local flight. No teleports, no cutscene fades.
- **Meaningful exploration** — coherent climate, geology, oceans and biomes; discoverable flora/fauna with habitat rules and stable identities.
- **Physical ships** — every upgrade is a visible module attached to data-driven attachment points and changes handling, not just stats.
- **Honest rendering** — screen-space and analytic effects are clearly engineered (quality tiers, blend in/out, reduced-motion behavior); approximations are never labeled as hardware ray tracing.

## Tech stack

| Layer     | Technology |
|-----------|------------|
| Rendering | PixiJS (WebGL 2), layered render graph with quality tiers |
| Language  | TypeScript, small modules with clear ownership |
| Build     | Vite (`base: /space-game/`), `tsc` strict checks |
| Tests     | Vitest (simulation core, regression coverage) |
| QA        | Playwright — the game is **actively played** via real inputs, not screenshot-checked |
| Android   | Capacitor (planned phase) |

## Getting started

```bash
npm install
npm run dev        # dev server
npm test           # vitest suite
npm run build      # tsc + production build
npm run preview    # serve dist/ with correct /space-game/ base
```

Debug-only controls (sim speed, manual zoom, seed selection) are gated behind `#debug=1` in the URL. Player-facing features: flight stick, velocity-based camera zoom, pause menu.

## Development model

Development follows a gated phase roadmap:

- `ROADMAP.md` — the 27-phase expansion plan.
- `MISSIONS/` — one concise prompt per phase.
- `PHASES/` — full phase goals, dependencies and exit gates.
- `TASKS/` — detailed task files with Definitions of Done.
- `PROJECT_STATE.md`, `TASK_INDEX.md` — live tracker of what is done and verified.
- `EVIDENCE/` — per-task playtest routes, screenshots and reports.
- `docs/` — testing, visual quality, licensing and release standards.

Every phase ends with a player test on the real build: desktop and touch-emulated mobile, keyboard/mouse/touch inputs, console-error checks, close-up visual inspection. Progress is committed and pushed per verified increment; releases deploy to GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`) with versioned builds and save-migration rules.

## Status

- **Phase 01 — reference study & toolchain:** complete.
- **Phase 02 — faithful Android reference reconstruction:** complete (playable flight, telemetry, pause menu, live Pages deploy).
- **Next:** modular deterministic core, ship controls, camera/scale, art direction, celestial visuals.

See `PROJECT_STATE.md` for the authoritative checkpoint.
