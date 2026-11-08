/**
 * LOD and material contracts (P06-T03).
 *
 * Detail is chosen by projected on-screen size (CSS px), not by world zoom:
 * the same planet must look right at phone gameplay size and at a 4x crop.
 */

export type LodLevel = "macro" | "regional" | "fine" | "micro";

/** Projected-size thresholds in CSS px (diameter on screen). */
export const LOD_THRESHOLDS: Record<LodLevel, { min: number; max: number }> = {
    macro: { min: 0, max: 8 },
    regional: { min: 8, max: 64 },
    fine: { min: 64, max: 480 },
    micro: { min: 480, max: Number.POSITIVE_INFINITY },
};

/** Pick the LOD band for a projected diameter in CSS px. */
export function lodFor(projectedCssPx: number): LodLevel {
    if (projectedCssPx < LOD_THRESHOLDS.regional.min) return "macro";
    if (projectedCssPx < LOD_THRESHOLDS.fine.min) return "regional";
    if (projectedCssPx < LOD_THRESHOLDS.micro.min) return "fine";
    return "micro";
}

/**
 * Practical budgets (documented, enforced at asset-generation time):
 * - noise/texture tiles ≤ 512×512 px per family (starfield tiles are 512);
 * - per-family authored shapes: ≤ 4 overlaid path layers at fine LOD;
 * - shader precision: none used yet (2D canvas only, Phase 08 adds shaders
 *   with a highp/mediump fallback policy when it lands);
 * - resolution policy: all screen-space art is drawn in device px via the
 *   zoom·dpr scale, so a 2.5K phone gets 3× the detail of a 1× display.
 */
export const LOD_BUDGETS = {
    maxTexturePx: 512,
    maxPathLayersFine: 4,
    starfieldDots: 140,
    dustDots: 36,
} as const;

/** Quality tiers (P25-T02 will implement the switch; contracts exist now). */
export type QualityTier = "high" | "medium" | "low";
export const QUALITY_FEATURES: Record<QualityTier, { starfield: boolean; dust: boolean; postfxBloom: boolean; postfxDistortion: boolean }> = {
    high: { starfield: true, dust: true, postfxBloom: true, postfxDistortion: true },
    medium: { starfield: true, dust: false, postfxBloom: true, postfxDistortion: true },
    low: { starfield: false, dust: false, postfxBloom: false, postfxDistortion: false },
};

/** Feature check for a tier (caller skips the pass entirely when off). */
export function tierHasLayer(tier: QualityTier, layer: "starfield" | "dust" | "postfxBloom" | "postfxDistortion"): boolean {
    return QUALITY_FEATURES[tier][layer];
}
