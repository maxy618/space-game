# Content authoring — how to add a new object or mechanic

This document describes the stable extension points of the game core (Phase 03
architecture). Every new game object or mechanic must follow this checklist so
that determinism, serialization and reference parity survive.

## Layer map (see also EVIDENCE/PHASE_03/P03-T01/dependency-state-map.md)

```
core/    — physics (Body/Entity/Simulator/Constraint/Removable), math, RNG, no game content
sim/     — autonomous simulation entities (Autopilot15); depends on core + universe (types)
universe/— game content: Universe, Star, Planet, Spacecraft (+15 variants), Landing
render/  — VisibleUniverse/15: drawing only; never mutates simulation state
input/   — FlightStick and other input widgets; produce callbacks, no game state
app/     — MainActivity15: composition root, browser glue, camera, telemetry
```

Dependency rule: `core` ← `sim` ← `universe` ← `render`/`input` ← `app`.
Never import backwards (e.g. core must not import universe).

## Adding a new physical object (e.g. a moon, station, asteroid)

1. **Define the class** in `universe/` (or `core/` if it is purely physical).
   Extend `Body` (it integrates pos/velocity/angle for free) or implement
   `Entity` directly for non-physical logic.
2. **Assign a stable ID** at creation time, in creation order, *before* any
   sorting: star=0, planets=1..N, ship=1000. Reserve the next free range for
   your content (e.g. moons 2001..) and record it here. Ephemeral objects
   (sparks, effects) keep the default `id = -1` and are never serialized.
3. **Register with the simulator**: `universe.addEntity(obj)` in the same
   `initRandom()`/`initTest()` block that creates it. Creation order is part
   of the deterministic contract — keep it fixed for a given seed.
4. **If it can be removed** at runtime, implement `Removable` (from
   `core/Physics`) — the universe's `postUpdateAll` will delete it.
5. **Serialize**: add fields to `Universe.serialize()`/`deserialize()`.
   Rules: only player-modifiable or runtime-evolving state goes in the save;
   keep a save version field `v`; a rebuilt-from-seed object needs no fields
   unless it differs from its generated state. Preserve entity order exactly —
   gravity accumulation is FP-order-sensitive.
6. **Render**: add a draw path in `render/VisibleUniverse15.ts`. Render reads
   sim state only; line widths use `n / zoom` (CSS pixels at zoom, matching
   the Android reference dp behavior).
7. **Tests** (add to `tests/parity-regression.test.ts` or a new file):
   - same seed → same id/name/state (determinism),
   - serialize round-trip preserves the object,
   - a scripted N-frame run stays byte-identical across two universes,
   - NaN-free smoke run.

## Adding a new mechanic (e.g. a scanner, fuel system)

1. Put the state on the owning entity (usually `Spacecraft`) and the logic in
   an `update(sim, dt)` method — mechanics must advance only through the
   simulator loop, never on wall-clock timers or requestAnimationFrame.
2. Consume randomness only from `sim.rng` (the seeded runtime stream).
   Never import `SYSTEM` from `@thi.ng/random` in game code — it breaks replay
   parity (see P03-T04 fix in `sim/Autopilot15.ts`).
3. If the mechanic is player-controlled, wire input through `input/` widgets
   and map it in `app/MainActivity15.ts`; keep debug-only controls behind the
   `#debug=1` flag per project policy.
4. Expose telemetry through the existing telemetry text pipeline
   (`app/MainActivity15.ts`), then add a unit test that drives the mechanic
   through scripted steps and asserts on serialized state.
5. Any visible module (e.g. an engine pod) must be a real attachment: data
   (id, compatible hardpoints) + drawn geometry in the render layer.

## Determinism rules of thumb

- One seed ⇒ one universe: `rngForInit` builds it, `sim.rng` drives runtime
  effects. Both streams are seeded from `randomSeed`.
- No `Math.random()`, no `Date.now()` inside simulation code (wall-clock time
  enters only through `step(millis)` argument).
- Floating-point order matters: iterate entities/constraints in a fixed order;
  never re-sort arrays that participate in physics accumulation.
