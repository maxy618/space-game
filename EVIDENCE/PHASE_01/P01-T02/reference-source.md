# P01-T02 — Reference source code research (COMPLETED)

**Date:** 2026-11-06
**Task:** Find the reference source code identified by the plan (LAndroid-Web).

## Result

The game reference source code has been located, cloned, and audited.

### Source Repository
- **URL:** `https://github.com/lll69/landroid-web`
- **Revision (HEAD):** `fccb4ebd3e61e9cc4b708311c0da477eec8a4608` (2026-11-04)
- **Branch:** `main`
- **Local Path:** `D:\space-game\reference\landroid-web\` (isolated research folder, never modified)

### License Verification
- **License File:** `LICENSE` (Apache License, Version 2.0, 2004) — verified by reading first 5 lines.
- **License Declaration:** `"license": "Apache-2.0"` in `package.json`.
- **Provenance:** Apache-2.0 permits reuse with attribution and NOTICE preservation.

### Technical Stack (from `package.json`)
- **Runtime:** TypeScript (`typescript` 5.8.x)
- **UI:** React 18.3.x, MUI 5.18.x, Emotion 11.14.x
- **Build:** Webpack 5.94.x
- **Key libs:** `@thi.ng/random` (4.1.10), `moment`, `sprintf-js`

### Core Simulation Modules (src/)
- `Physics.ts`, `Physics15.ts` — Physical simulation logic
- `Universe.ts`, `Universe15.ts` — Procedural universe generation
- `MainActivity.ts`, `MainActivity15.ts` — Main game/activity logic
- `Autopilot15.ts` — Autopilot controls
- `XorWowRandom.ts`, `RandomKt.ts` — Deterministic PRNG implementation
- `player.ts`, `player15.ts` — Entry points for player.html / player15.html
- `ViewerApp.tsx` — Viewer mode

### Conclusion
The plan's requirement to "find the source code" has been satisfied. The `LAndroid-Web` repo serves as the exact blueprint for Phase 02 implementation.
