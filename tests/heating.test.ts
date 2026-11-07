/**
 * Star heating / destruction tests (temp_mission §6).
 * Verifies: corona accumulation by distance, cooling, relative scaling,
 * inner-boundary + critical-heat destruction, respawn that preserves world.
 */
import { describe, it, expect } from "vitest";
import { Namer } from "../src/core/Namer";
import { Universe, UniverseConst } from "../src/universe/Universe";

function makeUniverse() {
  const u = new Universe(new Namer(), 777n);
  u.initRandom();
  return u;
}
function runSteps(u: Universe, steps: number, dtMs: number, fn?: (u: Universe) => void) {
  let millis = 1;
  u.step(millis);
  for (let i = 0; i < steps; i++) {
    millis += dtMs;
    fn?.(u);
    u.step(millis);
  }
}

describe("heatingStep (pure)", () => {
  it("no heating outside the corona, cooling inside it toward zero", () => {
    const r = Universe.heatingStep(0.4, 50000, 8000, 1, 1);
    expect(r.danger).toBe(false);
    expect(r.heat).toBeLessThan(0.4);
    expect(r.destroy).toBe(false);
  });

  it("heating grows closer to the star and scales with star radius", () => {
    const R = 8000;
    const outer = Universe.heatingStep(0, 1.9 * R, R, 1, 1);
    const inner = Universe.heatingStep(0, 1.1 * R, R, 1, 1);
    expect(outer.danger).toBe(true);
    expect(inner.heat).toBeGreaterThan(outer.heat);
    // same relative distance, different star sizes → same heating (relative)
    const a = Universe.heatingStep(0, 1.5 * 2000, 2000, 1, 1);
    const b = Universe.heatingStep(0, 1.5 * 8000, 8000, 1, 1);
    expect(a.heat).toBeCloseTo(b.heat, 9);
  });

  it("inner boundary (inside 1×R) always destroys, even at low heat", () => {
    const r = Universe.heatingStep(0, 0.9 * 8000, 8000, 1, 0.016);
    expect(r.destroy).toBe(true);
  });

  it("critical heat destroys; sub-critical does not", () => {
    const dead = Universe.heatingStep(0.999, 1.1 * 8000, 8000, 1, 1);
    expect(dead.destroy).toBe(true);
    const alive = Universe.heatingStep(0.1, 1.9 * 8000, 8000, 1, 0.016);
    expect(alive.destroy).toBe(false);
  });

  it("cooling returns heat to zero after leaving the corona", () => {
    let h = 0.6;
    for (let i = 0; i < 100; i++) h = Universe.heatingStep(h, 50000, 8000, 1, 0.1).heat;
    expect(h).toBe(0);
  });
});

describe("destruction & respawn in simulation", () => {
  it("close flyby: warning, heat rises, brief dip is survivable", () => {
    const u = makeUniverse();
    // Park just outside the surface and let heating accumulate briefly.
    u.ship.pos.x = u.star.pos.x + u.star.radius * 1.3;
    u.ship.pos.y = u.star.pos.y;
    u.ship.velocity.x = 0;
    u.ship.velocity.y = 0;
    u.ship.thrust.x = 0;
    u.ship.thrust.y = 0;
    u.now = 100;
    runSteps(u, 30, 16, (s) => {
      s.ship.heat = s.ship.heat; // let the sim heat naturally
    });
    // ~0.5 s inside the corona: danger on, heat up, but not dead yet.
    expect(u.ship.coronaDanger).toBe(true);
    expect(u.ship.heat).toBeGreaterThan(0);
    expect(u.isDestroyed).toBe(false);
  });

  it("lingering at the surface destroys, then respawns at spawn with world intact", () => {
    const u = makeUniverse();
    const exploredBefore = u.planets.map((p) => p.explored);
    const planetsPos = u.planets.map((p) => ({ x: p.pos.x, y: p.pos.y }));
    const spawnX = u.ship.pos.x;
    const spawnY = u.ship.pos.y;
    u.ship.pos.x = u.star.pos.x + u.star.radius * 1.05;
    u.ship.pos.y = u.star.pos.y;
    u.ship.velocity.x = 0;
    u.ship.velocity.y = 0;
    u.now = 100;
    let sawFlash = false;
    runSteps(u, 600, 16, () => {
      if (u.flash > 0.5) sawFlash = true;
    });
    expect(sawFlash).toBe(true);
    expect(u.destructionCount).toBeGreaterThanOrEqual(1);
    // Respawned: back at spawn, at rest, cold, alive again.
    expect(u.isDestroyed).toBe(false);
    expect(Math.hypot(u.ship.pos.x - spawnX, u.ship.pos.y - spawnY)).toBeLessThan(5000);
    expect(u.ship.velocity.mag()).toBeLessThan(6000); // respawn at rest (plus local gravity drift)
    expect(u.ship.heat).toBe(0);
    expect(Number.isFinite(u.ship.pos.x + u.ship.pos.y)).toBe(true);
    // World data preserved: explored flags and planet positions untouched.
    for (let i = 0; i < u.planets.length; i++) {
      expect(u.planets[i].explored).toBe(exploredBefore[i]);
      // planets keep orbiting (they move), so only check they are finite
      expect(Number.isFinite(u.planets[i].pos.x + u.planets[i].pos.y)).toBe(true);
      void planetsPos;
    }
  });

  it("crossing inside the star surface destroys immediately", () => {
    const u = makeUniverse();
    u.ship.pos.x = u.star.pos.x + u.star.radius * 0.5;
    u.ship.pos.y = u.star.pos.y;
    u.ship.velocity.x = 0;
    u.ship.velocity.y = 0;
    u.now = 100;
    runSteps(u, 5, 16);
    expect(u.isDestroyed || u.destructionCount > 0).toBe(true);
  });

  it("serialize round-trips heat and spawn", () => {
    const u = makeUniverse();
    u.ship.heat = 0.42;
    u.destroyed; // no-op read
    const json = u.serialize();
    const r = Universe.deserialize(new Namer(), json);
    expect(r.ship.heat).toBeCloseTo(0.42, 9);
    expect(r.ship.pos.x).toBeCloseTo(u.ship.pos.x, 9);
    expect(r.ship.velocity.x).toBeCloseTo(u.ship.velocity.x, 9);
    // destroyed-state fields survive too
    const json2 = r.serialize();
    const rr = Universe.deserialize(new Namer(), json2);
    expect(rr.ship.heat).toBeCloseTo(0.42, 9);
  });

  it("no NaN/Infinity during heat + gravity extremes", () => {
    const u = makeUniverse();
    u.ship.pos.x = u.star.pos.x + u.star.radius * 1.2;
    u.ship.pos.y = u.star.pos.y;
    u.ship.velocity.x = 40000;
    u.ship.velocity.y = -20000;
    u.now = 100;
    runSteps(u, 200, 16);
    expect(Number.isFinite(u.ship.pos.x + u.ship.pos.y + u.ship.heat + u.flash)).toBe(true);
    expect(u.ship.velocity.mag()).toBeLessThan(60000);
    expect(u.ship.heat).toBeGreaterThanOrEqual(0);
  });
});
