/*
 * Collision prediction (user 2026-11-08): closed-form time-to-impact for
 * constant-velocity bodies in the plane — the Elite Dangerous "impact alert"
 * model. Thresholds are in SECONDS, never in distance, so a fast far object
 * is treated as more dangerous than a slow near one.
 *
 * All values are the game's own units (meters, seconds). Pure functions:
 * no rendering, no entities — trivially testable.
 */

/** Projection gate: the ship NOSE must point at the threat within this
 * half-angle (radians) for a warning to fire (user: no false positives on
 * landing, where the nose points at the ground but the velocity does not). */
export const IMPACT_NOSE_HALF_ANGLE = Math.PI / 7; // ~25.7°

/** The velocity direction must ALSO point at the threat within this
 * half-angle (both gates required by the user's spec). */
export const IMPACT_TRAJECTORY_HALF_ANGLE = Math.PI / 5; // 36°

/** Warn when impact is closer than this many seconds away. */
export const IMPACT_WARN_SECONDS = 5;
/** Escalate to the red critical state below this. */
export const IMPACT_CRITICAL_SECONDS = 3;
/** Hysteresis: the warning clears only when TTI rises past this. */
export const IMPACT_CLEAR_SECONDS = 7;
/** Minimum closing speed (m/s) — stationary contact (landing approach)
 * never warns even with the nose on target. */
export const IMPACT_MIN_CLOSING = 30;

export interface ImpactCandidate {
    /** Seconds until radii contact, or null when they never touch. */
    tti: number | null;
    /** Signed closing speed along the line of sight (positive = closing). */
    closing: number;
}

/**
 * Time until the two bodies (treated as circles, ship radius + obstacle
 * radius already summed by the caller into R) collide, moving at constant
 * velocities. Solves |r + u·t|² = R² for the SMALLER positive root.
 *
 *   r = obstaclePos − shipPos   u = obstacleVel − shipVel
 *   (u·u)t² + 2(r·u)t + (r·r − R²) = 0
 *
 * Returns tti = null when the quadratic has no positive root (miss or
 * already separating) — a collision course at all.
 */
export function timeToImpact(
    rx: number, ry: number,
    ux: number, uy: number,
    R: number,
): ImpactCandidate {
    const uu = ux * ux + uy * uy;
    const ru = rx * ux + ry * uy;
    const rr = rx * rx + ry * ry;
    // closing speed along the line of sight (positive = approaching)
    const closing = -(ru / Math.max(1e-9, Math.sqrt(rr)));
    // already overlapping: contact exists NOW
    if (rr <= R * R) return { tti: 0, closing };
    if (uu < 1e-9) return { tti: null, closing }; // same velocity — no approach
    const D = ru * ru - uu * (rr - R * R);
    if (D < 0) return { tti: null, closing }; // paths never come within R
    const sq = Math.sqrt(D);
    const t1 = (-ru - sq) / uu;
    const t2 = (-ru + sq) / uu;
    const t = t1 > 0 ? t1 : (t2 > 0 ? t2 : null);
    return { tti: t, closing };
}

/** Angle-difference helper wrapped to [−π, π]. */
function angleDiff(a: number): number {
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
}

export interface ImpactGateInput {
    /** Ship heading (radians, ship.angle). */
    shipAngle: number;
    /** Direction to the threat (radians, atan2 of r). */
    bearing: number;
    /** Direction of the ship's velocity RELATIVE to the obstacle
     * (= −u, radians). The trajectory gate: this must aim at the threat. */
    relCourse: number;
    /** Closing speed along the line of sight (m/s, positive = closing). */
    closing: number;
}

/**
 * User's anti-false-positive gates (2026-11-08): a warning requires BOTH
 * the ship's NOSE and its TRAJECTORY (relative velocity) to aim at the
 * threat, plus a real closing speed. Landing on a planet fails: the ship
 * decelerates to near-zero, so the closing-speed gate (and usually the
 * trajectory gate) never passes.
 */
export function impactGatesPass(g: ImpactGateInput): boolean {
    if (g.closing < IMPACT_MIN_CLOSING) return false;
    if (Math.abs(angleDiff(g.bearing - g.shipAngle)) > IMPACT_NOSE_HALF_ANGLE) return false;
    if (Math.abs(angleDiff(g.relCourse - g.bearing)) > IMPACT_TRAJECTORY_HALF_ANGLE) return false;
    return true;
}

/**
 * Safety-system decision (user 2026-11-09): at the LAST moment, choose
 * whether braking to ≤500 m/s saves us, or evasive thrust (perpendicular
 * dodge) is cheaper. Pure and testable.
 *
 * @param closing  relative closing speed (m/s)
 * @param tti      seconds to impact predicted by the constant-velocity model
 * @param engineAccel engine accel (m/s²)
 * @param speedLimit safe speed to reach (500)
 */
export type SafeManeuver = "brake" | "evade" | "brake-evade";
export function decideSafeAction(
    closing: number,
    tti: number | null,
    engineAccel: number,
    safeSpeed: number,
): "brake" | "evade" {
    return decideSafeManeuver(closing, tti, engineAccel, safeSpeed, 0, 0) === "evade" ? "evade" : "brake";
}
export function decideSafeManeuver(
    closing: number,
    tti: number | null,
    engineAccel: number,
    safeSpeed: number,
    missDist: number = 0,
    lateralErr: number = 0,
): SafeManeuver {
    const a = Math.max(1, engineAccel);
    if (tti === null || tti <= 0) return "brake";
    const closingDist = closing * tti;
    const dv = Math.max(0, closing - safeSpeed);
    const brakeDist = (dv * dv) / (2 * a);
    const brakeTime = dv / a;
    const brakeOk = brakeTime <= tti * 0.9 && brakeDist <= closingDist * 0.62;
    const needLateral = Math.max(0, missDist + 120 - Math.abs(lateralErr));
    const evadeTime = needLateral > 0 ? Math.sqrt((2 * needLateral) / a) : 0;
    const evadeOk = needLateral > 0 ? evadeTime <= tti * 0.85 : true;
    if (brakeOk) return "brake";
    if (evadeOk) return "evade";
    return "brake-evade";
}

/**
 * Latched-warning persistence (kept): releases only when physics clears.
 */
export function impactLatchedThreat(tti: number | null, closing: number): boolean {
    return tti !== null && tti <= IMPACT_CLEAR_SECONDS && closing >= IMPACT_MIN_CLOSING;
}

/** Warning urgency state for the HUD. */
export type ImpactLevel = "none" | "warning" | "critical";

export interface ImpactState {
    level: ImpactLevel;
    tti: number;
}

/** One precomputed threat candidate (caller fills from live bodies). */
export interface ImpactCandidateInput {
    bearing: number;
    relCourse: number;
    closing: number;
    tti: number;
}

/**
 * Full-frame threat evaluation: pick the most urgent body (smallest TTI
 * among those passing the gates).
 */
export function evaluateImpact(
    candidates: ImpactCandidateInput[],
    shipAngle: number,
): ImpactState | null {
    let best: ImpactCandidateInput | null = null;
    for (const c of candidates) {
        if (c.tti > IMPACT_CLEAR_SECONDS) continue;
        if (!impactGatesPass({
            shipAngle,
            bearing: c.bearing,
            relCourse: c.relCourse,
            closing: c.closing,
        })) continue;
        if (best === null || c.tti < best.tti) best = c;
    }
    if (best === null) return null;
    const level: ImpactLevel = best.tti <= IMPACT_CRITICAL_SECONDS ? "critical" : "warning";
    return { level, tti: best.tti };
}
