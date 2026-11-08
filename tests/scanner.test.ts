/**
 * Scanner tests (user 2026-11-09): pure state machine + save v2 migration.
 */
import { describe, it, expect } from "vitest";
import {
    createScanState, triggerScan, stepScan, scanWaveRadius,
    applyScanReveals, SCAN_COOLDOWN, SCAN_RADIUS, SCAN_WAVE_SECONDS,
} from "../src/universe/Scanner";
import { Universe } from "../src/universe/Universe";
import { Namer } from "../src/core/Namer";

describe("scan state machine", () => {
    it("triggers when ready, refuses while on cooldown", () => {
        const s = createScanState();
        expect(triggerScan(s)).toBe(true);
        expect(triggerScan(s)).toBe(false);
        expect(s.cooldown).toBeCloseTo(SCAN_COOLDOWN, 5);
    });

    it("cooldown drains to zero and scan becomes available again", () => {
        const s = createScanState();
        triggerScan(s);
        for (let i = 0; i < SCAN_COOLDOWN * 2; i++) stepScan(s, 0.5);
        expect(s.cooldown).toBe(0);
        expect(triggerScan(s)).toBe(true);
    });

    it("wave sweeps out with an ease-out and expires", () => {
        const s = createScanState();
        triggerScan(s);
        stepScan(s, SCAN_WAVE_SECONDS / 2);
        const half = scanWaveRadius(s);
        expect(half).toBeGreaterThan(SCAN_RADIUS * 0.6); // ease-out: past halfway
        expect(half).toBeLessThanOrEqual(SCAN_RADIUS);
        stepScan(s, SCAN_WAVE_SECONDS);
        expect(s.waveAge).toBe(-1); // expired
        expect(scanWaveRadius(s)).toBe(0);
    });

    it("reveals bodies within radius only, idempotently", () => {
        const bodies = [
            { x: 40_000, y: 0, scanned: false },   // in range (48 km scan)
            { x: 200_000, y: 0, scanned: false },  // out of range
            { x: 0, y: 0, scanned: true },         // already known
        ];
        const n = applyScanReveals(bodies, 0, 0);
        expect(n).toBe(1);
        expect(bodies[0].scanned).toBe(true);
        expect(bodies[1].scanned).toBe(false);
        expect(bodies[2].scanned).toBe(true);
        expect(applyScanReveals(bodies, 0, 0)).toBe(0); // idempotent
    });
});

describe("save v2: scanned field + v1 migration", () => {
    it("serializes scanned flags (v2) and restores them", () => {
        const u = new Universe(new Namer(), 777n);
        u.initRandom();
        u.planets[0].scanned = true;
        const json = u.serialize();
        const data = JSON.parse(json);
        expect(data.v).toBe(2);
        const u2 = Universe.deserialize(new Namer(), json);
        expect(u2.planets[0].scanned).toBe(true);
        expect(u2.planets[1].scanned).toBe(false);
    });

    it("v1 save migrates: scanned defaults to false, world intact", () => {
        const u = new Universe(new Namer(), 777n);
        u.initRandom();
        const v1 = JSON.parse(u.serialize());
        v1.v = 1;
        delete v1.planets[0].scanned;
        const u2 = Universe.deserialize(new Namer(), JSON.stringify(v1));
        expect(u2.planets.every(p => !p.scanned)).toBe(true);
        expect(u2.planets.length).toBe(v1.planets.length);
    });
});
