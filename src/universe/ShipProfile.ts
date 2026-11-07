/*
 * Data-driven spacecraft profile (user 2026-11-08).
 *
 * Every per-ship characteristic the simulation and the HUD need lives here,
 * NOT in hardcoded branches, so future spacecraft can differ in engine
 * characteristics, boost behavior, heating resistance, glow color and
 * destruction effects without touching the physics code. There is
 * deliberately NO hangar/selection system yet — ships simply carry a
 * profile; a future phase can add more profiles and a picker.
 *
 * Units are the game's own (meters, seconds, px/s) — no SI, no relativity.
 */

export interface ShipProfile {
    /** Display name (reserved for future ship selection UI). */
    name: string;
    /** Engine acceleration at full stick, px/s². */
    engineAccel: number;
    /**
     * Hard ENGINE cap: the regular engine can never push the ship's speed
     * past this. It is NOT a total-velocity cap — gravity may exceed it.
     */
    engineSpeedCap: number;
    /** Thrust multiplier while the boost burner is engaged. */
    boostAccelMultiplier: number;
    /** ENGINE cap while the boost burner is engaged (same semantics). */
    boostSpeedCap: number;
    /** Heat resistance: higher survives the stellar corona longer. */
    heatTolerance: number;
    /** Heat cooldown rate multiplier while away from the star. */
    coolRate: number;
    /** RGB triplet "r,g,b" of the burner — drives the boost screen glow. */
    boostGlowColor: string;
    /** Particle/debris count multiplier for the destruction effect. */
    destructionScale: number;
}

/** The placeholder MV-15: exactly the current gameplay feel. */
export const DEFAULT_SHIP_PROFILE: ShipProfile = {
    name: "MV-15",
    engineAccel: 1000,
    engineSpeedCap: 4_000,
    boostAccelMultiplier: 1.5,
    boostSpeedCap: 6_000,
    heatTolerance: 1,
    coolRate: 1,
    boostGlowColor: "90, 190, 255",
    destructionScale: 1,
};
