/*
 * Pure stellar-corona hazard model (user 2026-11-08, reworked 2026-11-09).
 *
 * Deliberately simple: one heat accumulator 0..1, three zones scaled to
 * each star's radius — no convection, no SI units, no relativity.
 *
 *   dist ≥ R × STAR_CORONA_FACTOR  → safe: heat cools down (ship far away)
 *   R × STAR_KILL_FACTOR < dist < corona → danger: heat builds, faster
 *         the deeper the ship flies (quadratic proximity curve)
 *   dist ≤ R × STAR_KILL_FACTOR   → touching the star: instant destruction
 *
 * Hot-zone countdown (user 2026-11-09): entering the HOTTEST half of the
 * danger zone starts a countdown — at least 8 seconds (weaker stars and
 * tougher profiles give more), scaled by how deep the ship is. Leaving
 * the hot zone pauses the countdown; full cooldown resets it. Destroyed
 * only by the countdown expiring or by touching the star itself.
 */

/** Heating begins (corona outer edge), × star radius. */
export const STAR_CORONA_FACTOR = 1.6;
/** Inner boundary (≈ touching the surface) — instant destruction, × radius. */
export const STAR_KILL_FACTOR = 1.08;
/** Proximity t beyond which the hot-zone countdown starts (0..1). */
export const STAR_HOTZONE_T = 0.55;
/** Heat recovered per second while outside the corona. */
export const STAR_COOL_RATE = 0.3;
/** Countdown resets when the hull cools below this. */
export const STAR_COOL_RESET = 0.35;

export interface StarHeatResult {
    /** Updated heat accumulator, clamped to [0, 1]. */
    heat: number;
    /** True when the ship must be destroyed this step. */
    destroy: boolean;
    /**
     * Countdown seconds until destruction (null = none running). The app
     * layer shows "T−…" while this is non-null.
     */
    countdown: number | null;
    /** Proximity 0..1 (corona→kill); the app layers warn off this. */
    proximity: number;
    /** True while inside the hot zone (countdown ticking). */
    hot: boolean;
}

/**
 * Advance the heat state by one simulation step.
 *
 * @param heat          current heat accumulator 0..1
 * @param dist          distance from the star CENTER (meters)
 * @param starRadius    star radius (meters) — zones scale with it
 * @param dt            step length (seconds)
 * @param tolerance     heat resistance (higher survives longer); ≥ 0.01
 * @param coolRate      cooldown multiplier while away from the star
 * @param countdownIn   countdown seconds carried over from previous steps
 */
export function starHeatStep(
    heat: number,
    dist: number,
    starRadius: number,
    dt: number,
    tolerance: number = 1,
    coolRate: number = 1,
    countdownIn: number | null = null,
): StarHeatResult {
    const killDist = starRadius * STAR_KILL_FACTOR;
    const coronaDist = starRadius * STAR_CORONA_FACTOR;
    // touching the star: destruction, no matter how cold the hull was
    if (dist <= killDist) return { heat: 1, destroy: true, countdown: null, proximity: 1, hot: true };
    // safe zone: cool down (also the branch for non-positive dt)
    if (dist >= coronaDist || !(dt > 0)) {
        const cooled = Math.max(0, heat - Math.max(0, dt) * STAR_COOL_RATE * coolRate);
        const stillActive = countdownIn !== null && cooled >= STAR_COOL_RESET;
        return { heat: cooled, destroy: false, countdown: stillActive ? countdownIn : null, proximity: 0, hot: false };
    }
    // danger zone: proximity 0..1 between corona edge and kill boundary
    const t = (coronaDist - dist) / (coronaDist - killDist);
    const hot = t >= STAR_HOTZONE_T;
    let countdown = countdownIn;
    if (hot) {
        // entering hottest zone starts the timer; deeper = less grace.
        // Minimum 8 s (guaranteed), scaled by hull tolerance.
        if (countdown === null) {
            const depth = (t - STAR_HOTZONE_T) / (1 - STAR_HOTZONE_T); // 0..1 in the hot half
            countdown = Math.max(8, (16 - 8 * depth) * tolerance) * Math.min(1.6, Math.max(1, starRadius / 3600));
        } else {
            countdown -= dt;
        }
    }
    // heat still accumulates in the whole danger zone (drives the vignette)
    const rate = (0.15 + 1.35 * t * t) / Math.max(0.01, tolerance);
    const heated = Math.min(1, heat + dt * rate);
    return { heat: heated, destroy: countdown !== null && countdown <= 0, countdown, proximity: t, hot };
}
