/**
 * CelestialArt (P06–P08): seeded FBM noise + baked sprite palettes + sun
 * lighting math for stars/planets/black holes.
 *
 * Pure math is unit-tested (determinism, ranges); sprite baking uses DOM
 * canvases and is exercised in the browser, not in vitest (no DOM there).
 * All noise is value-noise FBM (Godot nebula/sun references, docs/RESEARCH*).
 */

/** Deterministic hash → [0,1). Pure integer math, stable across runs. */
export function hash01(x: number, y: number, seed: number): number {
    let h = (x * 374761393 + y * 668265263 + seed * 1274126177) | 0;
    h = (h ^ (h >>> 13)) | 0;
    h = Math.imul(h, 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise at (x,y) ∈ R², seed selects the lattice. */
export function valueNoise(x: number, y: number, seed: number): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const a = hash01(ix, iy, seed);
    const b = hash01(ix + 1, iy, seed);
    const c = hash01(ix, iy + 1, seed);
    const d = hash01(ix + 1, iy + 1, seed);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

/**
 * Fractal Brownian motion: `octaves` layers, p*=2, a*=0.5 each step
 * (standard stacking, RESEARCH §4). Range is [0, ~1), deterministic in seed.
 */
export function fbm(x: number, y: number, seed: number, octaves: number): number {
    let v = 0;
    let amp = 0.5;
    let px = x;
    let py = y;
    for (let i = 0; i < octaves; i++) {
        v += amp * valueNoise(px, py, seed + i * 101);
        px *= 2;
        py *= 2;
        amp *= 0.5;
    }
    return v;
}

/** Domain-warped FBM: sample coords are bent by a second FBM (filaments). */
export function fbmWarped(x: number, y: number, seed: number, octaves: number): number {
    const qx = fbm(x + 5.2, y + 1.3, seed + 7, octaves);
    const qy = fbm(x - 1.3, y + 8.7, seed + 13, octaves);
    return fbm(x + 3 * qx, y + 3 * qy, seed, octaves);
}

// ---------------------------------------------------------------- palettes

export interface StarPalette {
    core: string;
    mid: string;
    rim: string;
    corona: string;
    /** Corona tightness 0..1 (1 = compact hot). */
    coronaTight: number;
    /** Sunspot coverage 0..1. */
    spotAmt: number;
}

/** Spectral-class palettes (O/B/A/F/G/K/M) — distinct, not hue clones. */
export function starPaletteFor(cls: number): StarPalette {
    switch (cls) {
        case 0: return { core: "#FFFFFF", mid: "#9DB4FF", rim: "#5A6CFF", corona: "rgba(140,160,255,", coronaTight: 0.95, spotAmt: 0.0 };
        case 1: return { core: "#FFFFFF", mid: "#C8D8FF", rim: "#7E96FF", corona: "rgba(170,190,255,", coronaTight: 0.9, spotAmt: 0.05 };
        case 2: return { core: "#FFFFFF", mid: "#E8ECFF", rim: "#AAB4E8", corona: "rgba(200,210,255,", coronaTight: 0.8, spotAmt: 0.1 };
        case 3: return { core: "#FFFDF2", mid: "#FFF3C8", rim: "#E8D9A0", corona: "rgba(255,236,170,", coronaTight: 0.65, spotAmt: 0.2 };
        case 4: return { core: "#FFFEF0", mid: "#FFE98A", rim: "#E8B84A", corona: "rgba(255,214,110,", coronaTight: 0.55, spotAmt: 0.35 };
        case 5: return { core: "#FFF2CC", mid: "#FFC866", rim: "#D88A2A", corona: "rgba(255,180,90,", coronaTight: 0.45, spotAmt: 0.5 };
        default: return { core: "#FFE8B0", mid: "#FF8A3A", rim: "#B83A12", corona: "rgba(255,110,50,", coronaTight: 0.3, spotAmt: 0.65 };
    }
}

export interface PlanetPalette {
    ocean: string;
    land: string;
    land2: string;
    ice: string;
    cloud: string;
    /** Atmospheric rim colour (dayside). */
    atmo: string;
    hasOcean: boolean;
    hasAtmo: boolean;
    hasRings: boolean;
    gasGiant: boolean;
}

/** Planet palettes from a stable seed — different families, not hue clones. */
export function planetPaletteFor(seed: number): PlanetPalette {
    const s = ((seed % 1) + 1) % 1;
    if (s < 0.15) return { ocean: "#0E2A4A", land: "#8A7A66", land2: "#5A6A4A", ice: "#E8F2FF", cloud: "#FFFFFF", atmo: "#6A9AE8", hasOcean: true, hasAtmo: true, hasRings: false, gasGiant: false }; // ocean world
    if (s < 0.30) return { ocean: "#2A1A10", land: "#C87A3A", land2: "#7A3A1A", ice: "#FFE8D0", cloud: "#FFD9B0", atmo: "#E8A05A", hasOcean: false, hasAtmo: true, hasRings: false, gasGiant: false }; // desert
    if (s < 0.42) return { ocean: "#0A1A2A", land: "#4A6A8A", land2: "#2A3A5A", ice: "#C8E8FF", cloud: "#D8EEFF", atmo: "#5A8AC8", hasOcean: true, hasAtmo: true, hasRings: true, gasGiant: false }; // ringed ocean
    if (s < 0.55) return { ocean: "#1A2A1A", land: "#3A5A3A", land2: "#5A7A4A", ice: "#E8FFE8", cloud: "#E8FFD8", atmo: "#7AC87A", hasOcean: true, hasAtmo: true, hasRings: false, gasGiant: false }; // lush
    if (s < 0.70) return { ocean: "#2A2A3A", land: "#6A6A7A", land2: "#4A4A5A", ice: "#E8E8F0", cloud: "#F0F0FF", atmo: "rgba(180,180,220,", hasOcean: false, hasAtmo: false, hasRings: false, gasGiant: false }; // airless rock
    if (s < 0.85) return { ocean: "#3A2A1A", land: "#C8A878", land2: "#A88058", ice: "#FFF8E8", cloud: "#FFE8C8", atmo: "#E8C88A", hasOcean: false, hasAtmo: true, hasRings: true, gasGiant: true }; // gas giant ringed
    return { ocean: "#0E1E3A", land: "#2A4A6A", land2: "#3A6A8A", ice: "#FFFFFF", cloud: "#F0F8FF", atmo: "#7AB8E8", hasOcean: true, hasAtmo: true, hasRings: false, gasGiant: true }; // blue giant
}

// ---------------------------------------------------------------- lighting

export interface SunDir { x: number; y: number }

/** Unit vector from body toward the star (world coords). */
export function sunDirection(bx: number, by: number, sx: number, sy: number): SunDir {
    const dx = sx - bx;
    const dy = sy - by;
    const m = Math.hypot(dx, dy) || 1;
    return { x: dx / m, y: dy / m };
}

/**
 * Lambert diffuse for a surface point given its outward normal (unit) and
 * the sun direction. Returns 0..1 (0 = night). Soft terminator: the
 * 0.35..0.95 cosine band is eased, never a hard cut.
 */
export function diffuseLight(nx: number, ny: number, sun: SunDir): number {
    const c = nx * sun.x + ny * sun.y;
    if (c <= -0.35) return 0;
    const t = Math.min(1, (c + 0.35) / 1.3);
    return t * t * (3 - 2 * t); // smoothstep
}

/**
 * View-angle rim factor (atmosphere): (1 − N·V)^power, V toward camera.
 * Camera is the ship — pass the body→ship direction as (vx,vy) unit.
 */
export function rimFactor(nx: number, ny: number, vx: number, vy: number, power: number): number {
    const ndv = Math.max(0, nx * vx + ny * vy);
    return Math.pow(1 - ndv, power);
}

/** Exponential corona falloff I0·exp(−k·(r−R)), r,R in same units. */
export function coronaIntensity(r: number, R: number, k: number): number {
    if (r <= R) return 1;
    return Math.exp(-k * (r - R));
}
