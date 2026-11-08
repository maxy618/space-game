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

## R-006 — Spawn in void + invisible landmarks — FIXED 2026-11-09

- **Fix:** ship spawns on the innermost planet's orbit track (6 km ahead,
  planet's exact circular speed — stable, no impact), horizon glare +
  planet edge diamond on the first screen, BH moved inside the range
  (110000,−85000, 139 km) with radar marker + routable node.
- **Evidence:** `EVIDENCE/batch6/78_spawn_cues.png`, `82_bh_close.png`,
  `EVIDENCE/PHASE_08/P08-T05/r006-closure.md`.
