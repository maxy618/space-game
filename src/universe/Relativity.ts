/*
 * Relativistic spacecraft dynamics (temp_mission §3–§4).
 *
 * Pure math, no game state. The game keeps BODY velocity as the public state
 * (camera, telemetry, autopilot all read velocity). Forces are applied as
 * momentum impulses: p = γ·m0·v, dp = F·dt, then v = C·p/√((m0·C)²+|p|²).
 * At ordinary speeds (≤6000) γ ≈ 1.005, so gameplay is preserved; the
 * relativistic stiffening only matters on slingshots toward C_GAME.
 *
 * Research (OpenStax University Physics 5.8; LibreTexts 27.3; Wikipedia
 * Lorentz factor; MIT 8.033 f24 lec07): p = γ·m0·v with
 * γ = 1/√(1−v²/c²), F = dp/dt, rest mass m0 invariant. This is special
 * relativity in a Newtonian gravitational field — NOT general relativity.
 * Near a star the game applies Newtonian gravity (G·M/d²) as the force and
 * Special Relativity for the spacecraft response; honest approximation.
 *
 * Units (verified against Universe/Physics/tests): positions meters,
 * time seconds, velocity m/s, mass arbitrary game units, G = 1e-2.
 * C_GAME is therefore in game units/sec (m/s here).
 */

/** In-game speed of light (game units per second).
 * Candidates compared (γ = 1/√(1−β²), β = v/C):
 *   C=20000: γ(4000)=1.0206, γ(6000)=1.0483 — too visible at cruise.
 *   C=40000: γ(4000)=1.0050, γ(6000)=1.0114 — borderline.
 *   C=60000: γ(4000)=1.0022, γ(6000)=1.0050 — <0.5% at boost, γ(30000)=1.155,
 *            γ(50000)=1.81 — gradual, noticeable only on slingshots.
 *   C=100000: γ(6000)=1.0018 — relativistic feel invisible until >30000.
 * 60000 is the smallest value that preserves ordinary feel (<0.5%) while
 * making approach-to-c noticeable well within slingshot speeds. */
export const C_GAME = 60_000;

/** Lorentz factor from speed (speed < C_GAME guaranteed by construction). */
export function gammaFromSpeed(speed: number): number {
  const beta = Math.min(speed / C_GAME, 1 - 1e-12);
  return 1 / Math.sqrt(Math.max(1 - beta * beta, 1e-15));
}

/** Relativistic momentum magnitude p = γ·m0·v. */
export function momentumMag(speed: number, restMass: number): number {
  return gammaFromSpeed(speed) * restMass * speed;
}

/** Speed from momentum magnitude, numerically stable inverse:
 * v = C·p / √((m0·C)² + p²). Always < C, finite for any p ≥ 0. */
export function speedFromMomentumMag(pMag: number, restMass: number): number {
  if (pMag <= 0) return 0;
  if (!Number.isFinite(pMag)) return C_GAME * (1 - 1e-12);
  const m0C = restMass * C_GAME;
  const v = (C_GAME * pMag) / Math.sqrt(m0C * m0C + pMag * pMag);
  if (!Number.isFinite(v)) return C_GAME * (1 - 1e-12);
  return Math.min(v, C_GAME * (1 - 1e-12));
}

/** Vector velocity from momentum vector (preserves direction, caps at C). */
export function velocityFromMomentum(px: number, py: number, restMass: number): { vx: number; vy: number } {
  const pMag = Math.hypot(px, py);
  if (pMag <= 1e-12) return { vx: 0, vy: 0 };
  const vMag = speedFromMomentumMag(pMag, restMass);
  const s = vMag / pMag;
  return { vx: px * s, vy: py * s };
}

/** Vector momentum from velocity vector. */
export function momentumFromVelocity(vx: number, vy: number, restMass: number): { px: number; py: number } {
  const vMag = Math.hypot(vx, vy);
  if (vMag <= 0) return { px: 0, py: 0 };
  const pMag = momentumMag(vMag, restMass);
  const s = pMag / vMag;
  return { px: vx * s, py: vy * s };
}

/**
 * Add a momentum impulse (dp) to a velocity state, relativistically.
 * dp = F·dt with constant restMass. Returns the new velocity; always |v|<C.
 * At low speed this is v + dp/m0 to within ~0.5%.
 */
export function addImpulse(
  vx: number, vy: number, restMass: number, dpx: number, dpy: number,
): { vx: number; vy: number } {
  const p = momentumFromVelocity(vx, vy, restMass);
  return velocityFromMomentum(p.px + dpx, p.py + dpy, restMass);
}

/**
 * Engine thrust with a speed limit, relativistically and direction-aware.
 *
 * `angle` is the thrust direction, `deltaV` the Newtonian thrust increment
 * (MAIN_ENGINE_ACCEL·dt·multiplier·thrustMag, a velocity change at γ=1).
 * The limiter splits the thrust impulse into longitudinal (along v) and
 * transverse (perpendicular to v):
 *  - above the limit, any longitudinal component that would increase speed
 *    is dropped; braking (negative longitudinal) and transverse steering
 *    still apply — control is never fully disabled.
 *  - below the limit, the full impulse is accepted unless it would exceed
 *    the limit; then the longitudinal component is binary-searched down to
 *    land exactly at the limit (transverse kept whole).
 * External forces (gravity) are applied outside this function and are never
 * truncated here, so they can exceed the limit freely (bounded only by C).
 */
export function applyEngineThrust(
  vx: number, vy: number, angle: number, deltaV: number,
  limit: number, restMass: number,
): { vx: number; vy: number } {
  if (!Number.isFinite(deltaV) || deltaV === 0) return { vx, vy };
  const ux = Math.cos(angle), uy = Math.sin(angle);
  // Momentum impulse of the full thrust (Newtonian deltaV → dp = m0·deltaV).
  const dpxFull = restMass * deltaV * ux;
  const dpyFull = restMass * deltaV * uy;
  const vMag = Math.hypot(vx, vy);
  const p = momentumFromVelocity(vx, vy, restMass);

  if (vMag < 1e-9) {
    // From rest: all thrust is longitudinal from rest; cap by binary search.
    const vFull = velocityFromMomentum(p.px + dpxFull, p.py + dpyFull, restMass);
    if (Math.hypot(vFull.vx, vFull.vy) <= limit) return vFull;
    let lo = 0, hi = 1;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      const v = velocityFromMomentum(p.px + dpxFull * mid, p.py + dpyFull * mid, restMass);
      if (Math.hypot(v.vx, v.vy) <= limit) lo = mid; else hi = mid;
    }
    return velocityFromMomentum(p.px + dpxFull * lo, p.py + dpyFull * lo, restMass);
  }

  const vhx = vx / vMag, vhy = vy / vMag;
  const dpDotV = (dpxFull * vhx + dpyFull * vhy); // momentum units along v̂
  // Longitudinal / transverse decomposition of the thrust impulse.
  const parX = dpDotV * vhx, parY = dpDotV * vhy;
  const perX = dpxFull - parX, perY = dpyFull - parY;

  if (vMag >= limit) {
    // Above the engine limit: drop any speed-increasing longitudinal part.
    // Braking (dpDotV < 0) and transverse steering are preserved.
    if (dpDotV > 0) {
      return velocityFromMomentum(p.px + perX, p.py + perY, restMass);
    }
    return velocityFromMomentum(p.px + dpxFull, p.py + dpyFull, restMass);
  }

  // Below the limit: accept full thrust unless it would exceed the limit.
  const vFull = velocityFromMomentum(p.px + dpxFull, p.py + dpyFull, restMass);
  if (Math.hypot(vFull.vx, vFull.vy) <= limit) return vFull;
  // Binary-search the longitudinal scale (transverse kept whole). Pure
  // transverse thrust (dpDotV≈0) may exceed by a tiny second-order amount;
  // that is a turn at constant speed, which must remain possible.
  if (Math.abs(dpDotV) < 1e-12) return vFull;
  let lo = 0, hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const v = velocityFromMomentum(p.px + perX + parX * mid, p.py + perY + parY * mid, restMass);
    if (Math.hypot(v.vx, v.vy) <= limit) lo = mid; else hi = mid;
  }
  return velocityFromMomentum(p.px + perX + parX * lo, p.py + perY + parY * lo, restMass);
}

/**
 * Fisheye warp-boost target strength from ACTUAL speed (not boost button).
 * Artistic curve, not physics — deliberately not tied to γ.
 *  speed ≤ 6000: (speed/6000)³ — 0 at rest, 0.037 at 2000, ~0.30 at 4000,
 *    1.0 at 6000 (preserves current appearance at 6000).
 *  speed > 6000: 1 + 0.12·(1 − exp(−(speed−6000)/8000)) — bounded at 1.12,
 *    1.114 at 30000 (noticeable but not enormous vs 6000).
 * Combined with k = 0.30 · fisheyeSmooth this keeps the 6000 look and grows
 * smoothly/boundedly above it. The caller smooths toward this target.
 */
export function fisheyeTargetFromSpeed(speed: number): number {
  if (!Number.isFinite(speed) || speed <= 0) return 0;
  if (speed < 6000) {
    const t = speed / 6000;
    return t * t * t;
  }
  return 1 + 0.12 * (1 - Math.exp(-(speed - 6000) / 8000));
}
