/**
 * SpriteBaker (P07/P08): pre-rendered celestial sprites.
 *
 * CPU work happens ONCE per body (FBM over a 384×384 tile), then the game
 * loop draws a single drawImage per body — no per-frame CPU noise, no
 * shadowBlur in the hot loop. Sprites are LOD-independent; far LOD draws a
 * plain glow disc instead (see Lod.lodFor).
 *
 * All baking is seeded and deterministic (same planet id → same sprite).
 */
import { fbm, fbmWarped, starPaletteFor, planetPaletteFor } from "./CelestialArt";

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return [c, c.getContext("2d")!];
}

function hexToRgb(hex: string): [number, number, number] {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return [140, 140, 160];
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixRgb(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
    return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
}

const SPRITE_PX = 384;
const HALF = SPRITE_PX / 2;

/**
 * Star sprite: limb-darkened photosphere with two-scale granulation +
 * thresholded sunspots + baked inner corona glow. Outer corona (to ~3R) is
 * drawn per-frame additively so bloom can catch it.
 */
export function bakeStarSprite(cls: number, seed: number): HTMLCanvasElement {
    const [c, g] = makeCanvas(SPRITE_PX, SPRITE_PX);
    const img = g.createImageData(SPRITE_PX, SPRITE_PX);
    const pal = starPaletteFor(cls);
    const core = hexToRgb(pal.core);
    const mid = hexToRgb(pal.mid);
    const rim = hexToRgb(pal.rim);
    const sd = Math.floor(seed * 10000) + cls * 7919;
    for (let y = 0; y < SPRITE_PX; y++) {
        for (let x = 0; x < SPRITE_PX; x++) {
            const nx = (x - HALF) / HALF;
            const ny = (y - HALF) / HALF;
            const r = Math.hypot(nx, ny);
            const idx = (y * SPRITE_PX + x) * 4;
            if (r > 1) { img.data[idx + 3] = 0; continue; }
            const nz = Math.sqrt(Math.max(0, 1 - r * r));
            // granulation: large cells + fine grain
            const gran = fbm(nx * 3 + 10, ny * 3 + 10, sd, 4) * 0.65
                + fbm(nx * 9, ny * 9, sd + 31, 3) * 0.35;
            // limb darkening (pow(nz,0.55) style)
            const limb = Math.pow(Math.max(nz, 0.02), 0.55);
            // base mix core→mid with granulation
            let col = mixRgb(core, mid, Math.min(1, Math.max(0, gran)));
            col = mixRgb(col, rim, Math.min(1, Math.max(0, (1 - limb) * 1.4)));
            // sunspots: slow FBM threshold
            const spots = fbm(nx * 1.6 + 40, ny * 1.6 + 40, sd + 77, 3);
            const spotMask = spots > (0.72 - pal.spotAmt * 0.25) ? (spots - 0.72) * 4 : 0;
            if (spotMask > 0) col = mixRgb(col, [60, 30, 20], Math.min(0.7, spotMask));
            const bright = 0.35 + limb * 0.85 + gran * 0.25;
            img.data[idx] = Math.min(255, col[0] * bright + 40);
            img.data[idx + 1] = Math.min(255, col[1] * bright + 30);
            img.data[idx + 2] = Math.min(255, col[2] * bright + 15);
            img.data[idx + 3] = 255;
            // soft edge (1-2px AA)
            if (r > 0.985) img.data[idx + 3] = Math.round(255 * (1 - r) / 0.015);
        }
    }
    g.putImageData(img, 0, 0);
    return c;
}

/**
 * Planet sprite: FBM continents (domain-warped), ocean/land/ice by seed
 * family, polar ice caps, baked limb shading. Terminator + atmosphere rim
 * are per-frame (sun direction moves); clouds are a second sprite.
 * Returns the surface sprite; clouds are baked separately by caller.
 */
export function bakePlanetSurface(seed: number): HTMLCanvasElement {
    const [c, g] = makeCanvas(SPRITE_PX, SPRITE_PX);
    const img = g.createImageData(SPRITE_PX, SPRITE_PX);
    const pal = planetPaletteFor(seed);
    const ocean = hexToRgb(pal.ocean);
    const land = hexToRgb(pal.land);
    const land2 = hexToRgb(pal.land2);
    const ice = hexToRgb(pal.ice);
    const sd = Math.floor(seed * 100000) + 101;
    const giant = pal.gasGiant;
    for (let y = 0; y < SPRITE_PX; y++) {
        for (let x = 0; x < SPRITE_PX; x++) {
            const nx = (x - HALF) / HALF;
            const ny = (y - HALF) / HALF;
            const r = Math.hypot(nx, ny);
            const idx = (y * SPRITE_PX + x) * 4;
            if (r > 1) { img.data[idx + 3] = 0; continue; }
            // latitude for caps + bands
            const lat = ny;
            let col: [number, number, number];
            if (giant) {
                // gas giant bands, warped
                const band = fbmWarped(nx * 2 + lat * 6, lat * 3, sd, 4);
                col = mixRgb(land, land2, Math.min(1, Math.max(0, band)));
                if (Math.abs(lat) > 0.82) col = mixRgb(col, ice, (Math.abs(lat) - 0.82) * 4);
            } else {
                const cont = fbmWarped(nx * 2.2 + 5, ny * 2.2 + 5, sd, 5);
                const sea = pal.hasOcean ? cont < 0.52 : false;
                if (sea) col = mixRgb(ocean, ocean, 0);
                else col = mixRgb(land, land2, Math.min(1, Math.max(0, fbm(nx * 5, ny * 5, sd + 5, 3) * 1.4)));
                // detail speckle
                const det = fbm(nx * 12, ny * 12, sd + 9, 2);
                col = mixRgb(col, [255, 255, 255], Math.max(0, det - 0.75) * 0.5);
                // ice caps
                const capEdge = 0.78 + fbm(nx * 4, ny * 4, sd + 21, 2) * 0.08;
                if (Math.abs(lat) > capEdge) col = mixRgb(col, ice, Math.min(1, (Math.abs(lat) - capEdge) * 5));
                // ocean depth shading
                if (sea) {
                    const depth = Math.min(1, (0.52 - cont) * 4);
                    col = mixRgb(col, [4, 10, 30], depth * 0.5);
                }
            }
            // limb darkening (atmosphere thinning)
            const nz = Math.sqrt(Math.max(0, 1 - r * r));
            const limb = 0.45 + Math.pow(Math.max(nz, 0.02), 0.6) * 0.55;
            img.data[idx] = Math.min(255, col[0] * limb + 6);
            img.data[idx + 1] = Math.min(255, col[1] * limb + 6);
            img.data[idx + 2] = Math.min(255, col[2] * limb + 8);
            img.data[idx + 3] = 255;
            if (r > 0.985) img.data[idx + 3] = Math.round(255 * (1 - r) / 0.015);
        }
    }
    g.putImageData(img, 0, 0);
    return c;
}

/** Cloud layer sprite (alpha-only, drawn above surface, slowly rotating). */
export function bakePlanetClouds(seed: number): HTMLCanvasElement {
    const [c, g] = makeCanvas(SPRITE_PX, SPRITE_PX);
    const img = g.createImageData(SPRITE_PX, SPRITE_PX);
    const sd = Math.floor(seed * 100000) + 909;
    for (let y = 0; y < SPRITE_PX; y++) {
        for (let x = 0; x < SPRITE_PX; x++) {
            const nx = (x - HALF) / HALF;
            const ny = (y - HALF) / HALF;
            const r = Math.hypot(nx, ny);
            const idx = (y * SPRITE_PX + x) * 4;
            if (r > 1) { img.data[idx + 3] = 0; continue; }
            const cl = fbmWarped(nx * 2.5 + 20, ny * 2.5 + 20, sd, 4);
            const a = cl > 0.55 ? Math.min(1, (cl - 0.55) * 3.2) : 0;
            img.data[idx] = 255;
            img.data[idx + 1] = 255;
            img.data[idx + 2] = 255;
            img.data[idx + 3] = Math.round(a * 200);
            if (r > 0.985) img.data[idx + 3] = Math.round(img.data[idx + 3] * (1 - r) / 0.015);
        }
    }
    g.putImageData(img, 0, 0);
    return c;
}
