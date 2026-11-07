/*
 * Per-spacecraft physical specification (temp_mission §7 groundwork).
 *
 * The current game has one ship with hard-coded numbers. This interface is
 * the seam where future ships plug in: the SIMULATION reads physics from
 * `spec` (mass, engine accel, limits, heating), while RENDERING reads the
 * visual model separately — physics and art never share a knob again.
 *
 * Values below are the current tuned defaults (unchanged gameplay numbers):
 * 4000/6000 engine limits, 1000 m/s² accel, boost ×1.5 thrust. Only the
 * default spec exists; no hangar/selection/fleet is built here.
 */

/** Physical characteristics of a spacecraft (model-independent). */
export interface ShipSpec {
  /** Rest (invariant) mass; gravitational acceleration does not depend on it. */
  restMass: number;
  /** Engine thrust acceleration at full stick (game units/s²). */
  engineAccel: number;
  /** Regular engine speed limit (engine-driven only, not total speed). */
  engineLimit: number;
  /** Boost engine speed limit (engine-driven only, not total speed). */
  boostLimit: number;
  /** Thrust multiplier while boost is engaged (current: 1.5). */
  boostThrustMultiplier: number;
  /** Horizontal visual hull outline (CSS px-equivalent factor); render-only. */
  hullOutline: number;
  /** Heating rate scale (1 = current tuning; future ships differ). */
  heatRateScale: number;
  /** Heat at which the ship is destroyed (normalized 0..1, never changes). */
  maxHeat: number;
}

/** Current playable ship — exact pre-change numbers. */
export const DEFAULT_SHIP_SPEC: ShipSpec = {
  restMass: 10,
  engineAccel: 1000,
  engineLimit: 4000,
  boostLimit: 6000,
  boostThrustMultiplier: 1.5,
  hullOutline: 1.3,
  heatRateScale: 1,
  maxHeat: 1,
};
