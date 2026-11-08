# Risk register

Use `docs/templates/RISK_TEMPLATE.md`. Track science, source licensing, rendering, gameplay, performance, mobile and deployment risks with evidence, player impact, mitigation, owner and recheck trigger.

## R-001 — Zero code baseline (Phase 01 / P01-T01)

- **Category:** Delivery / project
- **Risk:** The repository contains only planning docs; no game code, build system, or tests exist. Early phases must establish the toolchain from scratch.
- **Evidence:** P01-T01 inventory (`EVIDENCE/PHASE_01/P01-T01/inventory.md`): no `package.json`, no source files.
- **Player impact:** None yet (nothing playable). Delays first playable build until Phase 02.
- **Mitigation:** P01-T03 verified the full toolchain (Node 24.19, npm 11.17, JDK 17, Android SDK, Playwright). Phase 02 creates the first runnable build.
- **Recheck trigger:** Start of Phase 02 (first code must build and run).

## R-002 — Reference licensing and provenance (Phase 01 / P01-T02)

- **Category:** Licensing
- **Risk:** Copying code/assets from the reference without correct attribution violates the charter's license rules.
- **Evidence:** Reference is Apache-2.0 (`LICENSE` + `package.json` in `reference/landroid-web`). Dependency licenses (React, MUI, fonts, `@thi.ng/random`) not yet individually verified.
- **Player impact:** None direct; legal/handoff risk.
- **Mitigation:** Reference checkout is gitignored and read-only; per-file provenance recorded in `docs/LICENSING_AND_SOURCE_REUSE.md` before any code is copied in Phase 02+.
- **Recheck trigger:** Before the first file is copied from the reference into the game source tree.

## R-003 — No Android device attached (Phase 01 / P01-T03)

- **Category:** Mobile delivery
- **Risk:** Android APK/device testing cannot run without an attached emulator or physical device.
- **Evidence:** `adb devices` returned an empty list (P01-T03).
- **Player impact:** None until Phase 25 (Android delivery).
- **Mitigation:** Emulator and system images are installed; device testing is scheduled for Phase 25 and will launch the emulator then.
- **Recheck trigger:** Phase 25 kickoff.

## R-004 — Save migration gaps between releases (user mandate, Phase 03+)

- **Category:** Updates / persistence
- **Risk:** Player progress is lost or corrupted when the save schema changes between game versions.
- **Evidence:** User mandate D-002; ROADMAP.md Phase 3 now requires a versioned save format with a migration contract.
- **Player impact:** Progress loss would be a severe, trust-breaking defect.
- **Mitigation:** Save format carries an explicit `version` field from the first persistent state; every schema change ships a migration function plus automated migration tests; Phase 25/27 verify old saves load correctly in release builds.
- **Recheck trigger:** Every task that modifies the save schema.

## R-005 — Graphics quality regression (user mandate, all phases)

- **Category:** Visual quality
- **Risk:** Lighting/postFX work is deferred to late phases, producing flat or incoherent visuals that later need expensive rework.
- **Evidence:** User mandate D-002; AGENTS.md "Graphics and lighting — absolute quality priority".
- **Player impact:** Memorable picture quality is a core success criterion of the project.
- **Mitigation:** Every graphics-touching task includes lighting/material work in its Definition of Done; ROADMAP phases 6–8, 13, 16–18, 24–25 embed lighting/postFX requirements; quality tiers keep PC and Android performance in budget.
- **Recheck trigger:** Each phase exit gate; visual audits at normal size and close-up crops.

## R-006 — Spawn in void + invisible landmarks (found in P08 audio audit)

- **Category:** Gameplay / immersion
- **Risk:** Ship spawns up to ~118 km from the star with a ~450 m view, so
  the opening screen is empty void; the black hole sits at (180000,-140000)
  — outside `UNIVERSE_RANGE` (200000) — with no visible cue until metres
  away. First impression is “nothing here”.
- **Evidence:** Seed-42 audit (ship at 85668,81716; star r 7763); screenshots
  EVIDENCE/batch6/44–48.
- **Player impact:** Core-loop boredom before any discovery; landmarks feel absent.
- **Mitigation (deferred):** Spawn near the innermost planet orbit + distant
  star glare/lensing beacon on the HUD compass; BH moved inside the range
  with a radar marker. Belongs to a navigation mission, not 06–08.
- **Recheck trigger:** Next gameplay mission kickoff; do not claim the
  immersion problem is solved by graphics alone.
