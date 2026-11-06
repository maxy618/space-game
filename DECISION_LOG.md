# Decision log

Use `docs/templates/DECISION_TEMPLATE.md` for non-trivial decisions. Record context, evidence, alternatives, trade-offs, tests and revisit condition.

## D-001 — Reference implementation source (Phase 01 / P01-T02)

- **Context:** The charter requires reconstructing the Android Easter Egg reference as a playable baseline. No game source existed in the repository.
- **Decision:** Use `lll69/landroid-web` (https://github.com/lll69/landroid-web) as the reference implementation. Revision `fccb4ebd3e61e9cc4b708311c0da477eec8a4608` (2026-11-04), branch `main`, license Apache-2.0.
- **Evidence:** Cloned to `reference/landroid-web` (gitignored, read-only). Live pages verified at `https://landroid.js.org/player.html` and played with Playwright keyboard input — ship moved, 144 FPS, 0 console errors.
- **Alternatives considered:** Building from scratch without a reference (rejected: charter mandates faithful reconstruction first; reference gives the interaction loop, seed behavior, and procedural systems to match).
- **Trade-offs:** Apache-2.0 requires attribution/NOTICE preservation; tracked in `docs/LICENSING_AND_SOURCE_REUSE.md`.
- **Revisit condition:** If the reference repo is deleted or re-licensed, re-audit before any reuse.

## D-002 — User mandates: update pipeline and graphics quality (2026-11-06)

- **Context:** The user issued two mandatory requirements for the development plan.
- **Decision:**
  1. **Updates and releases** are a permanent architecture mandate: automated builds, GitHub Pages (Web), Android APK, GitHub Releases, semantic versioning, in-game update check, and save-data migration across versions. Save migration must be designed from the first persistent state (Phase 03) and verified in every release (Phase 27).
  2. **Graphics and lighting** are an absolute quality priority on every subsystem. Multi-level lighting, dynamic light sources, reflections, GI where justified, bloom, HDR-like tone mapping, refraction, scattering, volumetrics, atmospheric perspective, particles and post-processing must be researched and applied as fundamental parts of the art style — integrated per-phase, not deferred to one late phase. Performance on PC and Android must be scaled with quality tiers.
- **Evidence:** ROADMAP.md phases 3, 6, 7, 8, 13, 16, 17, 18, 24, 25, 27 updated; AGENTS.md charter gained sections "Graphics and lighting — absolute quality priority" and "Updates and releases — architecture mandate".
- **Impact:** Every future task with a graphics surface must include lighting/material work in its Definition of Done. Every release-affecting task must verify versioning and save migration.

## D-003 — Autopilot: port as algorithm, not as gameplay feature (2026-11-06)

- **Context:** Phase 02 (P02-T03 ship/interaction parity) considers porting the reference `Autopilot15` (landroid-web, Apache-2.0). The user clarified: the reference autopilot must not be an in-game player-facing feature of this project; it is to be ported only as an algorithm (for parity tests and reference), while a future phase will implement our own realistic autopilot with target selection, thrust limits, fuel/propellant constraints and much more.
- **Decision:** Port the autopilot logic into a separate `autopilot` responsibility module with license notices preserved, for algorithm parity and automated tests only. Do not wire it into gameplay input/UI in the Phase 02 build. A later phase replaces it with a project-native autopilot (target selection, thrust/propellant limits, guidance).
- **Alternatives considered:** (a) omit the autopilot entirely (rejected: parity mandate says port eligible logic); (b) ship it as a player toggle (rejected by user mandate).
- **Trade-offs:** Slight extra code now in exchange for algorithm parity evidence; the module must be kept clearly non-player-facing until replaced.
- **Tests:** Deterministic unit tests of the strategy state machine (CHASING/APPROACHING/LANDING/LAUNCHING) in vitest, not player-facing.
- **Revisit condition:** When the project-native autopilot phase starts, this module is superseded or removed.
