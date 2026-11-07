/**
 * P07-T01 celestial family contracts:
 * six families, macro-first layer order, emissive budgets, phone silhouettes.
 */
import { describe, it, expect } from "vitest";
import { FAMILIES, familyById } from "../src/camera/Celestial";

describe("P07-T01 celestial families", () => {
    it("six families exist with unique ids", () => {
        expect(FAMILIES.length).toBe(6);
        const ids = new Set(FAMILIES.map(f => f.id));
        expect(ids.size).toBe(6);
        expect([...ids].sort()).toEqual(
            ["asteroid", "blackHole", "nebula", "planet", "ringed", "star"].sort(),
        );
    });

    it("every family has a macro-first layer stack (≥2 layers)", () => {
        for (const f of FAMILIES) {
            expect(f.layers.length).toBeGreaterThanOrEqual(2);
            expect(f.layers[0].length).toBeGreaterThan(0);
        }
    });

    it("silhouette grammar differs per family (no palette-swap clones)", () => {
        const stacks = new Set(FAMILIES.map(f => f.layers.join(">")));
        expect(stacks.size).toBe(FAMILIES.length);
    });

    it("emissive budget: stars and black holes glow, planets/asteroids do not", () => {
        expect(familyById("star")!.emissive).toBe(1);
        expect(familyById("planet")!.emissive).toBe(0);
        expect(familyById("asteroid")!.emissive).toBe(0);
        expect(familyById("ringed")!.emissive).toBe(0);
        expect(familyById("nebula")!.emissive).toBeGreaterThan(0);
        expect(familyById("nebula")!.emissive).toBeLessThan(0.5);
        expect(familyById("blackHole")!.baseColor).toBe("#000000");
    });

    it("all families except nebulae keep a phone-scale silhouette", () => {
        for (const f of FAMILIES) {
            if (f.id === "nebula") {
                expect(f.silhouetteAtPhone).toBe(false);
            } else {
                expect(f.silhouetteAtPhone).toBe(true);
            }
        }
    });

    it("layer stacks are ordered macro → regional → fine (documented names)", () => {
        const star = familyById("star")!;
        expect(star.layers.indexOf("corona")).toBeLessThan(star.layers.indexOf("disc"));
        const planet = familyById("planet")!;
        expect(planet.layers.indexOf("disc")).toBe(0); // disc first, patches later
        const ringed = familyById("ringed")!;
        expect(ringed.layers.indexOf("ringSystem")).toBeGreaterThan(ringed.layers.indexOf("disc")); // rings enclose
        const bh = familyById("blackHole")!;
        expect(bh.layers[0]).toBe("shadow"); // darkest core first
    });
});
