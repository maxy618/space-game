/**
 * Layer render graph (P06-T02).
 *
 * The renderer draws in a fixed, explicit order. Each layer declares its
 * coordinate space, opacity budget and owner module, so new visual families
 * (terrain, haze, postFX) can be slotted in without reorder risk.
 *
 * Order (back → front):
 *   0 backdrop    — solid void fill (screen space)
 *   1 far         — distant starfield, parallax 0.08 px/m (screen space)
 *   2 grid        — world grid at zoom-adaptive step (world space)
 *   3 celestial   — orbits, gravity rings, stars, planets (world space)
 *   4 entities    — sparks, ship, exhaust, track (world space)
 *   5 foreground  — dust motes, parallax 1.3 px/m (screen space)
 *   6 emissive    — additive glow/corona/disc-spill (screen space, P08)
 *   7 postFX      — WebGL2 screen-space compositor (P08), tier-gated
 *   8 ui          — DOM: telemetry, pause menu, joystick (document space)
 */

import { worldToScreen } from "./Camera";

export interface LayerDef {
    id: string;
    name: string;
    /** World or screen space; sampled layers state the space explicitly. */
    space: "world" | "screen";
    /** Alpha budget for the layer (1 = fully opaque when active). */
    alpha: number;
    /** Module that owns the drawing code. */
    owner: string;
}

export const LAYERS: LayerDef[] = [
    { id: "backdrop", name: "Void fill", space: "screen", alpha: 1, owner: "MainActivity15.Spaaaace" },
    { id: "far", name: "Distant starfield", space: "screen", alpha: 0.85, owner: "MainActivity15.Spaaaace" },
    { id: "grid", name: "World grid", space: "world", alpha: 1, owner: "MainActivity15.Spaaaace" },
    { id: "celestial", name: "Orbits, rings, stars, planets", space: "world", alpha: 1, owner: "render/VisibleUniverse15" },
    { id: "entities", name: "Sparks, ship, exhaust, track", space: "world", alpha: 1, owner: "render/VisibleUniverse15" },
    { id: "foreground", name: "Dust motes", space: "screen", alpha: 0.16, owner: "MainActivity15.Spaaaace" },
    { id: "emissive", name: "Additive glow / light spill", space: "screen", alpha: 0.9, owner: "render/PostFX + VisibleUniverse15" },
    { id: "postFX", name: "WebGL2 postFX compositor", space: "screen", alpha: 1, owner: "render/PostFX" },
    { id: "ui", name: "Telemetry, pause, joystick", space: "screen", alpha: 1, owner: "main.ts + input/FlightStick" },
];

/** Layer id lookup (render graph keys the draw order by id). */
export function layerById(id: string): LayerDef | undefined {
    return LAYERS.find(l => l.id === id);
}

/**
 * Totally ordered back-to-front pass list. The draw loop in Spaaaace
 * follows this array; adding a layer inserts a row here and one draw
 * section there — order is never implicit.
 */
export function layerOrder(): string[] {
    return LAYERS.map(l => l.id);
}

/**
 * Sanity check for the graph: ids unique, alphas within [0,1],
 * UI last and opaque. Tested.
 */
export function validateGraph(): { ok: boolean; errors: string[] } {
    const errors: string[] = [];
    const seen = new Set<string>();
    for (const l of LAYERS) {
        if (seen.has(l.id)) errors.push(`duplicate layer id "${l.id}"`);
        seen.add(l.id);
        if (l.alpha < 0 || l.alpha > 1) errors.push(`layer "${l.id}" alpha out of [0,1]`);
        if (l.space !== "world" && l.space !== "screen") errors.push(`layer "${l.id}" unknown space`);
    }
    const ui = LAYERS[LAYERS.length - 1];
    if (ui.id !== "ui") errors.push("UI layer must be last (front-most)");
    if (ui.alpha !== 1) errors.push("UI layer must be opaque");
    return { ok: errors.length === 0, errors };
}

/**
 * Where does a world-space point fall inside the layer stack on screen?
 * Returns the screen position used to assign it to a layer — actually
 * just a passthrough convenience re-export for the render loop.
 */
export function worldToLayerScreen(
    worldX: number, worldY: number,
    canvasCssW: number, canvasCssH: number,
    zoomPxPerM: number, centerX: number, centerY: number,
): { x: number; y: number } {
    return worldToScreen(worldX, worldY, canvasCssW, canvasCssH, zoomPxPerM, centerX, centerY);
}
