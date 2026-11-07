/**
 * Celestial visual families (Phase 07).
 *
 * Pure per-family contracts: which layers each family has, in what order,
 * and how they scale with projected size. The renderer maps these to
 * drawing calls; the tests pin the contracts so art cannot silently drift.
 */

export type CelestialFamily =
    | "star"
    | "planet"
    | "ringed"
    | "asteroid"
    | "nebula"
    | "blackHole";

export interface FamilyDef {
    id: CelestialFamily;
    displayName: string;
    /** Ordered layer stack (macro → fine). */
    layers: string[];
    /** Base color token. */
    baseColor: string;
    /** Emissive budget: 0 = none, 1 = fully emissive body. */
    emissive: number;
    /** Whether the silhouette persists at LOD "macro" (phone scale). */
    silhouetteAtPhone: boolean;
}

export const FAMILIES: FamilyDef[] = [
    {
        id: "star",
        displayName: "Star",
        layers: ["corona", "disc", "surfaceActivity"],
        baseColor: "#FFFFFF",
        emissive: 1,
        silhouetteAtPhone: true,
    },
    {
        id: "planet",
        displayName: "Planet",
        layers: ["disc", "regionalPatch", "limb"],
        baseColor: "#A7A7CA",
        emissive: 0,
        silhouetteAtPhone: true,
    },
    {
        id: "ringed",
        displayName: "Ringed planet",
        layers: ["disc", "regionalPatch", "ringSystem"],
        baseColor: "#CDBCB0",
        emissive: 0,
        silhouetteAtPhone: true,
    },
    {
        id: "asteroid",
        displayName: "Asteroid",
        layers: ["polygon", "crater", "edgeHighlight"],
        baseColor: "#8A7D72",
        emissive: 0,
        silhouetteAtPhone: true,
    },
    {
        id: "nebula",
        displayName: "Nebula",
        layers: ["filaments", "coreGlow"],
        baseColor: "#7A6AA0",
        emissive: 0.3,
        silhouetteAtPhone: false, // clouds have no hard silhouette by design
    },
    {
        id: "blackHole",
        displayName: "Black hole",
        layers: ["shadow", "accretionRing", "jet"],
        baseColor: "#000000",
        emissive: 0.5,
        silhouetteAtPhone: true,
    },
];

export function familyById(id: CelestialFamily): FamilyDef | undefined {
    return FAMILIES.find(f => f.id === id);
}
