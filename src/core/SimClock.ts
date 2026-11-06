/*
 * Simulation clock helper.
 *
 * Encapsulates the play-speed / pause arithmetic used by the reference
 * player15.ts (Apache-2.0, Copyright 2025 lll69):
 *   drawTime  = playSpeed * (paused ? pauseTime : millis) - pauseOffset
 *   on resume:   pauseOffset += playSpeed * (performance.now() - pauseTime)
 *   on speed ch: pauseOffset += (newSpeed - lastSpeed) * performance.now()
 * Extracted as a pure, DOM-free class for testability (project adaptation).
 */

export const MAX_INACTIVE_TIME = 60000;

export class SimClock {
    playSpeed = 1;
    paused = false;
    needRedraw = false;
    private pauseTime = 0;
    private pauseOffset = 0;
    private lastDrawTime = -1;
    skippedWarning: string | null = null;

    /** Compute the simulation time to draw for this real-time frame. */
    drawTime(millis: number): number {
        if (!this.paused && this.lastDrawTime !== -1) {
            const timeDiff = millis - this.lastDrawTime;
            if (timeDiff > MAX_INACTIVE_TIME) {
                // long inactive period (tab switch etc) — skip it, don't fast-forward
                this.skippedWarning = "Skipped " + timeDiff + " ms";
                this.pauseOffset += timeDiff;
            }
        }
        this.lastDrawTime = millis;
        return this.playSpeed * (this.paused ? this.pauseTime : millis) - this.pauseOffset;
    }

    /** Whether a draw should happen on this frame. */
    shouldDraw(): boolean {
        return !this.paused || this.needRedraw;
    }

    consumeRedraw() {
        this.needRedraw = false;
    }

    pause(now: number) {
        this.pauseTime = now;
        this.paused = true;
    }

    resume(now: number) {
        this.pauseOffset += this.playSpeed * (now - this.pauseTime);
        this.paused = false;
    }

    setSpeed(newSpeed: number, now: number) {
        const lastSpeed = this.playSpeed;
        this.playSpeed = newSpeed;
        this.pauseOffset += (newSpeed - lastSpeed) * now;
    }
}
