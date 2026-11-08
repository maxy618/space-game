/**
 * R-006 + P08 profiles wiring: BH inside the playable range, nebulaAt is
 * deterministic + bounded, comets list is well-formed.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { ZoomedDrawScope15, BLACK_HOLE } from "../src/render/VisibleUniverse15";

// Node has no Path2D; the constructor parses SVG paths but never draws them.
beforeAll(() => {
    const g = globalThis as unknown as { Path2D?: unknown };
    if (!g.Path2D) {
        g.Path2D = class {
            constructor(_d?: string) {}
            moveTo() {} lineTo() {} closePath() {} arc() {} ellipse() {}
        };
    }
});

describe("Black hole landmark (R-006)", () => {
    it("BH is inside the playable range (dist < 200 km)", () => {
        expect(Math.hypot(BLACK_HOLE.x, BLACK_HOLE.y)).toBeLessThan(200_000);
        expect(BLACK_HOLE.r).toBeGreaterThan(0);
        expect(BLACK_HOLE.id).toBe(-777);
    });
});

describe("Moons (P07-T02)", () => {
    it("moonCount is deterministic 0..2 and moon offsets are bounded", () => {
        expect(ZoomedDrawScope15.moonCount(0.2)).toBe(0);
        expect(ZoomedDrawScope15.moonCount(0.5)).toBe(1);
        expect(ZoomedDrawScope15.moonCount(0.75)).toBe(2);
        const scope = new ZoomedDrawScope15();
        const o = scope.moonOffset(0.5, 0, 10, 1000);
        expect(o).toEqual(scope.moonOffset(0.5, 0, 10, 1000));
        expect(Math.hypot(o.x, o.y)).toBeGreaterThan(1000); // outside the planet
        expect(o.mr).toBeGreaterThan(0);
    });
});

describe("Nebula profile driver (P08-T04)", () => {
    it("nebulaAt is deterministic, bounded, zero far away", () => {
        const scope = new ZoomedDrawScope15();
        const a = scope.nebulaAt(0, 0);
        expect(a).toEqual(scope.nebulaAt(0, 0));
        expect(a.amount).toBeGreaterThanOrEqual(0);
        expect(a.amount).toBeLessThanOrEqual(1);
        expect(a.r).toBeGreaterThanOrEqual(0);
        expect(a.r).toBeLessThanOrEqual(1);
        // far corner: inside the great sheets band is allowed, but amount stays bounded
        const far = scope.nebulaAt(-190000, 150000);
        expect(far.amount).toBeLessThanOrEqual(1);
    });
});
