/*
 * RoutePilot (user 2026-11-09): the simple A→B autopilot — NOT the old
 * full landing-tour autopilot. Behavior contract:
 *
 *  - CHASE: point the nose at the target (or a threat-avoiding hold),
 *    full thrust; boost auto-engages while far and aligned (the user's
 *    "форсаж авто").
 *  - BRAKE: inside the braking window, flip retrograde and decelerate.
 *  - ARRIVED: hold position at arriveDist from the target center; thrust 0.
 *  - THREAT (user spec): if any body sits on the course (closed-form TTI
 *    < 5 s), the pilot does NOT dodge — it BRAKES TO A STOP and waits,
 *    drawing the route line red until the player steers the nose back
 *    onto the course (within RESUME_ANGLE) and the threat is gone.
 *
 * Pure control: reads bodies, writes ship.thrust/boost. No rendering.
 */

import { timeToImpact, IMPACT_WARN_SECONDS } from "../universe/CollisionPredict";

export interface RouteTarget {
    x: number;
    y: number;
    /** Surface radius (m) — the pilot stops arriveDist above it. */
    radius: number;
    vx?: number;
    vy?: number;
}

export interface RouteThreat {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
}

export type RoutePilotPhase = "chase" | "brake" | "arrived" | "stopped";

export interface RoutePilotState {
    active: boolean;
    phase: RoutePilotPhase;
    /** Seconds of boost still wanted (recomputed each step). */
    wantBoost: boolean;
}

export function createRoutePilot(): RoutePilotState {
    return { active: false, phase: "chase", wantBoost: false };
}

/** Relative-approach helpers (target velocity included). */
export const PILOT_ARRIVE_DIST = 600; // stop this far above the surface
export const PILOT_RESUME_ANGLE = Math.PI / 12; // 15°

function relDist(tx: number, ty: number, tvx: number, tvy: number, sx: number, sy: number, svx: number, svy: number): { d: number; closing: number } {
    const dx = tx - sx;
    const dy = ty - sy;
    const d = Math.hypot(dx, dy);
    // positive closing = the distance shrinks (ship moving toward target)
    const closing = ((svx - tvx) * dx + (svy - tvy) * dy) / Math.max(1e-9, d);
    return { d, closing };
}

/** Closing speed toward the target along the line of sight (m/s). */

/**
 * One pilot step. Mutates thrust/boost via the returned intent — the
 * caller applies it (keeps this pure and testable).
 */
export interface PilotIntent {
    thrustX: number;
    thrustY: number;
    boost: boolean;
    stopRequested: boolean;
}

export function pilotStep(
    s: RoutePilotState,
    target: RouteTarget,
    threats: RouteThreat[],
    ship: { x: number; y: number; vx: number; vy: number; angle: number },
    dt: number,
    engineAccel: number,
): PilotIntent {
    const none: PilotIntent = { thrustX: 0, thrustY: 0, boost: false, stopRequested: false };
    if (!s.active) return none;

    // 1. threat check: any body on the course closing within the warn window
    let threat = false;
    for (const b of threats) {
        const rx = b.x - ship.x;
        const ry = b.y - ship.y;
        const ux = b.vx - ship.vx;
        const uy = b.vy - ship.vy;
        const res = timeToImpact(rx, ry, ux, uy, b.radius + 30);
        if (res.tti !== null && res.tti < IMPACT_WARN_SECONDS) { threat = true; break; }
    }
    if (threat && s.phase !== "stopped") s.phase = "stopped";

    const { d, closing } = relDist(target.x, target.y, target.vx ?? 0, target.vy ?? 0, ship.x, ship.y, ship.vx, ship.vy);
    const bearing = Math.atan2(target.y - ship.y, target.x - ship.x);
    const headingErr = Math.abs(((bearing - ship.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);

    if (s.phase === "stopped") {
        if (threat) {
            // hold the stop: brake to zero, wait for the player
            const spd = Math.hypot(ship.vx, ship.vy);
            if (spd > 5) {
                return { thrustX: -ship.vx / spd, thrustY: -ship.vy / spd, boost: false, stopRequested: true };
            }
            return { ...none, stopRequested: true };
        }
        // resume only when the player has steered back onto the course
        if (headingErr < PILOT_RESUME_ANGLE) s.phase = "chase";
        else return { ...none, stopRequested: true };
    }

    const arrive = target.radius + PILOT_ARRIVE_DIST;
    if (d <= arrive + 50) {
        s.phase = "arrived";
        return none; // hold: no thrust (the body keeps orbiting; fine for now)
    }

    // braking window: v²/(2a) distance heuristic, evaluated on closing speed
    const brakeDist = (closing * closing) / (2 * engineAccel) + arrive;
    if (d < brakeDist * 1.15 && closing > 50) s.phase = "brake";
    else s.phase = closing > -50 ? "chase" : "brake";

    if (s.phase === "brake") {
        // full retrograde of the RELATIVE velocity — kills the closing speed
        const rvx = ship.vx - (target.vx ?? 0);
        const rvy = ship.vy - (target.vy ?? 0);
        const rm = Math.hypot(rvx, rvy);
        if (rm > 20) {
            return { thrustX: -rvx / rm, thrustY: -rvy / rm, boost: false, stopRequested: false };
        }
        return none;
    }

    // chase: align + full thrust; boost while far and roughly aligned
    const boost = d > 25_000 && headingErr < Math.PI / 5;
    s.wantBoost = boost;
    const ax = Math.cos(bearing);
    const ay = Math.sin(bearing);
    return { thrustX: ax, thrustY: ay, boost, stopRequested: false };
}
