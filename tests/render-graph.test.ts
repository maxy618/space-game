/**
 * P06-T02 render graph tests: order is fixed, alphas opaque-budgeted,
 * UI front-most, and adding a layer preserves the invariant.
 */
import { describe, it, expect } from "vitest";
import { LAYERS, layerById, layerOrder, validateGraph } from "../src/camera/Layers";

describe("P06-T02 layer render graph", () => {
    it("draw order is fixed and back-to-front: backdrop → far → grid → celestial → entities → foreground → emissive → postFX → ui", () => {
        expect(layerOrder()).toEqual([
            "backdrop", "far", "grid", "celestial", "entities", "foreground", "emissive", "postFX", "ui",
        ]);
    });

    it("graph validates: unique ids, alphas in [0,1], UI last and opaque", () => {
        const { ok, errors } = validateGraph();
        expect(errors).toEqual([]);
        expect(ok).toBe(true);
        expect(LAYERS[LAYERS.length - 1].id).toBe("ui");
    });

    it("lookup by id returns the documented owners and spaces", () => {
        expect(layerById("far")!.space).toBe("screen");
        expect(layerById("celestial")!.space).toBe("world");
        expect(layerById("ui")!.owner).toContain("main.ts");
        expect(layerById("nonexistent")).toBeUndefined();
    });

    it("every layer name is non-empty and owned (no anonymous passes)", () => {
        for (const l of LAYERS) {
            expect(l.name.length).toBeGreaterThan(0);
            expect(l.owner.length).toBeGreaterThan(0);
        }
    });

    it("alpha budgets: UI and backdrop fully opaque, foreground subtle", () => {
        expect(layerById("backdrop")!.alpha).toBe(1);
        expect(layerById("ui")!.alpha).toBe(1);
        expect(layerById("foreground")!.alpha).toBeLessThanOrEqual(0.2);
        expect(layerById("far")!.alpha).toBeLessThanOrEqual(0.9);
    });
});
