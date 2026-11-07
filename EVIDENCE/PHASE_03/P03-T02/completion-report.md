# P03-T02 — Deterministic domain layer — Completion Report

**Date:** 2026-11-07 · **Commit:** (see git log "P03-T02") · **Status:** VERIFIED

## What was implemented

The playable baseline now has a deterministic, serializable simulation core. Behavior visible to the player is unchanged (verified route below).

### Code changes

1. **`src/core/Physics.ts`**
   - `Body.id: number = -1` — stable identity field for persistent bodies.
   - `Simulator.rng` now seeded: `newRandom(randomSeed)` instead of `SYSTEM`.
     Runtime effects (sparks, impact debris) replay identically for a given seed
     and input sequence — required for deterministic saves (P03-T02 contract).
   - `SYSTEM` import removed (only remaining consumer of OS randomness was the
     simulator's runtime rng; `Autopilot15.rng` is an unused dead field).

2. **`src/universe/Universe.ts`**
   - Stable ID scheme assigned in `initTest()` and `initRandom()`:
     star = 0, planets = 1..N in creation order (pre-sort), ship = `SHIP_STABLE_ID` (1000).
     Sparks and other ephemeral entities keep `-1` and are never serialized.
   - `Universe.serialize(): string` — canonical JSON snapshot of persistent state:
     version, randomSeed (string), sim `now`, star (id/cls/radius/name), planets
     (array order preserved — floating-point gravity accumulation is
     order-sensitive), ship (pos/velocity/angle/thrust + landing planet id),
     follow id, latestDiscovery id.
   - `Universe.deserialize(namer, json)` static factory — rebuilds the full entity
     graph (star, planets, ship, ringfence constraint, Landing constraint resolved
     via planet id, follow/latestDiscovery refs) in exact original order.

3. **`tests/domain-layer.test.ts`** (new, 6 tests):
   - stable ID scheme for both `initRandom` and `initTest`;
   - byte-identical serialized state for two universes from the same seed after
     identical steps (repeatability);
   - round-trip preserves full state (ids, names, explored flags, positions,
     velocities, angles, sim time);
   - restored universe continues simulation **bit-identically** vs the original
     continuing forward (order-independence of save/restore) — verified by
     byte-identical `serialize()` output after 60 more frames;
   - player-discovered data (`explored`, discovered text) survives the round-trip.

## Test results

- `npx vitest run`: **29/29 passed** (3 files: determinism, phase02, domain-layer; was 23 before).
- `npm run build`: clean, 61 modules, dist 55.68 kB.

## Player route (regression — no player-visible change intended)

- URL: `http://localhost:5199/#seed=123456789`, Chromium Playwright, 1280×800.
- Rest → telemetry `THR: 0% VEL: 50` (t02-a-rest.png).
- Pointer down + drag → `THR: 100% VEL: 3659` accelerating (t02-b-thrust.png).
- Pointer up → drift, `THR: 0% VEL: 5000` (cap reached, momentum kept, t02-c-drift.png).
- Pause button → `pause-open` menu (t02-d-pause.png) → CONTINUE → menu closed,
  drift resumed (`VEL: 4996`).
- Console errors after full route: **0**.

## Decisions

- **Runtime RNG is now seeded.** This is a deliberate, documented behavior change:
  spark effects are cosmetic and now replay deterministically. No gameplay
  surface changes. Chosen because Phase 03's contract is a deterministic core
  and future saves/migration depend on it.
- **Serialization stores the full snapshot, not a seed + mutations diff.**
  Rationale: zero regeneration drift risk; generation remains deterministic so
  regeneration is also possible later. Full snapshots are small (a few KB).
- **Planet array order preserved on save** (not sorted by id) because gravity
  accumulation into `ship.velocity` is floating-point order-sensitive; a
  re-ordered restore would produce ULP-level divergence, breaking the
  bit-identical continuation guarantee. Array order is itself deterministic
  (creation order, pre-sort), so canonical output is achieved without sorting.
- **Removable** type stays in `universe/Universe.ts` for now (Fuse imports it);
  moving it to core is deferred to P03-T03 boundary extraction to keep this
  slice small.

## Risks / follow-ups

- `Autopilot15.rng = SYSTEM` is dead code; flagged for removal in P03-T03.
- `MainActivity.ts` (legacy path) still has its own duplicated globals; still
  unreachable from `main.ts` (only `FlightStick` is imported). Legacy cleanup
  scheduled for P03-T03.
- Save format version field `v: 1` introduced — future schema changes must bump
  and migrate (per AGENTS.md updates mandate).

## Evidence

- `EVIDENCE/PHASE_03/P03-T02/dependency-state-map.md` (from T01) → this file.
- Screenshots: t02-a-rest, t02-b-thrust, t02-c-drift, t02-d-pause.
