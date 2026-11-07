/*
 * Ship scanner (user 2026-11-09, NMS-style): a periodic active pulse that
 * sweeps a large radius around the ship and reveals bodies it touches.
 * Pure state machine — no DOM, no rendering.
 *
 * Design: cooldown seconds between scans; the pulse travels outward as an
 * expanding wave for WAVE_SECONDS; bodies within SCAN_RADIUS of the ship
 * at TRIGGER time are revealed (simple, honest, testable — the wave is the
 * visual, the reveal happens at once, like NMS).
 */

/** Reveal radius (m) — covers most of a system from mid-orbit. */
export const SCAN_RADIUS = 120_000;
/** Cooldown between scans (seconds). */
export const SCAN_COOLDOWN = 30;
/** Wave visual duration (seconds). */
export const SCAN_WAVE_SECONDS = 3;

export interface ScanState {
    /** Seconds until the next scan is available (0 = ready). */
    cooldown: number;
    /** Age of the active wave (seconds), or -1 when idle. */
    waveAge: number;
}

export function createScanState(): ScanState {
    return { cooldown: 0, waveAge: -1 };
}

/** Trigger a scan. Returns false if still on cooldown. */
export function triggerScan(s: ScanState): boolean {
    if (s.cooldown > 0) return false;
    s.cooldown = SCAN_COOLDOWN;
    s.waveAge = 0;
    return true;
}

/** Advance the scan state by dt (call from the sim step). */
export function stepScan(s: ScanState, dt: number): void {
    if (s.cooldown > 0) s.cooldown = Math.max(0, s.cooldown - dt);
    if (s.waveAge >= 0) {
        s.waveAge += dt;
        if (s.waveAge > SCAN_WAVE_SECONDS) s.waveAge = -1;
    }
}

/** Wave radius (m) at the current age — linear sweep to SCAN_RADIUS. */
export function scanWaveRadius(s: ScanState): number {
    if (s.waveAge < 0) return 0;
    const t = Math.min(1, s.waveAge / SCAN_WAVE_SECONDS);
    // ease-out: fast start, gentle finish — feels like a real pulse
    return SCAN_RADIUS * (1 - (1 - t) * (1 - t));
}

export interface ScannableBody {
    x: number;
    y: number;
    /** True once the scanner has revealed this body. */
    scanned: boolean;
}

/** Reveal every body within SCAN_RADIUS of the ship (mutates scanned). */
export function applyScanReveals(bodies: ScannableBody[], shipX: number, shipY: number): number {
    let revealed = 0;
    for (const b of bodies) {
        if (b.scanned) continue;
        if (Math.hypot(b.x - shipX, b.y - shipY) <= SCAN_RADIUS) {
            b.scanned = true;
            revealed++;
        }
    }
    return revealed;
}
