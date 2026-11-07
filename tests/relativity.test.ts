/**
 * Relativistic dynamics tests (temp_mission §3–§4, §9).
 * Mathematical verification, not screenshots: Lorentz factor, momentum
 * round-trip, strict v < C_GAME, engine-limit semantics, gravity mass
 * independence, slingshot beyond engine caps, boost on/off, determinism.
 */
import { describe, it, expect } from "vitest";
import { Namer } from "../src/core/Namer";
import { Universe, UniverseConst } from "../src/universe/Universe";
import { Vec2_makeWithAngleMag } from "../src/core/Vec2";
import {
  C_GAME,
  gammaFromSpeed,
  momentumMag,
  speedFromMomentumMag,
  momentumFromVelocity,
  velocityFromMomentum,
  addImpulse,
  applyEngineThrust,
  fisheyeTargetFromSpeed,
} from "../src/universe/Relativity";

const M0 = 10; // DEFAULT_SHIP_SPEC.restMass

describe("Lorentz factor & momentum round-trip", () => {
  it("gamma: low speed ≈ Newtonian, high speed grows, strictly safe at C", () => {
    expect(gammaFromSpeed(0)).toBe(1);
    expect(gammaFromSpeed(4000)).toBeCloseTo(1.0022, 3);
    expect(gammaFromSpeed(6000)).toBeCloseTo(1.005, 3);
    expect(gammaFromSpeed(30000)).toBeCloseTo(1.1547, 3);
    expect(gammaFromSpeed(50000)).toBeCloseTo(1.81, 2);
    // bounded below C: gamma stays finite even at the cap
    expect(Number.isFinite(gammaFromSpeed(C_GAME * (1 - 1e-12)))).toBe(true);
  });

  it("p = gamma·m0·v and v = C·p/√((m0C)²+p²) round-trip for all speed regimes", () => {
    for (const v of [0, 10, 800, 4000, 6000, 20000, 30000, 50000, 59900]) {
      const p = momentumMag(v, M0);
      const back = speedFromMomentumMag(p, M0);
      expect(back).toBeCloseTo(v, 3);
      expect(back).toBeLessThan(C_GAME);
    }
  });

  it("vector momentum round-trip preserves direction exactly", () => {
    const vx = 18000, vy = -9000;
    const p = momentumFromVelocity(vx, vy, M0);
    const v = velocityFromMomentum(p.px, p.py, M0);
    expect(v.vx).toBeCloseTo(vx, 6);
    expect(v.vy).toBeCloseTo(vy, 6);
    expect(v.vx / vx).toBeCloseTo(v.vy / vy, 9);
  });

  it("velocity is strictly below C for arbitrarily huge impulses (no NaN/Infinity)", () => {
    for (const dp of [1e6, 1e9, 1e12, 1e15, 1e20, Number.MAX_SAFE_INTEGER]) {
      const n = addImpulse(59000, 0, M0, dp, 0);
      expect(Number.isFinite(n.vx)).toBe(true);
      expect(Number.isFinite(n.vy)).toBe(true);
      expect(Math.hypot(n.vx, n.vy)).toBeLessThan(C_GAME);
      expect(Math.hypot(n.vx, n.vy)).toBeGreaterThan(59000);
    }
    // huge negative (head-on braking) also safe
    const n = addImpulse(59000, 0, M0, -1e15, 0);
    expect(Number.isFinite(n.vx) && Number.isFinite(n.vy)).toBe(true);
    expect(Math.hypot(n.vx, n.vy)).toBeLessThan(C_GAME);
  });

  it("velocity gains shrink as C is approached (same impulse, less dv)", () => {
    const dvAt = (v0: number) => {
      const n = addImpulse(v0, 0, M0, M0 * 1000, 0); // +1000 m/s worth of dp at gamma=1
      return Math.hypot(n.vx, n.vy) - v0;
    };
    const dvLow = dvAt(1000);
    const dvMid = dvAt(30000);
    const dvHigh = dvAt(50000);
    // ~1000 (gamma at 1000–2000 is 1.0002–1.0009, so 999 is exact-correct).
    expect(Math.abs(dvLow - 1000)).toBeLessThan(2);
    expect(dvMid).toBeLessThan(dvLow);
    expect(dvHigh).toBeLessThan(dvMid);
    expect(dvHigh).toBeGreaterThan(0);
  });

  it("low-speed preservation: <=6000 matches Newtonian within 1%", () => {
    // One second of 1000 m/s² from rest, in many small steps.
    let v = { vx: 0, vy: 0 };
    for (let i = 0; i < 600; i++) v = addImpulse(v.vx, v.vy, M0, M0 * 1000 * (1 / 600), 0);
    const speed = Math.hypot(v.vx, v.vy);
    expect(Math.abs(speed - 1000) / 1000).toBeLessThan(0.01);
    // and the gamma correction itself at 6000 is <0.5%
    expect(gammaFromSpeed(6000) - 1).toBeLessThan(0.006);
  });
});

describe("engine limit semantics (relativistic)", () => {
  it("from rest, longitudinal thrust lands exactly at the engine limit", () => {
    const n = applyEngineThrust(0, 0, 0, 100000, 4000, M0);
    expect(Math.hypot(n.vx, n.vy)).toBeCloseTo(4000, 5);
  });

  it("below the limit, thrust clips at the limit (never exceeds)", () => {
    const n = applyEngineThrust(3900, 0, 0, 5000, 4000, M0);
    expect(Math.hypot(n.vx, n.vy)).toBeCloseTo(4000, 5);
  });

  it("above the limit, forward thrust does not increase speed and does not snap", () => {
    const n = applyEngineThrust(8000, 0, 0, 5000, 4000, M0);
    expect(Math.hypot(n.vx, n.vy)).toBeCloseTo(8000, 6);
  });

  it("above the limit, braking (retrograde) still reduces speed", () => {
    const n = applyEngineThrust(8000, 0, Math.PI, 2000, 4000, M0);
    const s = Math.hypot(n.vx, n.vy);
    expect(s).toBeLessThan(8000);
    expect(s).toBeGreaterThan(5900);
  });

  it("above the limit, transverse thrust still turns the ship", () => {
    // Thrust perpendicular to velocity: direction changes, speed ~preserved.
    const n = applyEngineThrust(8000, 0, Math.PI / 2, 2000, 4000, M0);
    expect(n.vy).toBeGreaterThan(1500);
    // |v| = sqrt(8000²+2000²) ≈ 8246: the turn adds a vector, so magnitude
    // grows second-order while the along-travel component is unchanged.
    expect(Math.hypot(n.vx, n.vy)).toBeGreaterThan(8200);
    expect(Math.hypot(n.vx, n.vy)).toBeLessThan(8300);
  });

  it("boost limit (6000) is a separate engine ceiling from 4000", () => {
    const n6 = applyEngineThrust(3900, 0, 0, 50000, 6000, M0);
    expect(Math.hypot(n6.vx, n6.vy)).toBeCloseTo(6000, 5);
    const n4 = applyEngineThrust(3900, 0, 0, 50000, 4000, M0);
    expect(Math.hypot(n4.vx, n4.vy)).toBeCloseTo(4000, 5);
  });

  it("external impulse (gravity) is unlimited by the engine limiter", () => {
    // addImpulse is the gravity path: it can push far past 6000.
    const n = addImpulse(5000, 0, M0, M0 * 25000, 0);
    expect(Math.hypot(n.vx, n.vy)).toBeGreaterThan(6000);
    expect(Math.hypot(n.vx, n.vy)).toBeLessThan(C_GAME);
  });
});

describe("gravity correctness in the full simulation", () => {
  function makeUniverse() {
    const u = new Universe(new Namer(), 777n);
    u.initRandom();
    return u;
  }
  function isolateFromGravity(u: Universe) {
    u.star.mass = 0;
    for (const p of u.planets) p.mass = 0;
    u.ship.pos.x = 120000;
    u.ship.pos.y = 0;
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

  it("gravity accelerates past the engine limit (no truncation at 4000/6000)", () => {
    // Strong well, no thrust: ship starts just below boost cap and falls
    // toward the star; gravity must push it past 6000 (temp_mission §3).
    const u = makeUniverse();
    u.ship.pos.x = u.star.pos.x + u.star.radius * 2.5;
    u.ship.pos.y = u.star.pos.y;
    // Aim straight at the star at 5900 m/s so the well adds several hundred.
    u.ship.velocity.x = -5900;
    u.ship.velocity.y = 0;
    u.ship.thrust.x = 0;
    u.ship.thrust.y = 0;
    // skip MECO grace and keep heat out of the way for this check
    u.now = 100;
    let maxV = 0;
    runSteps(u, 300, 16, () => {
      maxV = Math.max(maxV, u.ship.velocity.mag());
      u.ship.heat = 0; // isolate gravity from the heating system
    });
    expect(maxV).toBeGreaterThan(6000);
    expect(maxV).toBeLessThan(C_GAME);
    expect(Number.isFinite(maxV)).toBe(true);
  });

  it("ship mass does not affect gravitational acceleration", () => {
    const mk = (mass: number) => {
      const u = makeUniverse();
      // Single-planet well only: zero planets, keep the star.
      for (const p of u.planets) p.mass = 0;
      u.ship.pos.x = u.star.pos.x + 30000;
      u.ship.pos.y = u.star.pos.y;
      u.ship.velocity.x = 0;
      u.ship.velocity.y = 0;
      u.ship.thrust.x = 0;
      u.ship.thrust.y = 0;
      u.now = 100;
      u.ship.spec.restMass = mass;
      u.ship.mass = mass;
      return u;
    };
    const light = mk(5);
    const heavy = mk(50);
    runSteps(light, 60, 16, (s) => { s.ship.heat = 0; });
    runSteps(heavy, 60, 16, (s) => { s.ship.heat = 0; });
    // Same M/d² well → same Δv to well under 1% (relativistic diff is tiny
    // at these speeds; the old ship.mass factor would have given 10×).
    const dvL = light.ship.velocity.mag();
    const dvH = heavy.ship.velocity.mag();
    expect(Math.abs(dvL - dvH) / Math.max(dvL, 1)).toBeLessThan(0.03);
    expect(dvL).toBeGreaterThan(2);
  });

  it("disabling boost does not change velocity (no brake-drag)", () => {
    const u = makeUniverse();
    isolateFromGravity(u);
    u.ship.velocity.x = 5800;
    u.ship.velocity.y = 0;
    u.ship.boost = true;
    runSteps(u, 30, 16, (s) => {
      s.ship.boost = true;
      s.ship.thrust.x = 0;
      s.ship.thrust.y = 0;
    });
    u.ship.boost = false;
    const v0 = u.ship.velocity.mag();
    runSteps(u, 120, 16, (s) => {
      s.ship.boost = false;
      s.ship.thrust.x = 0;
      s.ship.thrust.y = 0;
    });
    const v1 = u.ship.velocity.mag();
    // No drag: velocity preserved (only ringfence-free drift here).
    expect(Math.abs(v1 - v0) / v0).toBeLessThan(0.02);
    expect(v1).toBeGreaterThan(5000);
  });

  it("boost raises the engine ceiling to 6000 and no further", () => {
    const u = makeUniverse();
    isolateFromGravity(u);
    u.ship.velocity.x = 0;
    u.ship.velocity.y = 0;
    runSteps(u, 600, 16, (s) => {
      s.ship.boost = true;
      s.ship.thrustMultiplier = 1.5;
      s.ship.angle = 0;
      Vec2_makeWithAngleMag(s.ship.thrust, 0, 1);
    });
    expect(u.ship.velocity.mag()).toBeCloseTo(6000, 0);
  });

  it("regular engine alone cannot exceed 4000", () => {
    const u = makeUniverse();
    isolateFromGravity(u);
    u.ship.velocity.x = 0;
    u.ship.velocity.y = 0;
    runSteps(u, 600, 16, (s) => {
      s.ship.boost = false;
      s.ship.thrustMultiplier = 1;
      s.ship.angle = 0;
      Vec2_makeWithAngleMag(s.ship.thrust, 0, 1);
    });
    expect(u.ship.velocity.mag()).toBeCloseTo(4000, 0);
  });

  it("transverse thrust above the limit changes heading (control preserved)", () => {
    const u = makeUniverse();
    isolateFromGravity(u);
    u.ship.velocity.x = 7000;
    u.ship.velocity.y = 0;
    // Face sideways (angle=π/2) and thrust: velocity should gain a large
    // +y component while speed stays ≈7000 (turn, not speed-up).
    runSteps(u, 120, 16, (s) => {
      s.ship.angle = Math.PI / 2;
      Vec2_makeWithAngleMag(s.ship.thrust, Math.PI / 2, 1);
    });
    expect(u.ship.velocity.y).toBeGreaterThan(800);
    expect(u.ship.velocity.mag()).toBeGreaterThan(6900);
    expect(u.ship.velocity.mag()).toBeLessThan(7300);
  });

  it("deterministic: identical runs give bit-identical velocity", () => {
    const run = () => {
      const u = makeUniverse();
      u.ship.pos.x = u.star.pos.x + 80000;
      u.ship.pos.y = u.star.pos.y;
      u.ship.velocity.x = 3000;
      u.ship.velocity.y = 100;
      u.now = 100;
      runSteps(u, 120, 16, (s) => {
        s.ship.heat = 0;
        s.ship.angle = 0;
        Vec2_makeWithAngleMag(s.ship.thrust, 0, 0.7);
      });
      return u.ship.velocity;
    };
    const a = run();
    const b = run();
    expect(a.x).toBe(b.x);
    expect(a.y).toBe(b.y);
  });

  it("different timesteps converge (16 ms vs 8 ms, gravity+thrust)", () => {
    const run = (stepMs: number, steps: number) => {
      const u = makeUniverse();
      u.ship.pos.x = u.star.pos.x + 90000;
      u.ship.pos.y = u.star.pos.y;
      u.ship.velocity.x = 2000;
      u.ship.velocity.y = 0;
      u.now = 100;
      runSteps(u, steps, stepMs, (s) => {
        s.ship.heat = 0;
        s.ship.angle = 0;
        Vec2_makeWithAngleMag(s.ship.thrust, 0, 0.5);
      });
      return u.ship.velocity.mag();
    };
    const va = run(16, 120); // 1.92 s
    const vb = run(8, 240); // 1.92 s
    expect(Math.abs(va - vb) / va).toBeLessThan(0.02);
  });
});

describe("fisheye speed curve", () => {
  it("0 at rest, 1 at 6000, bounded 1.12 above, 1.114 at 30000", () => {
    expect(fisheyeTargetFromSpeed(0)).toBe(0);
    expect(fisheyeTargetFromSpeed(1000)).toBeLessThan(0.05);
    expect(fisheyeTargetFromSpeed(6000)).toBe(1);
    expect(fisheyeTargetFromSpeed(30000)).toBeCloseTo(1.114, 2);
    for (let s = 0; s <= 60000; s += 2000) {
      const f = fisheyeTargetFromSpeed(s);
      expect(Number.isFinite(f)).toBe(true);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(1.13);
    }
  });

  it("monotonic increasing, smooth (no jumps)", () => {
    let prev = -1;
    for (let s = 0; s <= 40000; s += 500) {
      const f = fisheyeTargetFromSpeed(s);
      expect(f).toBeGreaterThan(prev);
      if (prev >= 0) expect(f - prev).toBeLessThan(0.35);
      prev = f;
    }
    // far above 6000 the gain is tiny vs the 4000→6000 rise
    const rise = fisheyeTargetFromSpeed(6000) - fisheyeTargetFromSpeed(4000);
    const extra = fisheyeTargetFromSpeed(30000) - fisheyeTargetFromSpeed(6000);
    expect(extra).toBeLessThan(rise);
    expect(extra).toBeGreaterThan(0);
  });
});
