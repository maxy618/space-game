/*
 * Pure stellar-corona hazard model (user 2026-11-08).
 *
 * Deliberately simple: one heat accumulator 0..1, three zones scaled to
 * each star's radius — no convection, no SI units, no relativity.
 *
 *   dist ≥ R × STAR_CORONA_FACTOR  → safe: heat cools down (ship far away)
 *   R × STAR_KILL_FACTOR < dist < corona → danger: heat builds, faster
 *         the deeper the ship flies (quadratic proximity curve)
 *   dist ≤ R × STAR_KILL_FACTOR   → inner danger boundary: destroyed
 *
 * Zone bounds are proportional to the star radius, so a small K-class star
 * has a tight kill zone and a giant O-class star a huge one. Max bounds
 * stay below the minimum planet-orbit/spawn distance (16 000 m), so
 * spawning is always safe.
 */

/** Heating begins (corona outer edge), × star radius. */
export const STAR_CORONA_FACTOR = 1.9;
/** Inner danger boundary — instant destruction, × star radius. */
export const STAR_KILL_FACTOR = 1.45;
/** Heat recovered per second while outside the corona. */
export const STAR_COOL_RATE = 0.3;

export interface StarHeatResult {
    /** Updated heat accumulator, clamped to [0, 1]. */
    heat: number;
    /** True when the ship must be destroyed this step. */
    destroy: boolean;
}

/**
 * Advance the heat state by one simulation step.
 *
 * @param heat       current heat accumulator 0..1
 * @param dist       distance from the star CENTER (meters)
 * @param starRadius star radius (meters) — zones scale with it
 * @param dt         step length (seconds)
 * @param tolerance  heat resistance (higher survives longer); ≥ 0.01
 * @param coolRate   cooldown multiplier while away from the star
 */
export function starHeatStep(
    heat: number,
    dist: number,
    starRadius: number,
    dt: number,
    tolerance: number = 1,
    coolRate: number = 1,
): StarHeatResult {
    const killDist = starRadius * STAR_KILL_FACTOR;
    const coronaDist = starRadius * STAR_CORONA_FACTOR;
    // inner danger boundary: destruction, no matter how cold the hull was
    if (dist <= killDist) return { heat: 1, destroy: true };
    // safe zone: cool down (also the branch for non-positive dt)
    if (dist >= coronaDist || !(dt > 0)) {
        return { heat: Math.max(0, heat - Math.max(0, dt) * STAR_COOL_RATE * coolRate), destroy: false };
    }
    // danger zone: proximity 0..1 between corona edge and kill boundary
    const t = (coronaDist - dist) / (coronaDist - killDist);
    const rate = (0.15 + 1.35 * t * t) / Math.max(0.01, tolerance);
    const heated = Math.min(1, heat + dt * rate);
    return { heat: heated, destroy: heated >= 1 };
}
