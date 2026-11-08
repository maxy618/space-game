/*
 * Copyright (C) 2023 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Copyright 2025 lll69
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { SYSTEM } from "@thi.ng/random";
import { sprintf } from "sprintf-js";
import { expSmooth } from "../core/Maths";
import { CanvasHelper } from "../core/CanvasHelper";
import { Colors } from "../core/Colors";
import { Namer15 } from "../core/Namer15";
import { clamp, lexp } from "../core/Maths";
import { lerp } from "../core/MathHelpers";
import { Vec2, Vec2_copy, Vec2_makeWithAngleMag } from "../core/Vec2";
import { VisibleUniverse15, ZoomedDrawScope15, BLACK_HOLE } from "../render/VisibleUniverse15";
import { Asteroid, Landing, Planet, Spacecraft, Spark, SparkStyle, Star, StarClass, StarClassNames, StarClasses, Track, UniverseConst } from "../universe/Universe";
import { Landing15, Spacecraft15 } from "../universe/Universe15";
import { FlightStick } from "../input/FlightStick";
import { InputActionLayer } from "../input/InputActions";
import { Autopilot15 } from "../sim/Autopilot15";
import { VisibleUniverse } from "../render/VisibleUniverse";
import { timeToImpact, impactGatesPass, impactLatchedThreat, IMPACT_CLEAR_SECONDS, IMPACT_CRITICAL_SECONDS } from "../universe/CollisionPredict";
import { SCAN_COOLDOWN, SCAN_RADIUS, SCAN_WAVE_SECONDS } from "../universe/Scanner";
import { createRoutePilot, pilotStep, type RouteThreat } from "../sim/RoutePilot";
import { chaseCamera, CAMERA_FOLLOW_RATE, velocityZoomFactor, fisheyeTargetForSpeed, parallaxOffsetPx, wrapTile, DUST_PARALLAX_PX_PER_M, STARFIELD_PARALLAX_PX_PER_M, decayKick, kickMetersForScreenPx } from "../camera/Camera";
import { newRandom } from "../core/RandomKt";
import { PostFXCompositor, NEUTRAL_PARAMS, type PostFXParams } from "../render/PostFX";

const TEST_UNIVERSE = false

export const enum RandomSeedType {
    Fixed = 0,
    Daily = 1,
    Evergreen = 2
}

let RANDOM_SEED_TYPE = RandomSeedType.Daily;

let FIXED_RANDOM_SEED = 5038n;
export const DEFAULT_CAMERA_ZOOM = 1;
const MIN_CAMERA_ZOOM = 250 / UniverseConst.UNIVERSE_RANGE; // 0.0025f
const MAX_CAMERA_ZOOM = 5;
const TOUCH_CAMERA_PAN = false;
const TOUCH_CAMERA_ZOOM = true;
let DYNAMIC_ZOOM = false;

// Project-native player feature: the camera view scales smoothly with ship speed
// so the player FEELS speed. Speed/pause/manual-zoom are debug-only (see main.ts).
// Visible-space factor: stopped = 0.7x (closer), medium speed = 1.0x (exactly the
// original default view), base cap (4000) = 2.2x (farther), boost (6000) = 4.4x
// (2x past base cap). Interpolated linearly in between and smoothed per frame.
// The ship always stays clearly visible.
const SPEED_ZOOM_NEAR = 0.7; // visible-space factor when the ship is stopped
const SPEED_ZOOM_FAR = 2.2; // visible-space factor at CRAFT_SPEED_LIMIT (4000)
const SPEED_ZOOM_FAR_BOOST = 4.4; // visible-space factor at CRAFT_SPEED_LIMIT_BOOST (6000): 2x past base cap
const SPEED_ZOOM_REF = 800; // px/s treated as "medium" speed = exactly the original view
let SPEED_ZOOM_ENABLED = true;

// Overall camera distance multiplier (user request 2026-11-07): the view was
// too close on phones — high-res and regular resolution alike — even at rest.
// 1.5x farther than before at every speed. Applied to the base zoom
// everywhere, so relative velocity-zoom behavior is unchanged.
const CAMERA_DISTANCE = 1.5;

// Fisheye warp is now velocity-driven (user 2026-11-08) — see Spaaaace.
// The boost burner instead gets its own dedicated HUD effect: a neon edge
// glow (below), keyed to actual boost thrust, not to speed.

let playSpeed = 1;
let camZoom = DEFAULT_CAMERA_ZOOM;
let cachedMassString = "";

let isBaklava = false;
let isControlsShow = false;

// Scanner/radar shared state (module scope — MainActivity15 and its
// Spaaaace camera closure both read these).
let scanPull = 1;   // smoothed extra zoom-out factor while the scan wave runs
/** Base zoom (without the scan pull) mirrored from Spaaaace each frame. */
let scanZoomBase = 0.004;
const mainCanvas = document.getElementById("canvasMain") as HTMLCanvasElement;
/** Scanner needs a SLOW ship (user 2026-11-09: threshold lowered to 500). */
const SCAN_SPEED_MAX = 500;
/** Hard cap of the scan camera pull (× the normal zoom-out). */
const SCAN_PULL_MAX = 8;
let radarOpen = false; // radar overlay state (mirrored in main.ts via setRadarOpen)
let requestedPostFXTier: string | null = null; // pause Settings → Spaaaace
/** Player-facing graphics tier from the pause menu (persisted). */
export function setRequestedPostFXTier(t: string | null) {
    requestedPostFXTier = t;
    try {
        if (t) localStorage.setItem("postFXTier", t);
        else localStorage.removeItem("postFXTier");
    } catch { /* private mode */ }
}

const atan2 = Math.atan2;
const PI = Math.PI;
const floor = Math.floor;
const max = Math.max;
const random = Math.random;
const sqrt = Math.sqrt;

function absN(num: bigint): bigint {
    return num >= 0 || num === -9223372036854775808n ? num : -num;
}

function dailySeed(): number {
    let today = new Date();
    return today.getFullYear() * 10000 + today.getMonth() * 100 + today.getDate();
}

function randomSeed(): bigint {
    switch (RANDOM_SEED_TYPE) {
        case RandomSeedType.Fixed: return absN(FIXED_RANDOM_SEED);
        case RandomSeedType.Daily: return absN(BigInt(dailySeed()));
        default: return absN(((BigInt(SYSTEM.int()) << 32n) | BigInt(SYSTEM.int())) % 10_000_000n);
    }
}

function toLocalPx(sz: number): number {
    return sz * window.devicePixelRatio;
}

function Telemetry(universe: VisibleUniverse, autopilot: Autopilot15,
    topText: HTMLElement, bottomText: HTMLElement,
    topContainer: HTMLElement, bottomContainer: HTMLElement,
    autopilotText: HTMLElement) {
    let topVisible = false;
    let bottomVisible = false;
    let startMillis = -1;
    const topTextNode = document.createTextNode("");
    topText.appendChild(topTextNode);
    const bottomTextNode = document.createTextNode("");
    bottomText.appendChild(bottomTextNode);
    const autopilotTextNode = document.createTextNode("");
    autopilotText.appendChild(autopilotTextNode);
    let frames = 0, totalDt = 0;
    let lastFpsTime = 0;
    let fps = 0, vFps = 0;
    return (millis: number) => {
        if (startMillis === -1) {
            startMillis = millis;
            return;
        }
        let millisDelta = millis - startMillis;
        if (!bottomVisible && universe.realDt !== 0) {
            if (millisDelta >= 2000) {
                bottomContainer.hidden = false;
                bottomContainer.style.opacity = 1 as any;
                bottomVisible = true;
            } else if (millisDelta > 1000) {
                bottomContainer.hidden = false;
                bottomContainer.style.opacity = (random() * (millis - 1000) / 1000) as any;
            }
        }
        if (!topVisible && universe.realDt !== 0) {
            if (millisDelta >= 3000) {
                topContainer.hidden = false;
                topContainer.style.opacity = String(1);
                topVisible = true;
            } else if (millisDelta > 2000) {
                topContainer.hidden = false;
                topContainer.style.opacity = String((random() * (millis - 2000) / 1000));
            }
        }
        if (autopilot.enabled) {
            autopilotTextNode.textContent = autopilot.getTelemetry();
        } else {
            autopilotTextNode.textContent = "";
        }
        if (millis - lastFpsTime >= 1000 * playSpeed) {
            fps = frames * 1000 / (millis - lastFpsTime) * playSpeed;
            vFps = frames / totalDt;
            lastFpsTime = millis;
            frames = 0;
            totalDt = 0;
        }
        frames++;
        totalDt += universe.dt;
        const star = universe.star;
        const explored = universe.planets
            .filter(it => it.explored)
            .map(it => "  BODY: " + it.name + "\n" +
                "  TYPE: " + it.description + "\n" +
                "  ATMO: " + it.atmosphere + "\n" +
                " FAUNA: " + it.fauna + "\n" +
                " FLORA: " + it.flora + "\n");
        const topString = "  STAR: " + star.name + " (" + (isBaklava ? "BKL" : "VIC") + "-" + (universe.randomSeed % 100_000n) + ")\n" +
            " CLASS: " + StarClassNames[star.cls] + "\n" +
            "RADIUS: " + floor(star.radius) + "\n" +
            cachedMassString +
            "BODIES: " + explored.length + " / " + universe.planets.length + "\n" +
            "   FPS: " + ((universe.realDt * playSpeed) === 0 ? "Paused" : fps.toFixed(1)) + "\n" +
            "  vFPS: " + ((universe.dt * playSpeed) === 0 ? "Paused" : vFps.toFixed(1)) + "\n" +
            (isControlsShow ? " SPEED: " + playSpeed.toFixed(2) + "x" : "")
            + "\n\n"
            + explored.join("\n");
        topTextNode.textContent = topString;
        const ship = universe.ship;
        const closest = universe.closestPlanet();
        const distToClosest = floor(closest.pos.distance(ship.pos));
        let bottomString = "";
        if (ship.landing !== null) {
            bottomString += "LND: " + ship.landing.planet.name;
            bottomString += "\nJOB: " + (ship.landing as Landing15).text;
        } else if (distToClosest < 10_000) {
            bottomString += "ALT: " + distToClosest;
        }
        if (bottomString.length > 0) bottomString += "\n";
        bottomString += "THR: " + (ship.thrust.mag() * 100).toFixed(0) + "%\n";
        bottomString += "POS: " + ship.pos.str() + "\n";
        // stellar heat (user 2026-11-08): only shown while the corona risk
        // is nonzero, so normal flight is not cluttered
        if (ship.heat > 0.005) bottomString += "HEAT: " + Math.round(ship.heat * 100) + "%\n";
        bottomString += "VEL: " + ship.velocity.mag().toFixed(0);
        bottomTextNode.textContent = bottomString;
    }
}

function Spaaaace(
    u: VisibleUniverse,
    zoomedDrawScope: ZoomedDrawScope15
) {
    let cameraZoom = camZoom;
    let zoomBase = camZoom; // smoothed zoom WITHOUT the scan pull
    let cameraOffsetX = 0;
    let cameraOffsetY = 0;
    // Smoothed follow center (P05-T02): the chase lives in the camera layer,
    // never in physics. The ship remains the source of truth.
    let chaseX = 0;
    let chaseY = 0;
    let chaseInitialized = false;

    // Event-driven camera feedback (P05-T04): short, self-terminating kicks
    // on landing and on discovering a planet. Reduced-motion users get none.
    const reducedMotion = typeof window !== "undefined"
        && typeof window.matchMedia === "function"
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Fisheye offscreen render target (user 2026-11-08): the world renders
    // into this canvas, then gets radially barrel-warped back to the screen.
    const offCanvas = document.createElement("canvas");
    const offCtx = offCanvas.getContext("2d") as CanvasRenderingContext2D;
    let fisheyeSmooth = 0;
    // P08 PostFX (WebGL2 screen-space compositor, RESEARCH §6): world renders
    // into offCanvas ALWAYS when enabled, then WebGL composites to a display
    // canvas stacked exactly over canvasMain (pointer-events: none, so input
    // still lands on canvasMain). #postfx=off disables (debug/fallback).
    const postfxWanted = typeof location === "undefined" || !location.hash.includes("postfx=off");
    let postfx: PostFXCompositor | null = null;
    let postCanvas: HTMLCanvasElement | null = null;
    function ensurePostFX(): boolean {
        if (!postfxWanted) return false;
        if (postfx && postfx.ready) return true;
        if (postfx && !postfx.ready) return false;
        try {
            postCanvas = document.createElement("canvas");
            postCanvas.className = "canvas fill";
            postCanvas.style.pointerEvents = "none";
            postCanvas.style.zIndex = "1";
            const mainC = document.getElementById("canvasMain");
            if (mainC && mainC.parentNode) mainC.parentNode.insertBefore(postCanvas, mainC.nextSibling);
            postfx = new PostFXCompositor(offCanvas, postCanvas);
            postfx.reducedMotion = reducedMotion;
            // default tier: desktop DPR≤2 → high, mobile DPR>2 → medium
            const dpr = (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
            postfx.tier = dpr > 2.4 ? "medium" : "high";
            const tierParam = typeof location === "undefined" ? null : new URLSearchParams(location.hash.substring(1)).get("tier");
            if (tierParam === "low" || tierParam === "medium" || tierParam === "high" || tierParam === "off") postfx.tier = tierParam;
            if (requestedPostFXTier) postfx.tier = requestedPostFXTier as typeof postfx.tier;
            return postfx.ready;
        } catch {
            return false;
        }
    }
    let kickX = 0;
    let kickY = 0;
    const KICK_DECAY_RATE = 6; // per second → ~0.5 s visible kick
    let prevLanding = false;
    let prevDiscovery: number | null = null;
    let nearStarGlare = 1; // 1 = normal sky, 0 = fully washed out (close to star)
    // P08 impact profile state (landing bump / discovery pop → decays to 0).
    let impactFlash = 0;
    let impactShake = 0;

    // Deterministic multi-layer starfield (P05-T03, deepened 2026-11-08,
    // enriched 2026-11-09): three parallax planes — far (0.08 px/m, fine),
    // mid (0.15 px/m, bigger brighter), near dust (1.3 px/m, faint) — plus
    // a diagonal "milky band" of dense faint stars and distant galaxies.
    // Stars vary by TEMPERATURE (blue/white/warm/red), the brightest carry
    // a subtle 4-point diffraction glint, all far stars gently twinkle.
    const STARFIELD_SEED = 123456789n;
    const starfieldRng = newRandom(STARFIELD_SEED);
    interface StarDot { x: number; y: number; size: number; alpha: number; color: string; twinklePhase: number; twinkleRate: number; glint: boolean }
    // temperature palette: most neutral-white, fewer warm, rare red giants
    const starPalette = ["#D8D8FF", "#D8D8FF", "#FFFFFF", "#C8D8FF", "#FFE9C8", "#FFE9C8", "#FFD9A8", "#B8E8FF", "#FFBE8A"];
    const makeStar = (): StarDot => ({
        x: starfieldRng.minmax(0, 512),
        y: starfieldRng.minmax(0, 512),
        size: starfieldRng.minmax(0.5, 1.4),
        alpha: starfieldRng.minmax(0.16, 0.7),
        color: starPalette[starfieldRng.minmaxInt(0, starPalette.length)],
        twinklePhase: starfieldRng.minmax(0, PI * 2),
        twinkleRate: starfieldRng.minmax(0.4, 1.6),
        glint: false,
    });
    const starfield: StarDot[] = [];
    for (let i = 0; i < 55; i++) starfield.push(makeStar()); // halved (user 2026-11-09: emptier sky)
    // Milky band (user 2026-11-09): a RESTRAINED cluster of tiny faint stars
    // along a diagonal — depth cue, not noise (user warning: the sky must
    // never read as mush). Faint alphas, sparse count.
    const band: StarDot[] = [];
    for (let i = 0; i < 55; i++) {
        const t = starfieldRng.float();
        // diagonal band through the tile, gaussian-ish lateral spread
        const cx = t * 512;
        const cy = t * 512 * 0.5 + 96;
        const spread = (starfieldRng.float() + starfieldRng.float() - 1) * 90;
        band.push({
            x: (cx + spread + 512) % 512,
            y: (cy + spread * 0.7 + 512) % 512,
            size: starfieldRng.minmax(0.4, 0.8),
            alpha: starfieldRng.minmax(0.04, 0.2),
            color: starfieldRng.float() < 0.2 ? "#FFE9C8" : "#D8D8FF",
            twinklePhase: 0,
            twinkleRate: 0,
            glint: false,
        });
    }
    const midfield: StarDot[] = [];
    for (let i = 0; i < 30; i++) {
        const s = makeStar();
        s.size = starfieldRng.minmax(0.9, 1.7);
        s.alpha = starfieldRng.minmax(0.25, 0.6);
        s.glint = starfieldRng.float() < 0.12;
        midfield.push(s);
    }
    const dustfield: StarDot[] = [];
    for (let i = 0; i < 18; i++) {
        dustfield.push({
            x: starfieldRng.minmax(0, 512),
            y: starfieldRng.minmax(0, 512),
            size: starfieldRng.minmax(0.6, 1.4),
            alpha: starfieldRng.minmax(0.03, 0.12),
            color: "#D8D8FF",
            twinklePhase: 0,
            twinkleRate: 0,
            glint: false,
        });
    }
    // Distant galaxies (user 2026-11-09): real SPIRAL galaxies, pre-rendered
    // once into sprites — bright warm core, faint elliptical disc,
    // logarithmic-spiral arms dotted with star clusters and H-II knots,
    // a dark dust lane along the inner arm, gentle tilt. Varied sizes
    // (one prominent, one medium, one tiny) so the sky never looks tiled.
    const buildGalaxySprite = (rng: () => number, hue: string, coreHue: string): HTMLCanvasElement => {
        const SIZE = 256 * dpr0();
        const c = document.createElement("canvas");
        c.width = SIZE;
        c.height = SIZE;
        const g = c.getContext("2d")!;
        const cx = SIZE / 2;
        const cy = SIZE / 2;
        const R = SIZE / 2 * 0.86;
        const tilt = 0.38 + rng() * 0.25; // disc inclination (squash)
        const rot = rng() * PI;
        g.translate(cx, cy);
        g.rotate(rot);
        g.scale(1, tilt);
        const arms = 2 + Math.floor(rng() * 2); // 2..3
        const armPhase = rng() * PI * 2;
        const wind = 2.6 + rng() * 1.2; // how tightly the spiral winds
        // disc glow — VERY soft, distant-sky haze (never a "solid" blob):
        // the arm dots sit *inside* a big radial fog that melts at the edges.
        const disc = g.createRadialGradient(0, 0, 0, 0, 0, R);
        disc.addColorStop(0, coreHue);
        disc.addColorStop(0.3, hue);
        disc.addColorStop(0.7, hue);
        disc.addColorStop(1, "rgba(0,0,0,0)");
        g.globalAlpha = 0.10;
        g.fillStyle = disc;
        g.beginPath();
        g.arc(0, 0, R, 0, PI * 2);
        g.fill();
        // arms: hundreds of additive dots along logarithmic spirals
        g.globalCompositeOperation = "lighter";
        const armDots = Math.floor(220 + rng() * 120);
        for (let i = 0; i < armDots; i++) {
            const arm = i % arms;
            const t = rng();
            const theta = armPhase + (arm / arms) * PI * 2 + t * wind * PI;
            const rad = R * 0.14 * Math.exp((t * wind * PI) / 2.2);
            if (rad > R * 0.98) continue;
            const spread = R * 0.05 * (1 + t * 1.6);
            const px = Math.cos(theta) * rad + (rng() - 0.5) * spread;
            const py = Math.sin(theta) * rad * 0.86 + (rng() - 0.5) * spread;
            const s = (0.6 + rng() * 1.8) * (SIZE / 256);
            g.globalAlpha = 0.06 + rng() * 0.13 * (1 - t * 0.5); // softened
            g.fillStyle = rng() < 0.16 ? coreHue : hue;
            g.beginPath();
            g.arc(px, py, s, 0, PI * 2);
            g.fill();
        }
        // a few bright H-II knots on the arms
        for (let k = 0; k < 6; k++) {
            const arm = Math.floor(rng() * arms);
            const t = 0.25 + rng() * 0.7;
            const theta = armPhase + (arm / arms) * PI * 2 + t * wind * PI;
            const rad = R * 0.14 * Math.exp((t * wind * PI) / 2.2);
            if (rad > R) continue;
            g.globalAlpha = 0.28;
            g.fillStyle = coreHue;
            g.beginPath();
            g.arc(Math.cos(theta) * rad, Math.sin(theta) * rad * 0.86, 2.4 * (SIZE / 256), 0, PI * 2);
            g.fill();
        }
        // core bulge (bright, warm)
        g.globalAlpha = 1;
        const bulge = g.createRadialGradient(0, 0, 0, 0, 0, R * 0.3);
        bulge.addColorStop(0, "rgba(255,245,225,0.95)");
        bulge.addColorStop(0.4, coreHue);
        bulge.addColorStop(1, "rgba(0,0,0,0)");
        g.globalAlpha = 0.8;
        g.fillStyle = bulge;
        g.beginPath();
        g.arc(0, 0, R * 0.3, 0, PI * 2);
        g.fill();
        // dark dust lane hugging one inner arm
        g.globalCompositeOperation = "source-over";
        g.globalAlpha = 0.20;
        g.strokeStyle = "rgba(10,8,14,0.8)";
        g.lineWidth = R * 0.035;
        g.beginPath();
        for (let i = 0; i <= 40; i++) {
            const t = i / 40;
            const theta = armPhase + PI * 0.5 + t * wind * PI;
            const rad = R * 0.14 * Math.exp((t * wind * PI) / 2.2);
            const px = Math.cos(theta) * rad;
            const py = Math.sin(theta) * rad * 0.86;
            if (i === 0) g.moveTo(px, py);
            else g.lineTo(px, py);
        }
        g.stroke();
        return c;
    };
    const dpr0 = () => (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    // Six DISTINCT galaxy sprites (user 2026-11-09: "сетка одинаковых
    // туманностей" fix): varied hue, size, arm count — plus PER-TILE hash
    // placement so no two tiles repeat the same layout; density halved.
    const galaxies = [
        { rx: 20, hue: "#9FB4E8", coreHue: "#FFE8C8" },
        { rx: 11, hue: "#E8C8B0", coreHue: "#FFF2DC" },
        { rx: 6, hue: "#A8C8E8", coreHue: "#FFE8C8" },
        { rx: 14, hue: "#C8A8D8", coreHue: "#FFDDE8" },
        { rx: 9, hue: "#8AC8B8", coreHue: "#D8F2E8" },
        { rx: 17, hue: "#D8B878", coreHue: "#FFEEDD" },
    ].map(g => ({
        rx: g.rx,
        hue: g.hue,
        coreHue: g.coreHue,
        sprite: buildGalaxySprite(() => starfieldRng.float(), g.hue, g.coreHue),
    }));
    /** Deterministic tile hash → [0,1): de-correlates tiled sky layers. */
    const tileHash = (tx: number, ty: number, i: number): number => {
        let h = (tx * 73856093) ^ (ty * 19349663) ^ (i * 83492791);
        h = Math.imul(h ^ (h >>> 15), 2246822519);
        h = Math.imul(h ^ (h >>> 13), 3266489917);
        h ^= h >>> 16;
        return (h >>> 0) / 4294967296;
    };
    // Near debris (user 2026-11-08): tiny tumbling rock triangles on a fast
    // parallax plane (2.5 px/m) — they whizz past close to the camera and
    // give the "flying through a debris cloud" feel of volume.
    interface Debris { x: number; y: number; size: number; alpha: number; spin: number; seed: number }
    const debris: Debris[] = [];
    for (let i = 0; i < 70; i++) {
        debris.push({
            x: starfieldRng.minmax(0, 512),
            y: starfieldRng.minmax(0, 512),
            size: starfieldRng.minmax(0.9, 2.5),
            alpha: starfieldRng.minmax(0.08, 0.25),
            spin: starfieldRng.minmax(-1.2, 1.2),
            seed: starfieldRng.minmax(0, 100),
        });
    }

    const centerFracX = 0.5;
    const centerFracY = 0.5;

    return (context: CanvasRenderingContext2D, helper: CanvasHelper) => {
        const canvasWidth = context.canvas.width;
        const canvasHeight = context.canvas.height;

        // Smooth fisheye strength toward its target; the world renders into
        // an offscreen canvas while the warp is active, then gets tiled back
        // with a radial barrel mapping (center sharp, edges warped).
        //
        // Speed-driven (user 2026-11-08): keyed to the ship's ACTUAL total
        // velocity, never to the boost button. Curve in Camera.ts.
        let fisheyeTarget = 0;
        if (!reducedMotion) {
            fisheyeTarget = fisheyeTargetForSpeed(u.ship.velocity.mag(), UniverseConst.CRAFT_SPEED_LIMIT_BOOST);
            if (fisheyeTarget > fisheyeSmooth) fisheyeSmooth = Math.min(fisheyeTarget, fisheyeSmooth + u.dt * 2.2);
            else fisheyeSmooth = Math.max(fisheyeTarget, fisheyeSmooth - u.dt * 3.0);
        } else {
            fisheyeSmooth = 0;
        }
        const usePostFX = ensurePostFX();
        const warpActive = fisheyeSmooth > 0.01;
        // With postFX on, the world ALWAYS renders into offCanvas (the WebGL
        // source). The shader applies the warp itself — the old 2D tile
        // fisheye is skipped to avoid double distortion.
        const drawCtx = (usePostFX || warpActive) ? offCtx : context;
        if (usePostFX || warpActive) {
            if (offCanvas.width !== canvasWidth) offCanvas.width = canvasWidth;
            if (offCanvas.height !== canvasHeight) offCanvas.height = canvasHeight;
        }
        const w2 = drawCtx;
        w2.fillStyle = Colors.Eigengrau;
        w2.fillRect(0, 0, canvasWidth, canvasHeight);

        // Near-star glare factor (user 2026-11-09): 0 = inside the wash zone
        // (close!), 1 = normal sky. Starts CLOSE to the star — within
        // ~2R+10 km it ramps down, fully gone at 60 km.
        {
            const dStar = u.ship.pos.distance(u.star.pos);
            const inner = u.star.radius * 2 + 10_000;
            const outer = 60_000;
            nearStarGlare = clamp((dStar - inner) / (outer - inner), 0, 1);
        }

        // Depth layers (P05-T03): distant starfield + foreground dust. Drawn
        // in device pixels (identity transform) BEFORE the world grid: far
        // stars respond to camera translation only (0.08 px/m), never zoom;
        // dust runs hyper-parallax (1.3 px/m). Both wrap in 512 px tiles.
        {
            const dpr = window.devicePixelRatio;
            w2.save();
            w2.setTransform(1, 0, 0, 1, 0, 0);
            const tile = 512;
            const tilesX = Math.ceil(canvasWidth / tile) + 1;
            const tilesY = Math.ceil(canvasHeight / tile) + 1;
            const drawLayer = (dots: StarDot[], pxPerM: number, twinkle: boolean) => {
                const ox = -parallaxOffsetPx(chaseX, dpr, pxPerM);
                const oy = -parallaxOffsetPx(chaseY, dpr, pxPerM);
                const t = performance.now() / 1000;
                // Near-star glare (user 2026-11-09): the sky itself washes
                // out close to the star — distant stars fade. Starts ONLY
                // near: full wash inside ~2R+10 km, zero beyond 60 km.
                let glare = 1;
                if (nearStarGlare < 1) {
                    glare = 0.18 + 0.82 * nearStarGlare;
                }
                for (const dot of dots) {
                    const bx = wrapTile(dot.x + ox, tile);
                    const by = wrapTile(dot.y + oy, tile);
                    // gentle per-star twinkle (far layers only): ±12% slow
                    // alpha breathing — alive, never flickery
                    let a = dot.alpha;
                    if (twinkle && dot.twinkleRate > 0) {
                        a *= 0.88 + 0.12 * Math.sin(t * dot.twinkleRate + dot.twinklePhase);
                    }
                    const sz = dot.size * dpr;
                    for (let tx = 0; tx < tilesX; tx++) {
                        for (let ty = 0; ty < tilesY; ty++) {
                            const px = bx + tx * tile;
                            const py = by + ty * tile;
                            w2.globalAlpha = a * glare;
                            w2.fillStyle = dot.color;
                            w2.fillRect(px, py, sz, sz);
                            if (dot.glint) {
                                // 4-point diffraction flare for the brightest
                                // few: two hairline crosses, ultra-subtle
                                w2.globalAlpha = a * 0.4 * glare;
                                const g = sz * 4;
                                w2.fillRect(px - g + sz / 2, py, g * 2, 0.8 * dpr);
                                w2.fillRect(px, py - g + sz / 2, 0.8 * dpr, g * 2);
                            }
                        }
                    }
                }
                w2.globalAlpha = 1;
            };
            // galaxies (deep sky, deepest layer): CONTINUOUS fixed field —
            // each spiral has a stable position with slow parallax, so they
            // glide steadily and never pop in/out at tile boundaries (the
            // per-tile hash used before made galaxies blink "appear/vanish").
            {
                const gox = -parallaxOffsetPx(chaseX, dpr, STARFIELD_PARALLAX_PX_PER_M * 0.6);
                const goy = -parallaxOffsetPx(chaseY, dpr, STARFIELD_PARALLAX_PX_PER_M * 0.6);
                const P = 2800; // fixed field period (px at dpr=1)
                for (let i = 0; i < galaxies.length; i++) {
                    const g = galaxies[i];
                    const base = tileHash(0, 0, i * 7 + 3); // stable per galaxy
                    // ~28% density: emptier sky (halved again, user 2026-11-09)
                    if (tileHash(0, 0, i * 13 + 5) > 0.72) continue;
                    const gx0 = tileHash(0, 0, i * 17 + 11) * P;
                    const gy0 = tileHash(0, 0, i * 19 + 13) * P;
                    const size = (g.rx * 3.4) * dpr;
                    const rot = tileHash(0, 0, i * 23 + 17) * PI * 2;
                    const alpha = 0.16 + tileHash(0, 0, i * 29 + 19) * 0.2;
                    for (let tx = -1; tx <= tilesX; tx++) {
                        for (let ty = -1; ty <= tilesY; ty++) {
                            const wx = wrapTile(gx0 + gox, P) + tx * P;
                            const wy = wrapTile(gy0 + goy, P) + ty * P;
                            if (wx < -size || wy < -size || wx > canvasWidth + size || wy > canvasHeight + size) continue;
                            w2.save();
                            w2.translate(wx, wy);
                            w2.rotate(rot);
                            w2.globalAlpha = alpha;
                            w2.drawImage(g.sprite, -size / 2, -size / 2, size, size);
                            w2.restore();
                        }
                    }
                }
                w2.globalAlpha = 1;
            }
            drawLayer(band, STARFIELD_PARALLAX_PX_PER_M * 0.8, false);
            drawLayer(starfield, STARFIELD_PARALLAX_PX_PER_M, true);
            drawLayer(midfield, 0.15, false);
            drawLayer(dustfield, DUST_PARALLAX_PX_PER_M, false);
            // Near debris: tumbling triangles on the 2.5 px/m plane.
            const dox = -parallaxOffsetPx(chaseX, dpr, 2.5);
            const doy = -parallaxOffsetPx(chaseY, dpr, 2.5);
            const now = performance.now() / 1000;
            for (const dt2 of debris) {
                const bx = wrapTile(dt2.x + dox, tile);
                const by = wrapTile(dt2.y + doy, tile);
                for (let tx = 0; tx < tilesX; tx++) {
                    for (let ty = 0; ty < tilesY; ty++) {
                        const cx = bx + tx * tile;
                        const cy = by + ty * tile;
                        const s = dt2.size * dpr;
                        const rot = now * dt2.spin + dt2.seed;
                        w2.save();
                        w2.translate(cx, cy);
                        w2.rotate(rot);
                        w2.globalAlpha = dt2.alpha;
                        w2.fillStyle = "#8A7D72";
                        w2.beginPath();
                        w2.moveTo(s, 0);
                        w2.lineTo(-s * 0.7, s * 0.6);
                        w2.lineTo(-s * 0.3, -s * 0.8);
                        w2.closePath();
                        w2.fill();
                        w2.restore();
                    }
                }
            }
            w2.globalAlpha = 1;
            w2.restore();

            // R-006 horizon cues (screen space, device px): the view is
            // ~450 m wide at 1 px/m, so the star and planets are usually
            // OFF-SCREEN. A distant glare toward the star + an edge
            // diamond toward the nearest planet keep the first screen
            // navigable without teleporting the player.
            {
                const m2s = (wx: number, wy: number): [number, number] => [
                    (wx - chaseX) * cameraZoom * dpr + canvasWidth / 2,
                    (wy - chaseY) * cameraZoom * dpr + canvasHeight / 2,
                ];
                const [starSx, starSy] = m2s(u.star.pos.x, u.star.pos.y);
                const starOn = starSx > -200 && starSx < canvasWidth + 200 && starSy > -200 && starSy < canvasHeight + 200;
                if (!starOn) {
                    const gx = clamp(starSx, 40, canvasWidth - 40);
                    const gy = clamp(starSy, 40, canvasHeight - 40);
                    // soften: nearer to the edge → stronger
                    const edgeProx = Math.max(Math.abs(starSx - gx), Math.abs(starSy - gy));
                    const a = clamp(0.55 - edgeProx / (canvasWidth * 2), 0.12, 0.4);
                    w2.save();
                    w2.setTransform(1, 0, 0, 1, 0, 0);
                    w2.globalCompositeOperation = "lighter";
                    const rg = 90 * dpr;
                    const grad = w2.createRadialGradient(gx, gy, 0, gx, gy, rg);
                    grad.addColorStop(0, "rgba(255,240,200," + a + ")");
                    grad.addColorStop(0.4, "rgba(255,210,130," + (a * 0.4) + ")");
                    grad.addColorStop(1, "rgba(255,210,130,0)");
                    w2.fillStyle = grad;
                    w2.beginPath(); w2.arc(gx, gy, rg, 0, PI * 2); w2.fill();
                    w2.restore();
                }
                const nearP = u.closestPlanetForZoom();
                const [px, py] = m2s(nearP.pos.x, nearP.pos.y);
                const pOn = px > -60 && px < canvasWidth + 60 && py > -60 && py < canvasHeight + 60;
                if (!pOn) {
                    const ex = clamp(px, 26 * dpr, canvasWidth - 26 * dpr);
                    const ey = clamp(py, 26 * dpr, canvasHeight - 26 * dpr);
                    w2.save();
                    w2.setTransform(1, 0, 0, 1, 0, 0);
                    w2.translate(ex, ey);
                    w2.rotate(Math.atan2(py - ey, px - ex) + PI / 2);
                    w2.fillStyle = "rgba(167,167,202,0.85)";
                    const s = 7 * dpr;
                    w2.beginPath();
                    w2.moveTo(0, -s); w2.lineTo(s, 0); w2.lineTo(0, s); w2.lineTo(-s, 0);
                    w2.closePath(); w2.fill();
                    w2.restore();
                }
            }
        }

        // High-DPI fix (user report: 2.5K phone showed the world ~3x too far).
        // cameraZoom is now expressed in CSS pixels per meter, so the world
        // keeps the same on-screen size on any display density. The canvas is
        // devicePixelRatio times larger in device pixels, so the context must
        // be scaled by zoom * dpr. Before this fix the zoom operated directly
        // in device pixels: on a dpr~3 phone 1 meter was 1/3 of a CSS pixel
        // and everything looked tiny even at rest.
        const dpr = window.devicePixelRatio;
        const deviceScale = cameraZoom * dpr;

        if (DYNAMIC_ZOOM) {
            const closest = u.closestPlanetForZoom();
            const distToNearestSurf = max(0, (u.ship.pos.distance(closest.pos)) - closest.radius * 1.2);
            const targetZoom = clamp(500 / distToNearestSurf, MIN_CAMERA_ZOOM, MAX_CAMERA_ZOOM) / CAMERA_DISTANCE;
            cameraZoom = isBaklava ? expSmooth(cameraZoom, targetZoom, u.dt, 1.5) : targetZoom;
        } else if (SPEED_ZOOM_ENABLED) {
            // Player-facing: camera view scales smoothly with ship speed.
            // Visible-space factor: stopped -> SPEED_ZOOM_NEAR (closer),
            // SPEED_ZOOM_REF (medium) -> exactly the original view,
            // CRAFT_SPEED_LIMIT (max) -> SPEED_ZOOM_FAR (farther).
            const speed = u.ship.velocity.mag();
            // One smooth curve, no kinks (extracted to Camera.ts, P05-T02):
            // both halves flatten at the junction (speed == SPEED_ZOOM_REF).
            // Above the base cap (boost), keep easing out to 2x the far factor.
            let factor: number;
            if (speed <= UniverseConst.CRAFT_SPEED_LIMIT) {
                factor = velocityZoomFactor(speed, SPEED_ZOOM_NEAR, SPEED_ZOOM_FAR, SPEED_ZOOM_REF, UniverseConst.CRAFT_SPEED_LIMIT);
            } else {
                const t = clamp((speed - UniverseConst.CRAFT_SPEED_LIMIT) / (UniverseConst.CRAFT_SPEED_LIMIT_BOOST - UniverseConst.CRAFT_SPEED_LIMIT), 0, 1);
                factor = SPEED_ZOOM_FAR + (SPEED_ZOOM_FAR_BOOST - SPEED_ZOOM_FAR) * t * t;
            }
            const targetZoom = (camZoom / CAMERA_DISTANCE) / factor;
            // Clamp to a positive range: a zero/negative cameraZoom would hang the
            // gridStep while-loop below and freeze the whole page.
            // The scan pull lives OUTSIDE the smoothed clamp (user 2026-11-09):
            // zoomBase converges to its own target; cameraZoom = base/pull.
            zoomBase = clamp(expSmooth(zoomBase, targetZoom, u.dt, 2.5), MIN_CAMERA_ZOOM, MAX_CAMERA_ZOOM);
            cameraZoom = zoomBase / scanPull;
        } else if (!TOUCH_CAMERA_ZOOM) {
            cameraZoom = isBaklava ? expSmooth(cameraZoom, DEFAULT_CAMERA_ZOOM / CAMERA_DISTANCE, u.dt, 5) : DEFAULT_CAMERA_ZOOM / CAMERA_DISTANCE;
            zoomBase = cameraZoom;
        } else {
            cameraZoom = isBaklava ? expSmooth(cameraZoom, camZoom / CAMERA_DISTANCE, u.dt, 5) : camZoom / CAMERA_DISTANCE;
            zoomBase = cameraZoom;
        }
        // Mirror the pull-free base zoom out of the closure (scanner reads it).
        scanZoomBase = zoomBase;
        if (!TOUCH_CAMERA_PAN) {
            const follow = u.follow;
            if (follow !== null) {
                // Exponential follow (frame-rate independent chase, P05-T02):
                // kills the discrete-step jitter of instant follow at low FPS
                // while keeping a sub-screen-size steady-state lag (≤70 px at
                // max speed zoomed out; ~0 at rest). On the first frame the
                // chase snaps to the ship so there is no swoop on load.
                if (!chaseInitialized) {
                    chaseX = follow.pos.x;
                    chaseY = follow.pos.y;
                    chaseInitialized = true;
                } else if (u.dt > 0) {
                    const chased = chaseCamera(
                        { centerX: chaseX, centerY: chaseY, followRate: CAMERA_FOLLOW_RATE },
                        follow.pos.x,
                        follow.pos.y,
                        u.dt,
                    );
                    chaseX = chased.centerX;
                    chaseY = chased.centerY;
                }

                // Kick bookkeeping (P05-T04): landing and discovery events
                // inject short offsets; the kick decays to exact zero.
                if (!reducedMotion) {
                    const landingNow = u.ship.landing !== null;
                    if (landingNow && !prevLanding) {
                        kickX += kickMetersForScreenPx(2.5, cameraZoom) * (Math.random() < 0.5 ? -1 : 1);
                        kickY += kickMetersForScreenPx(2.5, cameraZoom) * (Math.random() < 0.5 ? -1 : 1);
                        impactFlash = 0.7; // P08 impact profile trigger
                        impactShake = 0.0015;
                    }
                    prevLanding = landingNow;
                    const discId = u.latestDiscovery ? u.latestDiscovery.id : null;
                    if (discId !== null && discId !== prevDiscovery) {
                        kickY += kickMetersForScreenPx(2, cameraZoom);
                        impactFlash = Math.max(impactFlash, 0.3);
                    }
                    prevDiscovery = discId;
                    if (u.dt > 0) {
                        const decayed = decayKick({ x: kickX, y: kickY }, u.dt, KICK_DECAY_RATE);
                        kickX = decayed.x;
                        kickY = decayed.y;
                    }
                }
                cameraOffsetX = -(chaseX + kickX);
                cameraOffsetY = -(chaseY + kickY);
            } else {
                cameraOffsetX = cameraOffsetY = 0;
                chaseInitialized = false;
            }
        }

        // cameraZoom: CSS pixels per meter (display-density independent)
        // deviceScale: metersToPixels (device pixels, = cameraZoom * dpr)
        // visibleSpaceSizeMeters: meters
        // cameraOffset: meters ≈ vector pointing from ship to (0,0) (e.g. -pos)
        const visibleSpaceSizeMeterWidth = canvasWidth / deviceScale; // meters x meters
        const visibleSpaceSizeMeterHeight = canvasHeight / deviceScale; // meters x meters
        const visibleSpaceRectMeterLeft = -cameraOffsetX - visibleSpaceSizeMeterWidth * centerFracX;
        const visibleSpaceRectMeterTop = -cameraOffsetY - visibleSpaceSizeMeterHeight * centerFracY;
        const visibleSpaceRectMeterRight = visibleSpaceRectMeterLeft + visibleSpaceSizeMeterWidth;
        const visibleSpaceRectMeterBottom = visibleSpaceRectMeterTop + visibleSpaceSizeMeterHeight;
        const visibleSpaceRectMeterCenterX = visibleSpaceRectMeterLeft + (visibleSpaceSizeMeterWidth / 2);
        const visibleSpaceRectMeterCenterY = visibleSpaceRectMeterTop + (visibleSpaceSizeMeterHeight / 2);

        // World background grid REMOVED (user 2026-11-09): the 10-pow grid
        // over the real map read as noise; the radar schematic map has its
        // own subtle grid instead.

        w2.save();
        w2.scale(deviceScale, deviceScale);
        w2.translate(
            (-visibleSpaceRectMeterCenterX + canvasWidth * 0.5 / deviceScale),
            (-visibleSpaceRectMeterCenterY + canvasHeight * 0.5 / deviceScale)
        );
        helper.x = visibleSpaceRectMeterLeft;
        helper.y = visibleSpaceRectMeterTop;
        helper.width = visibleSpaceSizeMeterWidth;
        helper.height = visibleSpaceSizeMeterHeight;
        helper.radius = sqrt((visibleSpaceSizeMeterWidth * visibleSpaceSizeMeterWidth + visibleSpaceSizeMeterHeight * visibleSpaceSizeMeterHeight) / 4);
        // All coordinates are space coordinates now.

        // debug outer frame
        // drawRect(
        //     Colors.Eigengrau2,
        //     visibleSpaceRectMeters.topLeft,
        //     visibleSpaceRectMeters.size,
        //     style = Stroke(width = 10f / cameraZoom)
        // )

        zoomedDrawScope.zoom = cameraZoom;
        zoomedDrawScope.context = w2;
        zoomedDrawScope.helper = helper;
        zoomedDrawScope.drawUniverse(u);

        w2.restore();

        // P08 WebGL composite (or legacy 2D fisheye when postFX is off).
        if (usePostFX && postfx && postCanvas) {
            if (postCanvas.width !== canvasWidth) postCanvas.width = canvasWidth;
            if (postCanvas.height !== canvasHeight) postCanvas.height = canvasHeight;
            postfx.resize();
            if (requestedPostFXTier) postfx.tier = requestedPostFXTier as typeof postfx.tier;
            const toUV = (wx: number, wy: number): [number, number] => [
                (wx - helper.x) / helper.width,
                (wy - helper.y) / helper.height,
            ];
            const [bhu, bhv] = toUV(BLACK_HOLE.x, BLACK_HOLE.y);
            const [starU, starV] = toUV(u.star.pos.x, u.star.pos.y);
            const bhDist = Math.hypot(u.ship.pos.x - BLACK_HOLE.x, u.ship.pos.y - BLACK_HOLE.y);
            // impact decay (exact zero termination, P08)
            if (u.dt > 0) {
                impactFlash = impactFlash * Math.exp(-6 * u.dt);
                if (impactFlash < 0.005) impactFlash = 0;
                impactShake = impactShake * Math.exp(-6 * u.dt);
                if (impactShake < 0.00005) impactShake = 0;
            }
            const neb = zoomedDrawScope.nebulaAt(u.ship.pos.x, u.ship.pos.y);
            const params: PostFXParams = {
                ...NEUTRAL_PARAMS,
                warp: fisheyeSmooth / 0.6,
                blackHole: bhDist < BLACK_HOLE.r * 8 ? clamp(1 - bhDist / (BLACK_HOLE.r * 8), 0, 1) : 0,
                starHeat: (u as { starProximity?: number }).starProximity ?? 0,
                nebula: neb.amount,
                nebR: neb.r, nebG: neb.g, nebB: neb.b,
                impact: impactFlash,
                shakeX: impactShake,
                bhU: bhu, bhV: bhv,
                bhRadius: (BLACK_HOLE.r / helper.width) * 0.5,
                starU, starV,
                time: performance.now() / 1000,
            };
            const ok = postfx.render(params);
            if (!ok) {
                context.drawImage(offCanvas, 0, 0);
            }
        } else if (warpActive) {
            // Fisheye blit: radial barrel mapping offscreen → screen, tile by tile.
            const cx = canvasWidth / 2;
            const cy = canvasHeight / 2;
            const R = Math.hypot(cx, cy);
            const T = 48; // device-px tile
            const k = 0.30 * fisheyeSmooth;
            for (let ty = 0; ty < canvasHeight; ty += T) {
                for (let tx = 0; tx < canvasWidth; tx += T) {
                    const dx = tx + T / 2 - cx;
                    const dy = ty + T / 2 - cy;
                    const r = Math.hypot(dx, dy);
                    const t = r / R;
                    const srcR = r * (1 - k * t * t);
                    const sx = cx + (dx / (r || 1)) * srcR;
                    const sy = cy + (dy / (r || 1)) * srcR;
                    context.drawImage(offCanvas, clamp(sx - T / 2, 0, canvasWidth - T), clamp(sy - T / 2, 0, canvasHeight - T), T, T, tx, ty, T, T);
                }
            }
        }
    }
}

export function getCamZoom(): number {
    return camZoom;
}

export function setCamZoom(zoom: number) {
    camZoom = clamp(zoom, MIN_CAMERA_ZOOM, MAX_CAMERA_ZOOM);
}

export function setDynamicZoom(dynamic: boolean) {
    DYNAMIC_ZOOM = dynamic;
}

export function setRandomSeedType(type: RandomSeedType) {
    RANDOM_SEED_TYPE = type;
}

export function setFixedRandomSeed(seed: bigint) {
    FIXED_RANDOM_SEED = seed;
}

export function setPlaySpeed(speed: number) {
    playSpeed = speed;
}

/** Enable/disable the player-facing velocity zoom-out effect. */
export function setSpeedZoomEnabled(enabled: boolean) {
    SPEED_ZOOM_ENABLED = enabled;
}

/** (Removed) boost-driven fisheye hook — fisheye is velocity-based now. */
export function setBoostEngaged(engaged: boolean) {
    // Kept as a no-op for API stability; the fisheye no longer reads the
    // boost button (user 2026-11-08). The burner's own HUD effect is the
    // boostGlow overlay below.
    void engaged;
}

export function setIsBaklava(baklava: boolean) {    if (baklava != isBaklava) {
        const iconLink = document.querySelector("link[rel=\"shortcut icon\"]") as HTMLLinkElement;
        if (iconLink) {
            const newUrl = baklava ? "baklava_platlogo.svg" : "favicon15.svg";
            iconLink.href = newUrl;
        }
    }
    isBaklava = baklava;
}

export function getIsBaklava() {
    return isBaklava;
}

export function MainActivity15(topText: HTMLElement, bottomText: HTMLElement,
    topContainer: HTMLElement, bottomContainer: HTMLElement, autopilotText: HTMLElement,
    inputLayer: InputActionLayer) {
    const universe = new VisibleUniverse15(new Namer15(), randomSeed());
    const zoomedDrawScope = new ZoomedDrawScope15();

    if (TEST_UNIVERSE) {
        universe.initTest();
    } else {
        universe.initRandom();
    }
    cachedMassString = sprintf("  MASS: %.3e\n", universe.star.mass);

    const space = Spaaaace(universe, zoomedDrawScope);

    // Stick desired heading (smooth-turn target, user 2026-11-09): the ship
    // does NOT snap its nose to the stick — it turns toward the stick's bar
    // until the bars dock into one line.
    let stickDesiredAngle: number | null = null;
    let stickMag = 0;

    // Flight stick sized 1.5x smaller than the reference (user request): the
    // full-size stick felt like it covered the whole screen on phones.
    const minRadius = toLocalPx(33);
    const maxRadius = toLocalPx(67);

    const flightStick = FlightStick(
        minRadius,
        maxRadius,
        Colors.Console,
        (x, y, isDown) => {
            // every device feeds the same action layer (P04-T01); the stick
            // mapping below stays the reference behavior for stick input.
            // The SHIP does NOT snap to the stick — applyKeyboardFlight
            // smoothly turns the nose toward stickDesiredAngle instead.
            inputLayer.setStick(x, y, isDown);
            if (universe.follow instanceof Spacecraft) {
                const ship = universe.follow as Spacecraft;
                if (!isDown) {
                    stickDesiredAngle = null;
                    stickMag = 0;
                    ship.thrust.x = 0;
                    ship.thrust.y = 0;
                } else {
                    stickDesiredAngle = atan2(y, x);
                    const m = sqrt(x * x + y * y);
                    stickMag = m < minRadius ? 0 : clamp(lexp(minRadius, maxRadius, m), 0, 1);
                    ship.thrust.x = 0;
                    ship.thrust.y = 0;
                }
            }
        }
    );
    const autopilot = new Autopilot15(universe.ship as Spacecraft15, universe);
    const flightStickDraw = flightStick.draw;
    // Dual alignment bars (user 2026-11-09, WT-style): two wide bars pinned
    // to the ship, CONSTANT screen size at any camera zoom — white shows the
    // joystick direction, button-colored shows the ship heading; aligned =
    // straight flight. Only while the stick is touched (fade on release).
    let stickBarsAlpha = 0;
    function drawStickBars(context: CanvasRenderingContext2D, helper: CanvasHelper) {
        const actions = inputLayer.resolve();
        if (actions.stickActive) stickBarsAlpha = Math.min(1, stickBarsAlpha + 0.12);
        else stickBarsAlpha = Math.max(0, stickBarsAlpha - 0.06);
        if (stickBarsAlpha <= 0.01) return;
        const dpr = window.devicePixelRatio || 1;
        // anchor: the SHIP (the camera chase has an offset, the ship is not
        // always dead-center) — convert world (top-left + span) to device px.
        const zoom = context.canvas.width / Math.max(1, helper.width);
        const sx = (universe.ship.pos.x - helper.x) * zoom;
        const sy = (universe.ship.pos.y - helper.y) * zoom;
        const stickA = Math.atan2(actions.stickY, actions.stickX);
        const shipA = universe.ship.angle;
        // two concentric invisible rings around the ship: the near bar (ship
        // heading, button color) and the far bar (stick, white). Directed
        // collinearly they dock into one perfect line = straight flight.
        // THIN and SHORT (user 2026-11-09), close to the hull, docking
        // tight (user 2026-11-09).
        const ringNear = 25 * dpr;
        const ringFar = 40 * dpr;
        const tick = (ring: number, ang: number, color: string) => {
            context.save();
            context.translate(sx + Math.cos(ang) * ring, sy + Math.sin(ang) * ring);
            context.rotate(ang);
            context.fillStyle = color;
            context.globalAlpha = stickBarsAlpha * 0.95;
            context.beginPath();
            context.roundRect(-6 * dpr, -1.2 * dpr, 12 * dpr, 2.4 * dpr, 1.2 * dpr);
            context.fill();
            context.restore();
        };
        context.globalAlpha = 1;
        tick(ringNear, shipA, "#7A7A9E");
        tick(ringFar, stickA, "#FFFFFF");
    }
    const telemetry = Telemetry(universe, autopilot, topText, bottomText, topContainer, bottomContainer, autopilotText);
    const ship = universe.ship as Spacecraft15;
    ship.autopilot = autopilot;
    universe.addEntity(autopilot);

    function setAutopilot(enabled: boolean) {
        if (autopilot.enabled && !enabled) {
            ship.thrust.x = ship.thrust.y = 0;
        }
        autopilot.enabled = enabled;
    }

    // Keyboard flight (P04-T01, user 2026-11-09: W A D only — S removed).
    // Steering is SMOOTH: the A/D motor spools up/down (expSmooth), so the
    // ship rotates with acceleration instead of snapping. Powered turning
    // is quick (test model is nimble).
    let lastFrameMillis = -1;
    let steerMotor = 0; // smoothed -1..1, also drives the side-engine stub
    const KEYBOARD_TURN_RATE = 3.0; // rad/s at full motor (nimble test model)
    function applyKeyboardFlight(millis: number) {
        const actions = inputLayer.resolve();
        const target = universe.follow instanceof Spacecraft ? universe.follow as Spacecraft : null;
        // safety takeover (user 2026-11-09): the joystick does not respond
        // until the shield hands control back (or the player aborts it).
        if (target !== null && (safeHold || autoLand)) {
            target.thrust.x = 0;
            target.thrust.y = 0;
            lastFrameMillis = millis;
            return;
        }
        const dt = lastFrameMillis < 0 ? 0 : clamp((millis - lastFrameMillis) / 1000, 0, 0.1);
        if (target !== null && actions.stickActive) {
            // STICK steering (user 2026-11-09): the ship does NOT snap nose
            // to the stick — it turns smoothly toward the stick's bar until
            // the bars dock into one line.
            if (stickDesiredAngle !== null) {
                let err = stickDesiredAngle - target.angle;
                while (err > PI) err -= PI * 2;
                while (err < -PI) err += PI * 2;
                const maxTurn = 2.0 * dt;
                const turn = clamp(err, -maxTurn, maxTurn);
                target.angle += turn;
                steerMotor = maxTurn > 0 ? clamp(turn / maxTurn, -1, 1) : 0;
                (target as unknown as { steerMotor?: number }).steerMotor = steerMotor;
                if (stickMag > 0) Vec2_makeWithAngleMag(target.thrust, target.angle, stickMag);
                else { target.thrust.x = 0; target.thrust.y = 0; }
            }
            lastFrameMillis = millis;
            inputLayer.consumeEdge("interact");
            inputLayer.consumeEdge("scan");
            inputLayer.consumeEdge("landLaunch");
            return;
        }
        if (target !== null && !actions.stickActive) {
            // any player flight input overrides the route pilot (except during
            // the threat stop, where steering back is the designed recovery)
            if (actions.forward > 0 || actions.steer !== 0) playerTookControl = true;
            const dt = lastFrameMillis < 0 ? 0 : clamp((millis - lastFrameMillis) / 1000, 0, 0.1);
            // smooth motor: spools fast in (~8/s), decays fast out (~10/s)
            steerMotor = expSmooth(steerMotor, actions.steer, dt, 8);
            if (Math.abs(steerMotor) < 0.002) steerMotor = 0;
            target.angle += steerMotor * KEYBOARD_TURN_RATE * dt;
            (target as unknown as { steerMotor?: number }).steerMotor = steerMotor;
            if (actions.forward > 0) {
                Vec2_makeWithAngleMag(target.thrust, target.angle, actions.forward);
            } else {
                // no keyboard thrust this frame; the stick release path or the
                // autopilot owns thrust otherwise, zeroing here is safe because
                // simulateFrame re-applies autopilot thrust right after.
                target.thrust.x = 0;
                target.thrust.y = 0;
            }
        }
        lastFrameMillis = millis;
        // Non-pause edges are mapped but their game systems arrive in later
        // phases; consume them so they do not pile up.
        inputLayer.consumeEdge("interact");
        inputLayer.consumeEdge("scan");
        inputLayer.consumeEdge("landLaunch");
    }

    // Boost control (user 2026-11-08): main.ts flips ship.boost + multiplier
    // (both data-driven from the ship profile).
    function setBoost(engaged: boolean) {
        ship.boost = engaged;
        ship.thrustMultiplier = engaged ? ship.profile.boostAccelMultiplier : 1;
    }

    // Boost burner screen glow (user 2026-11-08): a subtle neon edge light in
    // the burner's own color (ship profile). Shown ONLY while boost thrust is
    // actually being applied — burner engaged AND the engine burning — never
    // merely because boost is enabled. Pure HUD overlay: separate from the
    // speed-based fisheye, never intercepts input, fades smoothly both ways,
    // and cannot get stuck (it re-evaluates from live ship state every frame:
    // releasing thrust, disabling boost, braking, hitting the cap or a
    // respawn all drop it naturally).
    const boostGlow = document.getElementById("boostGlow");
    if (boostGlow) boostGlow.style.setProperty("--boost-glow-rgb", ship.profile.boostGlowColor);
    function updateBoostGlow(millis: number) {
        if (!boostGlow) return;
        const burning = ship.boost && ship.thrust.mag() > 0.01;
        if (burning) {
            // Flame-like intensity (user 2026-11-09): three incommensurate
            // sine layers = irregular exhaust flicker, never a static bar.
            const t = millis / 1000;
            const flick = 0.78
                + 0.12 * Math.sin(t * 11.3)
                + 0.06 * Math.sin(t * 23.7 + 1.7)
                + 0.04 * Math.sin(t * 4.7 + 0.4);
            boostGlow.classList.add("active");
            boostGlow.style.opacity = flick.toFixed(3);
        } else if (boostGlow.classList.contains("active")) {
            boostGlow.classList.remove("active");
            boostGlow.style.opacity = ""; // CSS transition fades it out
        }
    }

    // ===== Scanner (user 2026-11-09, NMS-style) =====
    // Trigger → wave visual + instant reveal of bodies in range + a STRONG,
    // SMOOTH camera pull-out ("намного сильнее чем на макс скорости").
    // Contract:
    //  - SCANNER needs a slow ship: speed < SCAN_SPEED_MAX (500 m/s).
    //  - During the wave thrust is disabled (the ship keeps drifting).
    //  - The pull is COMPUTED: the visible half-span lands on the scan
    //    radius — anything scannable fits on screen, anything beyond it
    //    fades under the scan vignette (drawScanWave).
    const scanButton = document.getElementById("scanButton");
    const radarOverlay = document.getElementById("radarOverlay");
    const radarCanvas = document.getElementById("radarCanvas") as HTMLCanvasElement | null;
    const scanHint = document.getElementById("scanHint");
    const scanResult = document.getElementById("scanResult");
    let scanResultTimer: number | null = null;
    let scanHintTimer: number | null = null;
    let scanHintTimerId: number | null = null;
    /**
     * Pending scan (user 2026-11-09): pressing SCAN first PULLS the camera
     * out; the reveal fires only when the pull is (nearly) complete — then
     * the wave runs and the camera glides back. Gas is cut from the press.
     */
    let pendingScan = false;
    let pendingScanClock = 0;
    let pendingScanRealStart = 0;
    /** Seconds since the last fired scan (NaN = never) — fix staleness. */
    let lastScanAge = Number.NaN;
    /** Scanned-area footprints (world meters) — shown colored on the radar. */
    const scannedZones: Array<{ x: number; y: number; r: number }> = [];
    function firePendingScan() {
        pendingScan = false;
        lastScanAge = 0;
        const fx = universe.ship.pos.x;
        const fy = universe.ship.pos.y;
        const res = universe.triggerScan();
        if (res.total > 0) {
            // stacked short cards under the top text (user 2026-11-09): one
            // card per type, appearing sequentially, each auto-removes.
            const rows: string[] = [];
            if (res.planets > 0) rows.push("PLANET ×" + res.planets);
            if (res.asteroids > 0) rows.push("ASTEROID ×" + res.asteroids);
            if (res.else_ > 0) rows.push("OBJECT ×" + res.else_);
            const stack = document.getElementById("scanResults");
            if (stack) {
                stack.replaceChildren();
                rows.forEach((txt, i) => {
                    const el = document.createElement("div");
                    el.className = "scan-result-row";
                    el.textContent = txt;
                    el.style.animationDelay = (i * 0.35) + "s";
                    stack.appendChild(el);
                    window.setTimeout(() => el.remove(), 3400 + i * 350);
                });
            }
            if (scanResult) scanResult.textContent = rows.join(" · ");
        }
        // mark the footprint (colored zone on the radar, even with no finds)
        scannedZones.push({ x: fx, y: fy, r: SCAN_RADIUS });
        while (scannedZones.length > 8) scannedZones.shift();
    }
    function triggerPlayerScan(): number {
        // speed gate (user: "скорость для скана снижаем ниже 500")
        if (universe.ship.velocity.mag() >= SCAN_SPEED_MAX) {
            if (scanHint) {
                scanHint.classList.add("active");
                if (scanHintTimerId !== null) window.clearTimeout(scanHintTimerId);
                scanHintTimerId = window.setTimeout(() => scanHint.classList.remove("active"), 1400);
            }
            return 0;
        }
        if (pendingScan) return 0; // already pulling out
        pendingScan = true;
        pendingScanClock = 0;
        pendingScanRealStart = performance.now();
        return 0;
    }
    function updateScanFx() {
        const s = universe.scan;
        if (!Number.isNaN(lastScanAge)) lastScanAge += universe.dt;
        // gas off during pull-out, reveal and wave (user 2026-11-09)
        const waveActive = s.waveAge >= 0 && s.waveAge <= SCAN_WAVE_SECONDS;
        const scanning = pendingScan || waveActive;
        if (scanning) {
            ship.thrust.x = 0;
            ship.thrust.y = 0;
            setBoost(false);
        }
        // STRONG camera pull (user 2026-11-09): the visible half-span must
        // land on the scan radius — far more sky than even top boost speed
        // shows. Smoothed aggressively in, gently out. The feedback is
        // self-correcting: growing half-span lowers the wanted pull.
        if (scanning) {
            const dpr = window.devicePixelRatio;
            const cssH = mainCanvas.height / Math.max(1, dpr);
            // pull factor needed so the half-visible-span lands on the scan
            // radius: visible = current × pull → pull = R / currentHalfSpan.
            // (Previously inverted — dividing — so pull stuck at 1.0 and
            // the camera never moved.)
            const currentHalfSpan = cssH / (2 * Math.max(0.000001, scanZoomBase));
            const wantPullRaw = clamp((SCAN_RADIUS * 1.04) / Math.max(1, currentHalfSpan), 1, SCAN_PULL_MAX);
            scanPull = expSmooth(scanPull, wantPullRaw, universe.dt, 3.0);
            // fire the reveal once the camera has (nearly) arrived at the
            // full pull-out — or, failing that, after a hard timeout so a
            // scan can never hang.
            if (pendingScan) {
                pendingScanClock += universe.dt;
                // hard timeout on REAL time too: if the radar is opened right
                // after the press, the sim (and the pull) freezes — the scan
                // must still fire rather than hang forever.
                if (scanPull >= wantPullRaw * 0.97 || pendingScanClock > 3
                    || (performance.now() - pendingScanRealStart) / 1000 > 3) firePendingScan();
            }
        } else {
            scanPull = expSmooth(scanPull, 1, universe.dt, 1.6);
        }
        // button cooldown sweep
        if (scanButton) {
            const cd = s.cooldown;
            const tooFast = universe.ship.velocity.mag() >= SCAN_SPEED_MAX;
            if (cd > 0) {
                (scanButton as HTMLButtonElement).disabled = true;
                const frac = cd / SCAN_COOLDOWN;
                scanButton.style.background =
                    "conic-gradient(rgba(167,167,202,0.35) " + ((1 - frac) * 360) + "deg, rgba(22,22,29,0.72) 0deg)";
            } else if (tooFast) {
                (scanButton as HTMLButtonElement).disabled = true;
                scanButton.style.background = ""; // grey like the boost button (user 2026-11-09)
            } else {
                (scanButton as HTMLButtonElement).disabled = false;
                scanButton.style.background = "";
            }
        }
    }

    /**
     * Radar / system map (user 2026-11-09 v2): schematic star-centered view
     * that the player can PAN and ZOOM (wheel / drag / pinch), with a soft
     * grid INSIDE the map. Discovered (scanned/explored) planets = contact
     * areas (uncertainty, not exact points); visited = exact glyph; unknown
     * = faint area + "?"; scanned asteroids = ABSTRACT density blobs on a
     * 30 km grid (never individual rocks); cargo = diamonds + area.
     * per frame while open (the sim keeps running — it's an overlay).
     */
    function drawRadar() {
        if (!radarOpen || !radarCanvas) return;
        const ctx2 = radarCanvas.getContext("2d");
        if (!ctx2) return;
        const W = radarCanvas.width;
        const H = radarCanvas.height;
        const c = W / 2;
        const star = universe.star;
        ctx2.clearRect(0, 0, W, H);
        // world→radar transform: pan (world meters) + zoom, anchored to star
        const scaleBase = radarBaseScale();
        const scale = scaleBase * radarZoom;
        const worldToScreen = (x: number, y: number): [number, number] => [
            (x - star.pos.x - radarPanX) * scale + c,
            (y - star.pos.y - radarPanY) * scale + c,
        ];
        const screenToWorld = (px: number, py: number): [number, number] => [
            star.pos.x + radarPanX + (px - c) / scale,
            star.pos.y + radarPanY + (py - c) / scale,
        ];
        ctx2.save();
        // Radar uncertainty & range (user 2026-11-09): contacts are AREAS
        // whose size grows with distance from the ship and which fade out
        // far away — the whole map is NOT revealed at once (no cheating).
        // Glyphs are large enough for fat fingers (18+ px hit areas).
        const shipPos = universe.ship.pos;
        const RADAR_RANGE = 190_000;
        const rangeFade = (d: number) => Math.max(0, Math.min(1, (RADAR_RANGE - d) / (RADAR_RANGE * 0.55)));
        // node placement bumps the sweep so the radar RECOMPUTES the system
        // at that moment (contacts re-roll immediately, not up to 0.6s later)
        const bucket = Math.floor(universe.now / 0.6) + radarBucketBump;
        const jitter2 = (seed: number): [number, number] => {
            const h = (i: number) => {
                const v = Math.sin((seed + 1) * 12.9898 + (bucket + i) * 78.233) * 43758.5453;
                return (v - Math.floor(v)) * 2 - 1;
            };
            return [h(0), h(1)];
        };
        // Ship Geolocation sweep has its OWN bucket (no radarBucketBump):
        // placing route nodes must not teleport your own marker.
        const bucketShip = Math.floor(universe.now / 0.6);
        const jitterShip = (seed: number): [number, number] => {
            const h = (i: number) => {
                const v = Math.sin((seed + 1) * 12.9898 + (bucketShip + i) * 78.233) * 43758.5453;
                return (v - Math.floor(v)) * 2 - 1;
            };
            return [h(0), h(1)];
        };
        const drawContact = (sx: number, sy: number, seed: number, outerR: number, stroke: string, soft: string) => {
            ctx2.fillStyle = soft;
            ctx2.beginPath();
            ctx2.arc(sx, sy, outerR * 0.55, 0, PI * 2);
            ctx2.fill();
            ctx2.strokeStyle = stroke;
            ctx2.lineWidth = 1.4;
            ctx2.setLineDash([4, 4]);
            ctx2.beginPath();
            ctx2.arc(sx, sy, outerR, 0, PI * 2);
            ctx2.stroke();
            ctx2.setLineDash([]);
            const [jx, jy] = jitter2(seed);
            ctx2.strokeStyle = stroke;
            ctx2.lineWidth = 1.6;
            ctx2.beginPath();
            ctx2.moveTo(sx + jx * outerR * 0.5 - 3.5, sy + jy * outerR * 0.5);
            ctx2.lineTo(sx + jx * outerR * 0.5 + 3.5, sy + jy * outerR * 0.5);
            ctx2.stroke();
        };
        // soft grid INSIDE the map (user 2026-11-09): 10^k meters per cell
        {
            const cellMinPx = 44;
            const world4px = cellMinPx / scale;
            let stepM = 100;
            while (stepM < world4px) stepM *= 10;
            ctx2.strokeStyle = "rgba(60,60,76,0.35)";
            ctx2.lineWidth = 1;
            const [wx0, wy0] = screenToWorld(0, 0);
            const [wx1, wy1] = screenToWorld(W, H);
            for (let gx = Math.floor(wx0 / stepM) * stepM; gx <= wx1; gx += stepM) {
                const [sx] = worldToScreen(gx, 0);
                ctx2.beginPath();
                ctx2.moveTo(sx, 0);
                ctx2.lineTo(sx, H);
                ctx2.stroke();
            }
            for (let gy = Math.floor(wy0 / stepM) * stepM; gy <= wy1; gy += stepM) {
                const [, sy] = worldToScreen(0, gy);
                ctx2.beginPath();
                ctx2.moveTo(0, sy);
                ctx2.lineTo(W, sy);
                ctx2.stroke();
            }
        }
        // scanned-area footprints (user 2026-11-09): colored zones where a
        // scan already fired; everything else stays dark — scanned space
        // reads COLORED, unscanned space reads DARK.
        for (const z of scannedZones) {
            const [zx, zy] = worldToScreen(z.x, z.y);
            const zr = z.r * scale;
            if (zr < 2 || zr > 2000) { /* still drawn clamped below */ }
            const grad = ctx2.createRadialGradient(zx, zy, 0, zx, zy, Math.max(2, Math.min(2000, zr)));
            grad.addColorStop(0, "rgba(110,200,130,0.10)");
            grad.addColorStop(0.8, "rgba(110,200,130,0.05)");
            grad.addColorStop(1, "rgba(110,200,130,0)");
            ctx2.fillStyle = grad;
            ctx2.beginPath();
            ctx2.arc(zx, zy, Math.max(2, Math.min(2000, zr)), 0, PI * 2);
            ctx2.fill();
            ctx2.strokeStyle = "rgba(110,200,130,0.25)";
            ctx2.lineDashOffset = 0;
            ctx2.setLineDash([2, 6]);
            ctx2.beginPath();
            ctx2.arc(zx, zy, Math.max(2, Math.min(2000, zr)), 0, PI * 2);
            ctx2.stroke();
            ctx2.setLineDash([]);
        }
        // orbit rings (hairline) — ONLY for nearby planets (user 2026-11-09):
        // far orbits are a hard hint and must not show across the whole map.
        for (const p of universe.planets) {
            const dist = Math.hypot(p.pos.x - shipPos.x, p.pos.y - shipPos.y);
            const fade = rangeFade(dist);
            if (fade <= 0.02) continue;
            const r = p.pos.distance(star.pos) * scale;
            const [sx, sy] = worldToScreen(star.pos.x, star.pos.y);
            ctx2.strokeStyle = "rgba(60,60,76," + (0.9 * fade) + ")";
            ctx2.lineWidth = 1 / radarZoom;
            ctx2.beginPath();
            ctx2.arc(sx, sy, r, 0, PI * 2);
            ctx2.stroke();
        }
        ctx2.strokeStyle = "rgba(60,60,76,0.9)";
        // star: color dot + CENTERED uncertainty ring when scanned (the ring
        // must be exactly on the star — user 2026-11-09), class only after scan
        {
            const [sx, sy] = worldToScreen(star.pos.x, star.pos.y);
            ctx2.fillStyle = star.color;
            ctx2.beginPath();
            ctx2.arc(sx, sy, Math.max(3, star.radius * scale * 1.6), 0, PI * 2);
            ctx2.fill();
            if (star.scanned) {
                ctx2.strokeStyle = star.color;
                ctx2.lineWidth = 1.4;
                ctx2.setLineDash([4, 4]);
                ctx2.beginPath();
                ctx2.arc(sx, sy, Math.max(10, star.radius * scale * 2.4), 0, PI * 2);
                ctx2.stroke();
                ctx2.setLineDash([]);
            }
            // star label: only when zoomed right in, opaque plate over the star
            if (star.scanned && radarZoom >= 4 && sx > 30 && sx < W - 30 && sy > 30 && sy < H - 30) {
                const txt = star.name + " (" + star.cls + ")";
                ctx2.font = "bold 13px 'Roboto Mono', monospace";
                const tw = txt.length * 7.8 + 12;
                ctx2.fillStyle = "rgba(8,8,13,1)";
                ctx2.fillRect(sx - tw / 2, sy + 14, tw, 18);
                ctx2.strokeStyle = star.color;
                ctx2.lineWidth = 1;
                ctx2.strokeRect(sx - tw / 2 + 0.5, sy + 14.5, tw - 1, 17);
                ctx2.fillStyle = "#FFFFFF";
                ctx2.textAlign = "center";
                ctx2.fillText(txt, sx, sy + 28);
                ctx2.textAlign = "left";
            }
        }
        // planets: SCANNED = uncertainty area (grows + fades with distance);
        // VISITED (explored) = big exact glyph (known); unknown = faint area.
        // Glyphs are WORLD-SIZED (user 2026-11-09): zooming IN enlarges them
        // like everything else — they never shrink relative to the view —
        // with px clamps so they stay finger-tappable and never absurd.
        // Labels appear only when ZOOMED IN and only if they fit without
        // overlapping another label (user 2026-11-09).
        const pendingLabels: Array<{ x: number; y: number; text: string; prio: number; color: string }> = [];
        for (const p of universe.planets) {
            const [px, py] = worldToScreen(p.pos.x, p.pos.y);
            const dist = Math.hypot(p.pos.x - shipPos.x, p.pos.y - shipPos.y);
            const fade = rangeFade(dist);
            if (p.explored) {
                ctx2.fillStyle = p.color;
                ctx2.beginPath();
                ctx2.arc(px, py, Math.max(6, Math.min(24, 5000 * scale)), 0, PI * 2);
                ctx2.fill();
                pendingLabels.push({ x: px + 12, y: py + 3, text: p.name, prio: 0, color: "rgba(167,167,202,0.85)" });
            } else if (p.scanned) {
                if (fade <= 0.02) continue;
                ctx2.globalAlpha = fade;
                drawContact(px, py, p.id, Math.max(13, Math.min(48, 9000 * scale + Math.min(10, dist / 30000))), p.color, "rgba(110,110,140,0.10)");
                ctx2.globalAlpha = 1;
                pendingLabels.push({ x: px + 18, y: py + 3, text: p.name, prio: 1, color: "rgba(167,167,202,0.85)" });
            } else {
                // UNKNOWN BODY (user 2026-11-09): only appears when it is
                // actually IN our field of view (within ~60 km) — otherwise
                // the radar would hand us the whole map free, no scanning
                // needed, which is illogical.
                if (dist > 60_000) continue;
                const nearFade = Math.min(1, (60_000 - dist) / 30_000);
                ctx2.globalAlpha = nearFade * 0.9;
                drawContact(px, py, p.id, Math.max(11, Math.min(40, 7000 * scale + Math.min(8, dist / 36000))), "rgba(122,122,158,0.55)", "rgba(80,80,105,0.06)");
                ctx2.globalAlpha = 1;
                pendingLabels.push({ x: px + 16, y: py + 3, text: "?", prio: 2, color: "rgba(122,122,158,0.7)" });
            }
        }
        // Black hole landmark (R-006): always drawn (known navigator
        // landmark), warm disc + photon ring, routable via tap.
        {
            const [bx, by] = worldToScreen(BLACK_HOLE.x, BLACK_HOLE.y);
            ctx2.fillStyle = "#0A0600";
            ctx2.beginPath();
            ctx2.arc(bx, by, Math.max(7, BLACK_HOLE.r * scale), 0, PI * 2);
            ctx2.fill();
            ctx2.strokeStyle = "rgba(255,190,110,0.85)";
            ctx2.lineWidth = 1.6;
            ctx2.beginPath();
            ctx2.arc(bx, by, Math.max(10, BLACK_HOLE.r * scale * 1.5), 0, PI * 2);
            ctx2.stroke();
            pendingLabels.push({ x: bx + 16, y: by + 3, text: "BLACK HOLE", prio: 0, color: "rgba(255,190,110,0.9)" });
        }
        // label placement (user 2026-11-09): ONLY when zoomed RIGHT on the
        // object (deep zoom). Labels sit OVER the object with a 100%
        // opaque plate, LARGE text (readable on phones), never ghosted.
        const placedLabels: Array<{ x0: number; y0: number; x1: number; y1: number }> = [];
        {
            const minZoomFor = (text: string) => text.length > 2 ? 6 : 5;
            pendingLabels.sort((a, b) => a.prio - b.prio);
            ctx2.font = "bold 17px 'Roboto Mono', monospace";
            for (const L of pendingLabels) {
                if (radarZoom < minZoomFor(L.text)) continue;
                const w = L.text.length * 10.2 + 14;
                const x0 = L.x - w / 2, y0 = L.y - 30, x1 = L.x + w / 2, y1 = L.y - 10;
                if (x0 < 4 || y0 < 4 || x1 > W - 4 || y1 > H - 4) continue;
                let clash = false;
                for (const R of placedLabels) {
                    if (x0 < R.x1 + 3 && x1 + 3 > R.x0 && y0 < R.y1 + 3 && y1 + 3 > R.y0) { clash = true; break; }
                }
                if (clash) continue;
                placedLabels.push({ x0, y0, x1, y1 });
                // 100% opaque plate over the object (user 2026-11-09)
                ctx2.fillStyle = "rgba(8,8,13,1)";
                ctx2.fillRect(x0, y0, x1 - x0, y1 - y0);
                ctx2.strokeStyle = "rgba(198,198,232,0.85)";
                ctx2.lineWidth = 1;
                ctx2.strokeRect(x0 + 0.5, y0 + 0.5, x1 - x0 - 1, y1 - y0 - 1);
                ctx2.fillStyle = "#FFFFFF";
                ctx2.fillText(L.text, x0 + 7, y1 - 6);
            }
        }
        if (radarZoom >= 8) {
            const cands: Array<{ x: number; y: number; text: string; r: number }> = [];
            for (const a of universe.asteroids) {
                if (!a.scanned) continue;
                const [px, py] = worldToScreen(a.pos.x, a.pos.y);
                if (px < 20 || py < 20 || px > W - 20 || py > H - 20) continue;
                cands.push({ x: px, y: py, text: Math.round(a.radius * 2) + "M", r: a.radius });
            }
            cands.sort((a, b) => b.r - a.r); // biggest first
            ctx2.font = "bold 14px 'Roboto Mono', monospace";
            for (const L of cands.slice(0, 24)) {
                const w = L.text.length * 8.6 + 12;
                const x0 = L.x - w / 2, y0 = L.y - 26, x1 = L.x + w / 2, y1 = L.y - 8;
                if (x0 < 4 || y0 < 4 || x1 > W - 4 || y1 > H - 4) continue;
                let clash = false;
                for (const R of placedLabels) {
                    if (x0 < R.x1 + 3 && x1 + 3 > R.x0 && y0 < R.y1 + 3 && y1 + 3 > R.y0) { clash = true; break; }
                }
                if (clash) continue;
                placedLabels.push({ x0, y0, x1, y1 });
                ctx2.fillStyle = "rgba(8,8,13,1)";
                ctx2.fillRect(x0, y0, x1 - x0, y1 - y0);
                ctx2.strokeStyle = "rgba(196,180,150,0.6)";
                ctx2.lineWidth = 1;
                ctx2.strokeRect(x0 + 0.5, y0 + 0.5, x1 - x0 - 1, y1 - y0 - 1);
                ctx2.fillStyle = "#FFFFFF";
                ctx2.fillText(L.text, x0 + 5, y1 - 4);
            }
        }
        // scanned asteroids: ABSTRACT CLUSTERS (user 2026-11-09): the radar
        // must not show exact rocks — scanned debris is aggregated into
        // density blobs on a 30 km grid (soft irregular patches whose
        // brightness grows with the rock count). Never dots, never rings.
        {
            const CELL = 30_000;
            const cells = new Map<string, { cx: number; cy: number; n: number }>();
            for (const a of universe.asteroids) {
                if (!a.scanned) continue;
                const gx = Math.floor(a.pos.x / CELL);
                const gy = Math.floor(a.pos.y / CELL);
                const key = gx + "," + gy;
                const e = cells.get(key);
                if (e) e.n++;
                else cells.set(key, { cx: (gx + 0.5) * CELL, cy: (gy + 0.5) * CELL, n: 1 });
            }
            for (const e of cells.values()) {
                const [px, py] = worldToScreen(e.cx, e.cy);
                if (px < -60 || py < -60 || px > W + 60 || py > H + 60) continue;
                // far clusters: blurrier + fainter; beyond range — invisible
                const distCell = Math.hypot(e.cx - shipPos.x, e.cy - shipPos.y);
                const fade = rangeFade(distCell);
                if (fade <= 0.02) continue;
                const n = Math.min(12, e.n);
                const R = Math.max(16, Math.min(64, 14000 * scale + Math.sqrt(n) * 4)) + Math.min(18, distCell / 20000);
                const alpha = (0.05 + Math.min(0.14, n * 0.014)) * fade;
                for (let i = 0; i < 3; i++) {
                    const [jx, jy] = jitter2(e.cx / 1000 + i * 31);
                    ctx2.fillStyle = "rgba(130,120,110," + alpha + ")";
                    ctx2.beginPath();
                    ctx2.arc(px + jx * R * 0.28, py + jy * R * 0.28, R * (1 - i * 0.18), 0, PI * 2);
                    ctx2.fill();
                }
            }
        }
        for (const cargo of universe.cargoShips) {
            if (!cargo.scanned) continue;
            const dist = Math.hypot(cargo.pos.x - shipPos.x, cargo.pos.y - shipPos.y);
            const fade = rangeFade(dist);
            if (fade <= 0.02) continue;
            ctx2.globalAlpha = fade;
            const [px, py] = worldToScreen(cargo.pos.x, cargo.pos.y);
            drawContact(px, py, cargo.id, Math.max(12, Math.min(36, 6000 * scale + Math.min(8, dist / 30000))), cargo.hue, "rgba(80,80,105,0.07)");
            ctx2.save();
            ctx2.translate(px, py);
            ctx2.rotate(Math.PI / 4);
            ctx2.fillStyle = cargo.hue;
            ctx2.fillRect(-3.4, -3.4, 6.8, 6.8);
            ctx2.restore();
            ctx2.globalAlpha = 1;
        }
        // LOD object models (user 2026-11-09): zoomed in, objects grow
        // REAL MODELS — asteroids become their true polygons, cargo ships
        // hulls, planets get inner detail. Grows more detailed the nearer
        // the zoom (true radar fidelity, not icons).
        if (radarZoom >= 2) {
            for (const a of universe.asteroids) {
                if (!a.scanned) continue;
                const dShip = Math.hypot(a.pos.x - shipPos.x, a.pos.y - shipPos.y);
                if (dShip > 120_000) continue; // too far: abstract blob only
                const [px, py] = worldToScreen(a.pos.x, a.pos.y);
                if (px < -30 || py < -30 || px > W + 30 || py > H + 30) continue;
                const baseR = Math.max(7, Math.min(34, a.radius * scale));
                const verts = a.radii.length;
                ctx2.save();
                ctx2.translate(px, py);
                ctx2.rotate(a.angle);
                ctx2.fillStyle = "rgba(150,135,120,0.9)";
                ctx2.beginPath();
                for (let i = 0; i < verts; i++) {
                    const ang = (i / verts) * PI * 2;
                    const rr = baseR * a.radii[i] * (0.4 + 0.6 * Math.min(1, radarZoom / 5));
                    const lx = Math.cos(ang) * rr;
                    const ly = Math.sin(ang) * rr * 0.85;
                    if (i === 0) ctx2.moveTo(lx, ly); else ctx2.lineTo(lx, ly);
                }
                ctx2.closePath();
                ctx2.fill();
                ctx2.strokeStyle = "rgba(225,210,190,0.8)";
                ctx2.lineWidth = 1.2;
                ctx2.stroke();
                ctx2.restore();
            }
        }
        if (radarZoom >= 3) {
            // cargo hull model + planet detail (craters/continents hatches)
            for (const cargo of universe.cargoShips) {
                if (!cargo.scanned) continue;
                const [px, py] = worldToScreen(cargo.pos.x, cargo.pos.y);
                ctx2.save();
                ctx2.translate(px, py);
                ctx2.rotate(cargo.angle);
                ctx2.fillStyle = cargo.hue;
                ctx2.fillRect(-11, -3, 22, 6);
                ctx2.fillRect(-7, -7, 5, 14);
                ctx2.fillStyle = "rgba(255,255,255,0.5)";
                ctx2.fillRect(9, -2, 2, 4);
                ctx2.restore();
            }
        }
        // route nodes: markers + connecting line (map image of the world line)
        if (universe.routeNodes.length > 0) {
            const routeCol = universe.routePhase === "stopped" ? "232,72,56" : "110,200,130";
            ctx2.strokeStyle = "rgba(" + routeCol + ",0.5)";
            ctx2.lineWidth = 1.6;
            ctx2.setLineDash([5, 4]);
            ctx2.beginPath();
            const [shx, shy] = worldToScreen(universe.ship.pos.x, universe.ship.pos.y);
            ctx2.moveTo(shx, shy);
            for (let i = universe.routeNodeIdx; i < universe.routeNodes.length; i++) {
                const n = universe.routeNodes[i];
                const [nx2, ny2] = worldToScreen(n.x, n.y);
                ctx2.lineTo(nx2, ny2);
            }
            ctx2.stroke();
            ctx2.setLineDash([]);
            for (let i = universe.routeNodeIdx; i < universe.routeNodes.length; i++) {
                const n = universe.routeNodes[i];
                const [nx2, ny2] = worldToScreen(n.x, n.y);
                ctx2.strokeStyle = "rgba(" + routeCol + (i === universe.routeNodeIdx ? ",0.9)" : ",0.5)");
                ctx2.lineWidth = 1.4;
                ctx2.beginPath();
                ctx2.arc(nx2, ny2, 5, 0, PI * 2);
                ctx2.stroke();
                // MAGNET highlight (user 2026-11-09): a body-bound node is
                // ringed GREEN — the anchor is live and the pilot tracks it.
                if (n.bodyId !== undefined && n.bodyId !== null) {
                    ctx2.strokeStyle = "rgba(110,220,140,0.9)";
                    ctx2.lineWidth = 1.6;
                    ctx2.setLineDash([3, 3]);
                    ctx2.beginPath();
                    ctx2.arc(nx2, ny2, 9, 0, PI * 2);
                    ctx2.stroke();
                    ctx2.setLineDash([]);
                }
            }
        }
        // ship marker (user 2026-11-09): direction arrow. Precision is a
        // 5-step color ramp: GREEN arrow only (no quad) right at a notable
        // body (star/planet) — the position is exact there; farther away
        // the arrow stays centered in a growing YELLOW uncertainty quad
        // (two parallel + two perpendicular sides, center wandering).
        // IN THE VOID: no ship at all — a wide boundary line shows WHICH
        // SIDE the system lies on (user 2026-11-09).
        const voidNow = (universe as unknown as { voidActive?: boolean }).voidActive === true;
        if (voidNow) {
            const starA = Math.atan2(star.pos.y - universe.ship.pos.y, star.pos.x - universe.ship.pos.x);
            const ang = starA + PI; // from system center outward through us
            const R = W * 0.47;
            ctx2.save();
            ctx2.strokeStyle = "rgba(232,232,242,0.5)";
            ctx2.lineWidth = 5;
            ctx2.setLineDash([8, 6]);
            ctx2.beginPath();
            ctx2.arc(c, c, R, ang - 1.1, ang + 1.1);
            ctx2.stroke();
            ctx2.setLineDash([]);
            ctx2.fillStyle = "rgba(232,232,242,0.75)";
            ctx2.font = "11px 'Roboto Mono', monospace";
            ctx2.textAlign = "center";
            ctx2.fillText("SYSTEM", c + Math.cos(ang) * (R - 16), c + Math.sin(ang) * (R - 16));
            ctx2.textAlign = "left";
            ctx2.restore();
        } else if (true) {
            const [sx2, sy2] = worldToScreen(universe.ship.pos.x, universe.ship.pos.y);
            // precision reference = only SCANNED notable bodies (user 2026-
            // 11-09): an unread body fixates nothing — near a scanned star/
            // planet/cargo the fix is exact, else dead reckoning.
            let nearest = universe.star.scanned ? universe.star.pos.distance(universe.ship.pos) : Infinity;
            for (const p of universe.planets) {
                if (!p.scanned && !p.explored) continue;
                const d = p.pos.distance(universe.ship.pos);
                if (d < nearest) nearest = d;
            }
            for (const c of universe.cargoShips) {
                if (!c.scanned) continue;
                const d = c.pos.distance(universe.ship.pos);
                if (d < nearest) nearest = d;
            }
            // FIX QUALITY (user 2026-11-09): precision depends on three
            // physical factors — distance to the nearest notable body
            // (reference), ship speed (dead reckoning drifts faster), and
            // staleness since the last scan. 5 steps green → yellow.
            const distScore = nearest < 25_000 ? 0 : nearest < 60_000 ? 1 : nearest < 110_000 ? 2 : 3;
            const spd = universe.ship.velocity.mag();
            const spdScore = spd < 2000 ? 0 : spd < 4500 ? 1 : 2;
            const staleScore = Number.isNaN(lastScanAge) ? 2 : lastScanAge < 20 ? 0 : lastScanAge < 60 ? 1 : 2;
            const score = distScore + spdScore + staleScore;
            const step = Math.min(4, Math.floor(score / 1.5));
            const stepColors = ["#67E291", "#7BD96F", "#A8D45E", "#D8C453", "#E8B83C"];
            const stepHalf = [0, 24, 30, 38, 48]; // quad half-size per step; 0 = precise, no quad
            ctx2.strokeStyle = stepColors[step];
            ctx2.fillStyle = stepColors[step];
            if (step === 0) {
                // precise: green arrow alone, no quad
                ctx2.save();
                ctx2.translate(sx2, sy2);
                ctx2.rotate(universe.ship.angle);
                ctx2.beginPath();
                ctx2.moveTo(16, 0);
                ctx2.lineTo(-10, 9);
                ctx2.lineTo(-10, -9);
                ctx2.closePath();
                ctx2.fill();
                ctx2.restore();
            } else {
                // approximate: big centered arrow inside a pretty bracket
                // frame (not a plain square): faint inner rect + 4 thick
                // corner brackets + center crosshair ticks.
                const [jx, jy] = jitterShip(424242);
                const cx = sx2 + jx * 12;
                const cy = sy2 + jy * 12;
                const half = stepHalf[step];
                const col = stepColors[step];
                ctx2.save();
                ctx2.translate(cx, cy);
                ctx2.rotate(universe.ship.angle);
                // faint full frame
                ctx2.strokeStyle = col;
                ctx2.globalAlpha = 0.25;
                ctx2.lineWidth = 1;
                ctx2.strokeRect(-half, -half, half * 2, half * 2);
                ctx2.globalAlpha = 1;
                // corner brackets
                const arm = 10;
                ctx2.lineWidth = 2.4;
                ctx2.lineCap = "square";
                for (const [bx, by] of [[-half, -half], [half, -half], [-half, half], [half, half]] as Array<[number, number]>) {
                    const sx = Math.sign(bx);
                    const sy = Math.sign(by);
                    ctx2.beginPath();
                    ctx2.moveTo(bx - sx * arm, by);
                    ctx2.lineTo(bx, by);
                    ctx2.lineTo(bx, by - sy * arm);
                    ctx2.stroke();
                }
                // center crosshair ticks (tiny, pretty)
                ctx2.lineWidth = 1.2;
                ctx2.beginPath();
                ctx2.moveTo(-4, 0);
                ctx2.lineTo(-2.5, 0);
                ctx2.moveTo(2.5, 0);
                ctx2.lineTo(4, 0);
                ctx2.moveTo(0, -4);
                ctx2.lineTo(0, -2.5);
                ctx2.moveTo(0, 2.5);
                ctx2.lineTo(0, 4);
                ctx2.stroke();
                // heading arrow centered, pointing along +x
                ctx2.fillStyle = col;
                ctx2.beginPath();
                ctx2.moveTo(13, 0);
                ctx2.lineTo(-10, 7);
                ctx2.lineTo(-10, -7);
                ctx2.closePath();
                ctx2.fill();
                ctx2.restore();
            }
        }
        ctx2.restore();
    }
    /** Radar pan/zoom is world-anchored: base scale from the system span. */
    let radarZoom = 1;
    let radarBucketBump = 0;
    let radarPanX = 0;
    let radarPanY = 0;
    function radarBaseScale(): number {
        const star = universe.star;
        const maxOrbit = Math.max(
            ...universe.planets.map(p => p.pos.distance(star.pos)),
            UniverseConst.PLANET_ORBIT_RANGE_MIN * 1.2,
        );
        return ((radarCanvas?.width ?? 560) * 0.44) / maxOrbit;
    }

    // ===== Route autopilot (user 2026-11-09 v2) =====
    // Multi-waypoint route ("маршрут из узлов") built on the radar map:
    // ADD NODE → click anywhere → node; DELETE LAST; CLEAR ALL; GO.
    // The pilot flies through nodes WITHOUT stopping (pure pursuit with
    // turn anticipation — inertia drifts the pass slightly off-node, by
    // design), and at the FINAL node brakes to a full stop. Boost engages
    // only when the player could cast it manually (speed ≥ cruise cap).
    // Threats anywhere on the course stop the pilot and turn the line red.
    const routePilot = createRoutePilot();
    const routeNodeList: Array<{ x: number; y: number; radius: number; bodyId: number | null }> = [];
    let routeIdx = 0;
    let playerTookControl = false;
    let arrivedClock = 0;
    let radarPickMode = false;
    let radarDeleteMode = false;

    function nodeIsFinal(idx: number): boolean { return idx >= routeNodeList.length - 1; }
    /** Move a body-bound node with its planet (nodes track orbits). */
    function syncNodePositions() {
        for (const n of routeNodeList) {
            if (n.bodyId === null) continue;
            const p = universe.planets.find(pl => pl.id === n.bodyId);
            if (p) { n.x = p.pos.x; n.y = p.pos.y; n.radius = p.radius; continue; }
            // cargo ships are legal nodes too (user 2026-11-09): the pilot
            // PURSUES their moving position until close.
            const c = universe.cargoShips.find(cf => cf.id === n.bodyId);
            if (c) { n.x = c.pos.x; n.y = c.pos.y; n.radius = 600; continue; }
            const r = universe.asteroids.find(cf => cf.id === n.bodyId);
            if (r) { n.x = r.pos.x; n.y = r.pos.y; n.radius = r.surfaceDistance(0); }
        }
    }
    function pushNodesToUniverse() {
        universe.routeNodes = routeNodeList.map(n => ({ x: n.x, y: n.y, radius: n.radius, bodyId: n.bodyId }));
        universe.routeNodeIdx = routeIdx;
    }
    function addRouteNode(x: number, y: number, bodyId: number | null): boolean {
        if (routeNodeList.length >= 12) return false;
        // keep nodes inside the system ringfence
        const R = UniverseConst.UNIVERSE_RANGE;
        const cx = clamp(x, -R, R);
        const cy = clamp(y, -R, R);
        routeNodeList.push({ x: cx, y: cy, radius: bodyRadiusOf(bodyId), bodyId });
        // radar recompute (user 2026-11-09): placing a point refreshes the
        // system picture up to this moment — body-bound nodes snap to the
        // planets' CURRENT positions and the contact sweep re-rolls.
        syncNodePositions();
        radarBucketBump++;
        pushNodesToUniverse();
        return true;
    }
    function bodyRadiusOf(id: number | null): number {
        if (id === null) return 0; // free node: no surface radius
        const p = universe.planets.find(pl => pl.id === id);
        if (p) return p.radius;
        const c = universe.cargoShips.find(cf => cf.id === id);
        if (c) return 600;
        const r = universe.asteroids.find(cf => cf.id === id);
        return r ? r.surfaceDistance(0) : 0;
    }
    function deleteLastRouteNode(): boolean {
        if (routeNodeList.length === 0) return false;
        routeNodeList.pop();
        if (routeIdx >= routeNodeList.length) routeIdx = Math.max(0, routeNodeList.length - 1);
        pushNodesToUniverse();
        return true;
    }
    /**
     * Click-to-delete (user 2026-11-09 v3): remove the route node under the
     * radar click (mx/my = canvas px from center). The neighbors chain
     * directly (1-2-3, delete 2 → 1-3). Returns the removed index or null.
     */
    function deleteNodeAt(mx: number, my: number): number | null {
        if (!radarCanvas || routeNodeList.length === 0) return null;
        const scale = radarBaseScale() * radarZoom;
        const star = universe.star;
        const worldX = star.pos.x + radarPanX + mx / scale;
        const worldY = star.pos.y + radarPanY + my / scale;
        let bestIdx = -1;
        let bestPx = Infinity;
        for (let i = 0; i < routeNodeList.length; i++) {
            const n = routeNodeList[i];
            const dPx = Math.hypot(n.x - worldX, n.y - worldY) * scale;
            const tolPx = Math.max(16, n.radius * scale * 1.2);
            if (dPx <= tolPx && dPx < bestPx) { bestPx = dPx; bestIdx = i; }
        }
        if (bestIdx < 0) return null;
        routeNodeList.splice(bestIdx, 1);
        if (routeIdx > bestIdx) routeIdx -= 1;
        if (routeIdx >= routeNodeList.length) routeIdx = Math.max(0, routeNodeList.length - 1);
        radarBucketBump++;
        pushNodesToUniverse();
        return bestIdx;
    }
    function clearRouteNodes() {
        routeNodeList.length = 0;
        routeIdx = 0;
        pushNodesToUniverse();
    }
    function setRouteTargetById(id: number | null) {
        // legacy/debug API: single-node route to a planet
        clearRouteNodes();
        if (id === null) { routePilot.active = false; pushNodesToUniverse(); return false; }
        const p = universe.planets.find(pl => pl.id === id);
        if (!p) { pushNodesToUniverse(); return false; }
        addRouteNode(p.pos.x, p.pos.y, p.id);
        return true;
    }
    function startRoute(): boolean {
        if (routeNodeList.length === 0) return false;
        playerTookControl = false;
        routeIdx = 0;
        routePilot.active = true;
        routePilot.phase = "chase";
        arrivedClock = 0;
        pushNodesToUniverse();
        return true;
    }
    function cancelRoute() {
        routePilot.active = false;
        routePilot.phase = "chase";
        setBoost(false);
        ship.thrust.x = 0;
        ship.thrust.y = 0;
        universe.routeNodeIdx = routeIdx;
        universe.routePhase = "off";
    }
    const PASS_NODE_DIST = 1400; // pass-through radius for intermediate nodes
    function pilotUpdate(dt: number) {
        if (routePilot.active === false) return;
        // ONE control line (user 2026-11-09): safety and auto-landing also
        // act through this single arbiter — safe > autoLand > route pilot,
        // so route and safety never fight over the nose/thrust.
        if (safeHold || autoLand) {
            ship.thrust.x = 0;
            ship.thrust.y = 0;
            return;
        }
        if (routeNodeList.length === 0) { cancelRoute(); return; }
        // player override during flight (not during the threat stop — there
        // the player steering back on course is the designed recovery)
        if (playerTookControl && routePilot.phase !== "stopped") {
            cancelRoute();
            return;
        }
        syncNodePositions();
        let cur = routeNodeList[routeIdx];
        void cur;
        // advance through intermediate nodes EARLY (pure pursuit): while the
        // next node is within the anticipation arc, aim at IT instead — the
        // ship flies through node lines, correcting by inertia (user 2026-
        // 11-09: he can be dragged off by inertia, so the pilot must correct)
        let aimIdx = routeIdx;
        const shipSpd = Math.hypot(ship.velocity.x, ship.velocity.y);
        const anticipate = clamp(shipSpd * 1.5, 2600, 22000);
        if (!nodeIsFinal(routeIdx)) {
            const curD = Math.hypot(cur.x - ship.pos.x, cur.y - ship.pos.y);
            if (curD < Math.max(PASS_NODE_DIST, anticipate)) {
                routeIdx += 1;
                if (routePilot.phase === "brake") routePilot.phase = "chase";
                cur = routeNodeList[routeIdx];
                pushNodesToUniverse();
            }
        }
        cur = routeNodeList[routeIdx];
        const intermediate = !nodeIsFinal(routeIdx);
        const threats: RouteThreat[] = [];
        for (const b of impactBodies()) {
            threats.push({ x: b.pos.x, y: b.pos.y, vx: b.velocity.x, vy: b.velocity.y, radius: b.radius });
        }
        const intent = pilotStep(
            routePilot,
            { x: cur.x, y: cur.y, radius: cur.radius },
            threats,
            { x: ship.pos.x, y: ship.pos.y, vx: ship.velocity.x, vy: ship.velocity.y, angle: ship.angle },
            dt,
            ship.profile.engineAccel,
            { intermediate },
        );
        // steering (pilot owns the nose in chase/brake; player steers in stop)
        // CHASE: face the target; BRAKE: face retrograde (the engine pushes
        // only along the nose — braking is a nose-flip, not a vector burn).
        if (routePilot.phase !== "stopped") {
            const bearing = Math.atan2(cur.y - ship.pos.y, cur.x - ship.pos.x);
            const pilotBearing = routePilot.phase === "brake" ? bearing + Math.PI : bearing;
            let err = pilotBearing - ship.angle;
            while (err > PI) err -= PI * 2;
            while (err < -PI) err += PI * 2;
            const maxTurn = KEYBOARD_TURN_RATE * dt;
            ship.angle += clamp(err, -maxTurn, maxTurn);
            (ship as unknown as { steerMotor?: number }).steerMotor = maxTurn > 0 ? clamp(err / maxTurn, -1, 1) : 0;
        }
        ship.thrust.x = intent.thrustX;
        ship.thrust.y = intent.thrustY;
        // boost (user 2026-11-09): the autopilot never fires the burner
        // itself; a MANUALLY engaged boost from the player stays on.
        universe.routeNodeIdx = routeIdx;
        universe.routePhase = routePilot.phase;
        if (routePilot.phase === "arrived") {
            // FINAL by object type (user 2026-11-09): the autopilot ALWAYS
            // finishes its work at the last node — the ending depends on the
            // object:  PLANET → slide into its ORBIT & hand over;  ASTEROID
            // → FOLLOW it (match its motion);  FREE POINT → plain full stop.
            const n = routeNodeList[routeIdx];
            const body = findArrivalBody(n?.bodyId ?? null);
            if (body && body.kind === "planet") {
                // orbit hold: match the planet's velocity, nose tangentially
                const rvx = ship.velocity.x - body.vx;
                const rvy = ship.velocity.y - body.vy;
                const rm = Math.hypot(rvx, rvy);
                if (rm > 120) {
                    ship.angle = Math.atan2(-rvy, -rvx);
                    ship.thrust.x = Math.cos(ship.angle);
                    ship.thrust.y = Math.sin(ship.angle);
                } else {
                    ship.thrust.x = 0;
                    ship.thrust.y = 0;
                    arrivedClock += dt;
                    if (arrivedClock > 2) { safeShowToast("ORBIT HOLD"); cancelRoute(); }
                }
            } else if (body && (body.kind === "asteroid" || body.kind === "cargo")) {
                // escort: stay on the rock/cargo, matching its motion
                const rvx = ship.velocity.x - body.vx;
                const rvy = ship.velocity.y - body.vy;
                const rm = Math.hypot(rvx, rvy);
                if (rm > 90) {
                    ship.angle = Math.atan2(-rvy, -rvx);
                    ship.thrust.x = Math.cos(ship.angle);
                    ship.thrust.y = Math.sin(ship.angle);
                } else {
                    ship.thrust.x = 0;
                    ship.thrust.y = 0;
                    // still escort while the route is up
                }
            } else {
                arrivedClock += dt;
                if (arrivedClock > 2) { cancelRoute(); }
            }
        } else arrivedClock = 0;
    }
    /** Body lookup for arrival finishers (planet/cargo/asteroid/star). */
    function findArrivalBody(id: number | null): { x: number; y: number; vx: number; vy: number; kind: string } | null {
        if (id === null) return null;
        const p = universe.planets.find(pl => pl.id === id);
        if (p) return { x: p.pos.x, y: p.pos.y, vx: p.velocity.x, vy: p.velocity.y, kind: "planet" };
        const c = universe.cargoShips.find(cf => cf.id === id);
        if (c) return { x: c.pos.x, y: c.pos.y, vx: c.velocity.x, vy: c.velocity.y, kind: "cargo" };
        const r = universe.asteroids.find(cf => cf.id === id);
        if (r) return { x: r.pos.x, y: r.pos.y, vx: r.velocity.x, vy: r.velocity.y, kind: "asteroid" };
        if (universe.star.id === id) return { x: universe.star.pos.x, y: universe.star.pos.y, vx: 0, vy: 0, kind: "star" };
        if (id === BLACK_HOLE.id) return { x: BLACK_HOLE.x, y: BLACK_HOLE.y, vx: 0, vy: 0, kind: "blackHole" };
        return null;
    }

    /**
     * Radar click routing (user 2026-11-09): in PICK mode a click adds a
     * route node (snapping to a planet glyph when close, free point
     * otherwise); in VIEW mode a click selects a scanned object and
     * returns its info-card data (unknown objects = "NO DATA").
     * mx/my: canvas px relative to canvas CENTER (same basis as hitTest).
     */
    /** Planet/cargo-ship under a radar point (canvas-local offsets from CENTER); 22 px. */
    function radarHitTestAt(mx: number, my: number): number | null {
        if (!radarCanvas) return null;
        const star = universe.star;
        const scale = radarBaseScale() * radarZoom;
        let best: { id: number; d: number } | null = null;
        for (const p of universe.planets) {
            const px = (p.pos.x - star.pos.x - radarPanX) * scale;
            const py = (p.pos.y - star.pos.y - radarPanY) * scale;
            const d = Math.hypot(px - mx, py - my);
            if (d < 22 && (best === null || d < best.d)) best = { id: p.id, d };
        }
        // cargo ships are legal route nodes too (pursuit target)
        for (const c of universe.cargoShips) {
            const px = (c.pos.x - star.pos.x - radarPanX) * scale;
            const py = (c.pos.y - star.pos.y - radarPanY) * scale;
            const d = Math.hypot(px - mx, py - my);
            if (d < 22 && (best === null || d < best.d)) best = { id: c.id, d };
        }
        // asteroids also attract the node when the finger lands close —
        // magnetism wins over a random point (user 2026-11-09)
        for (const a of universe.asteroids) {
            const px = (a.pos.x - star.pos.x - radarPanX) * scale;
            const py = (a.pos.y - star.pos.y - radarPanY) * scale;
            const d = Math.hypot(px - mx, py - my);
            if (d < 24 && (best === null || d < best.d)) best = { id: a.id, d };
        }
        // black-hole landmark (R-006): tappable route target
        {
            const px = (BLACK_HOLE.x - star.pos.x - radarPanX) * scale;
            const py = (BLACK_HOLE.y - star.pos.y - radarPanY) * scale;
            const d = Math.hypot(px - mx, py - my);
            if (d < 28 && (best === null || d < best.d)) best = { id: BLACK_HOLE.id, d };
        }
        return best === null ? null : best.id;
    }
    function radarClick(mx: number, my: number): unknown {
        if (!radarCanvas) return null;
        const scale = radarBaseScale() * radarZoom;
        const star = universe.star;
        const worldX = star.pos.x + radarPanX + mx / scale;
        const worldY = star.pos.y + radarPanY + my / scale;
        if (radarPickMode) {
            // snap to a planet glyph OR a cargo-ship diamond OR asteroid
            // rock when the finger lands close — then the node TRACKS the
            // object (planet orbiting, cargo flying, rock drifting).
            const hitId = radarHitTestAt(mx, my);
            if (hitId !== null) {
                const p = universe.planets.find(pl => pl.id === hitId);
                if (p) { addRouteNode(p.pos.x, p.pos.y, p.id); return { added: true, id: hitId }; }
                const c = universe.cargoShips.find(cf => cf.id === hitId);
                if (c) { addRouteNode(c.pos.x, c.pos.y, c.id); return { added: true, id: hitId }; }
                const a = universe.asteroids.find(cf => cf.id === hitId);
                if (a) { addRouteNode(a.pos.x, a.pos.y, a.id); return { added: true, id: hitId }; }
                if (hitId === BLACK_HOLE.id) { addRouteNode(BLACK_HOLE.x, BLACK_HOLE.y, BLACK_HOLE.id); return { added: true, id: hitId }; }
            }
            addRouteNode(worldX, worldY, null);
            return { added: true, id: null };
        }
        // view mode: object under the cursor → info card (map px tolerances)
        const tolPx = 20;
        let info: { name: string; type: string; rows: Array<[string, string]> } | null = null;
        // star screen position (world→screen anchors the same as drawRadar)
        const starSx = -radarPanX * scale;
        const starSy = -radarPanY * scale;
        if (Math.hypot(mx - starSx, my - starSy) < Math.max(10, star.radius * scale)) {
            info = star.scanned ? {
                name: star.name, type: "STAR · CLASS " + star.cls,
                rows: [
                    ["RADIUS", (star.radius / 1000).toFixed(1) + " km"],
                    ["TEMPERATURE", "—"],   // placeholder (later scan tiers)
                    ["DANGER", "HIGH"],
                    ["FLORA", "NONE"],
                    ["FAUNA", "NONE"],
                ],
            } : { name: "?", type: "STAR — UNSCANNED", rows: [["DATA", "SCAN THE STAR FIRST"]] };
        }
        if (info === null) {
            const pid = radarHitTestAt(mx, my);
            if (pid !== null) {
                const p = universe.planets.find(pl => pl.id === pid);
                if (p) {
                    info = (p.scanned || p.explored) ? {
                        name: p.name,
                        type: "PLANET",
                        rows: [
                            ["RADIUS", (p.radius / 1000).toFixed(2) + " km"],
                            ["ATMOSPHERE", p.atmosphere || "—"],
                            ["TEMPERATURE", "—"], // placeholder (scan tiers later)
                            ["DANGER", "—"],
                            ["FLORA", p.flora || "NONE"],
                            ["FAUNA", p.fauna || "NONE"],
                        ],
                    } : { name: "UNKNOWN BODY", type: "UNSCANNED", rows: [["DATA", "SCAN THE AREA FIRST"]] };
                } else if (pid === BLACK_HOLE.id) {
                    info = {
                        name: "BLACK HOLE", type: "COMPACT OBJECT",
                        rows: [
                            ["SHADOW RADIUS", (BLACK_HOLE.r / 1000).toFixed(1) + " km"],
                            ["DANGER", "EXTREME"],
                            ["NOTE", "SCREEN-SPACE LENSING APPROX"],
                        ],
                    };
                }
            }
        }
        if (info === null) {
            // scanned asteroids / cargo within 10 px
            const tol = tolPx / scale;
            let best: { type: string; name: string; rows: Array<[string, string]> } | null = null;
            let bestD = tol;
            for (const a of universe.asteroids) {
                if (!a.scanned) continue;
                const d = Math.hypot(a.pos.x - worldX, a.pos.y - worldY);
                if (d < bestD) { bestD = d; best = {
                    name: "ROCK " + a.id, type: "ASTEROID",
                    rows: [
                        ["DIAMETER", (a.radius * 2 / 1000).toFixed(2) + " km"],
                        ["MASS", a.mass.toExponential(1) + " t"],
                        ["TEMPERATURE", "—"],
                        ["DANGER", "—"],
                    ],
                }; }
            }
            for (const cg of universe.cargoShips) {
                if (!cg.scanned) continue;
                const d = Math.hypot(cg.pos.x - worldX, cg.pos.y - worldY);
                if (d < bestD) { bestD = d; best = {
                    name: "HAULER " + cg.id, type: "CARGO SHIP",
                    rows: [
                        ["SIGNATURE", cg.hue === "#D8A84E" ? "AMBER" : "BLUE"],
                        ["CRUISE", Math.round(cg.cruise) + " m/s"],
                        ["DANGER", "NONE"],
                    ],
                }; }
            }
            info = best;
        }
        return info;
    }

    // Collision warning (user 2026-11-08): Elite-style impact alert. Every
    // ~100 ms we solve the closed-form closest-approach against every body;
    // a warning requires BOTH the ship's nose and its trajectory (relative
    // velocity) to aim at the threat, plus real closing speed — landing
    // (nose down, near-zero closing) never triggers it. The countdown is
    // shown in seconds; the threatened body gets a pulsing impact ring
    // (drawImpactThreat in the render layer).
    const impactHud = document.getElementById("impactWarning");
    const impactHudTime = document.getElementById("impactWarningTime");
    let impactEvalIn = 0; // seconds until the next evaluation (~10 Hz budget)
    let lastFrameMillisImpact = -1;
    /**
     * Latched threat (user 2026-11-09): once the gated alert fires, the
     * warning stays alive while the PHYSICS still predicts the impact —
     * turning the nose away must not hide a collision the ship is still
     * flying into. It releases only when TTI/closing say the impact is
     * gone (miss, separating, out of the clear window, or braked below
     * the impact floor).
     */
    let impactLatched: { pos: Vec2, velocity: Vec2, radius: number } | null = null;
    function updateImpactWarning(millis: number) {
        if (lastFrameMillisImpact >= 0) impactEvalIn -= (millis - lastFrameMillisImpact) / 1000;
        lastFrameMillisImpact = millis;
        if (impactEvalIn > 0) return;
        impactEvalIn = 0.1;

        // single pass over all bodies, keep the most urgent gated threat
        let bestBody: { pos: Vec2, velocity: Vec2, radius: number } | null = null;
        let bestTti = Infinity;
        let bestLevel: "warning" | "critical" = "warning";
        for (const b of impactBodies()) {
            const rx = b.pos.x - ship.pos.x;
            const ry = b.pos.y - ship.pos.y;
            // broad-phase: nothing beyond maxRelativeSpeed × warn-window can
            // be a threat (6000 + 6000 + asteroid margin ≈ 15 000 m/s)
            if (Math.hypot(rx, ry) > b.radius + 15_000 * IMPACT_CLEAR_SECONDS) continue;
            const ux = b.velocity.x - ship.velocity.x;
            const uy = b.velocity.y - ship.velocity.y;
            const res = timeToImpact(rx, ry, ux, uy, b.radius + ship.radius);
            if (res.tti === null || res.tti > IMPACT_CLEAR_SECONDS) continue;
            const bearing = Math.atan2(ry, rx);
            if (!impactGatesPass({
                shipAngle: ship.angle,
                bearing,
                relCourse: Math.atan2(-uy, -ux), // ship's course relative to the body
                closing: res.closing,
            })) continue;
            if (res.tti < bestTti) {
                bestTti = res.tti;
                bestBody = b;
                bestLevel = res.tti <= IMPACT_CRITICAL_SECONDS ? "critical" : "warning";
            }
        }

        if (bestBody !== null) {
            // new gated threat: latch it and light the HUD
            impactLatched = bestBody;
            universe.impactThreat = {
                x: bestBody.pos.x, y: bestBody.pos.y,
                radius: bestBody.radius,
                tti: bestTti, level: bestLevel,
            };
            if (impactHud && impactHudTime) {
                impactHudTime.textContent = "T−" + bestTti.toFixed(1) + "s";
                impactHud.classList.toggle("critical", bestLevel === "critical");
                if (!impactHud.classList.contains("active")) impactHud.classList.add("active");
            }
            return;
        }
        // No NEW gated threat — but a LATCHED one may still be physics-true
        // (player turned the nose away; the ship is still flying into it).
        if (impactLatched !== null) {
            const b = impactLatched;
            const rx = b.pos.x - ship.pos.x;
            const ry = b.pos.y - ship.pos.y;
            const ux = b.velocity.x - ship.velocity.x;
            const uy = b.velocity.y - ship.velocity.y;
            const res = timeToImpact(rx, ry, ux, uy, b.radius + ship.radius);
            if (impactLatchedThreat(res.tti, res.closing)) {
                const tti = res.tti as number; // narrowing: non-null here
                const level: "warning" | "critical" = tti <= IMPACT_CRITICAL_SECONDS ? "critical" : "warning";
                universe.impactThreat = {
                    x: b.pos.x, y: b.pos.y,
                    radius: b.radius,
                    tti, level,
                };
                if (impactHud && impactHudTime) {
                    impactHudTime.textContent = "T−" + tti.toFixed(1) + "s";
                    impactHud.classList.toggle("critical", level === "critical");
                    if (!impactHud.classList.contains("active")) impactHud.classList.add("active");
                }
                return;
            }
            impactLatched = null; // physics says the impact is gone
        }
        universe.impactThreat = null;
        if (impactHud && impactHud.classList.contains("active")) impactHud.classList.remove("active");
    }

    /** Broad candidates: star + planets + asteroids (one array, reused). */
    const impactBodyScratch: Array<{ pos: Vec2, velocity: Vec2, radius: number }> = [];
    function impactBodies(): Array<{ pos: Vec2, velocity: Vec2, radius: number }> {
        impactBodyScratch.length = 0;
        impactBodyScratch.push(universe.star);
        for (const p of universe.planets) impactBodyScratch.push(p);
        for (const a of universe.asteroids) impactBodyScratch.push(a);
        return impactBodyScratch;
    }

    // Heat warning HUD (user 2026-11-09): one-shot approach warning, then a
    // live countdown while inside the hot zone. Both only at the TOP.
    const heatBanner = document.getElementById("heatBanner");
    const heatBannerText = document.getElementById("heatBannerText");
    const heatBannerTime = document.getElementById("heatBannerTime");
    const heatEdge = document.getElementById("heatEdge");
    function updateHeatHud() {
        if (!heatBanner || !heatBannerText) return;
        const cd = universe.starCountdown;
        const prox = universe.starProximity;
        // burn glow strength: ramps with proximity, full while counting down
        if (heatEdge) {
            const burn = cd !== null ? 0.95 : prox >= 0.25 ? 0.25 + prox * 0.55 : 0;
            heatEdge.style.opacity = burn.toFixed(2);
            heatEdge.classList.toggle("active", burn > 0.02);
        }
        if (cd !== null) {
            if (!heatBanner.classList.contains("active")) heatBanner.classList.add("active");
            if (!heatBanner.classList.contains("critical")) heatBanner.classList.add("critical");
            heatBannerText.textContent = "TEMPERATURE CRITICAL — LEAVE THE ZONE";
            if (heatBannerTime) heatBannerTime.textContent = "T−" + Math.max(0, cd).toFixed(1) + "s";
        } else if (prox >= 0.25) {
            if (!heatBanner.classList.contains("active")) heatBanner.classList.add("active");
            heatBanner.classList.remove("critical");
            heatBannerText.textContent = "TEMPERATURE RISING NEAR CRITICAL";
            if (heatBannerTime) heatBannerTime.textContent = "";
        } else {
            heatBanner.classList.remove("active", "critical");
        }
    }

    // ===== Safety system (user 2026-11-09): always-on collision guard =====
    // Warns first (the 6s countdown); at the LAST moment (~1.5-2s) if the
    // smart estimate says we would still be hit, it seizes control (the
    // joystick stops responding), evades or brakes to ≤500 m/s, and hands
    // control back once the threat clears. Tapping the shield mid-takeover
    // aborts the takeover instantly (control back, red gone).
    let safeHold = false;
    let safeMode: "brake" | "evade" = "brake";
    const safeButton = document.getElementById("safeButton") as HTMLButtonElement | null;
    const safeEdge = document.getElementById("safeEdge");
    const safeToast = document.getElementById("safeToast");
    let safeToastTimer: number | null = null;
    function safeShowToast(txt: string) {
        if (!safeToast) return;
        safeToast.textContent = txt;
        safeToast.classList.add("active");
        if (safeToastTimer !== null) window.clearTimeout(safeToastTimer);
        safeToastTimer = window.setTimeout(() => safeToast.classList.remove("active"), 2400);
    }
    function setSafeHold(on: boolean) {
        safeHold = on;
        safeButton?.classList.toggle("hold", on);
        safeEdge?.classList.toggle("active", on);
        if (!on) {
            ship.thrustMultiplier = 1; // restore the normal engine
            playerTookControl = false;
            if (universe.impactThreat === null || ship.velocity.mag() <= 520) safeShowToast("CONTROL RETURNED");
        }
    }
    function safeEngageCheck() {
        if (safeHold) return;
        // Auto-land IS an intentional contact: safety must not fight it.
        if (autoLand) return;
        const u = universe as unknown as { safetyEnabled?: boolean };
        if (u.safetyEnabled === false) return;
        const t = universe.impactThreat;
        if (t === null) return;
        const spd0 = ship.velocity.mag();
        if (spd0 < 300) return; // gentle landing approach — let her land
        // SMART LAST MOMENT (user 2026-11-09 fixed after the star kill): a
        // fixed 2s threshold is too late when braking physically cannot stop
        // us in time. Engage when (a) we are literally out of time (tti ≤ 2s)
        // OR (b) braking is ALREADY insufficient — must act NOW (evasion).
        const dv = Math.max(0, spd0 - 500);
        const brakeDist = (dv * dv) / (2 * Math.max(1, ship.profile.engineAccel));
        // Full brake start ≈ braking time to 500 + nose swing dwell. The
        // LATEST survivable moment: engage then; before that the player
        // keeps the warning for themselves (last seconds, like promised).
        const impactDist = t.tti * spd0;
        const dwell = 900; // nose swing eats ~0.5-1s of margin
        const brakingSaves = brakeDist + dwell <= impactDist * 0.85;
        if (t.tti > 5.0 && brakingSaves) return;
        const mode: "brake" | "evade" = brakingSaves ? "brake" : "evade";
        safeMode = mode;
        setSafeHold(true);
        routePilot.active = false; // safety outranks the route pilot
        setBoost(false);
    }
    function safeHoldUpdate(dt: number) {
        if (!safeHold) return;
        const t = universe.impactThreat;
        const spd = ship.velocity.mag();
        // release: threat physics-gone (latch cleared) or down to safe speed
        if (t === null || spd <= 500) {
            setSafeHold(false);
            ship.thrust.x = 0;
            ship.thrust.y = 0;
            return;
        }
        // The engine pushes ONLY along the nose (ship.angle): so the takeover
        // reORIENTS the ship to the dodge direction and burns forward.
        // brake → face retrograde and burn; evade → face the perpendicular
        // dodge vector (re-aimed every frame, side chosen toward the nose).
        let want: number;
        if (safeMode === "brake") {
            want = Math.atan2(ship.velocity.y, ship.velocity.x) + Math.PI;
        } else {
            const bx = t.x - ship.pos.x;
            const by = t.y - ship.pos.y;
            const bl = Math.hypot(bx, by) || 1;
            const px = -by / bl;
            const py = bx / bl;
            const side = px * Math.cos(ship.angle) + py * Math.sin(ship.angle) >= 0 ? 1 : -1;
            want = Math.atan2(py * side, px * side);
        }
        let err = want - ship.angle;
        while (err > PI) err -= PI * 2;
        while (err < -PI) err += PI * 2;
        const maxTurn = 3.2 * dt; // emergency yaw is quick
        ship.angle += clamp(err, -maxTurn, maxTurn);
        // THE BIGGEST SURVIVAL LEVER (user 2026-11-09 RAM-proof): during
        // the takeover the brake uses a doubled engine (boost-grade) — the
        // same burn the player gets from the burner, no speed cap fare.
        ship.thrustMultiplier = 2;
        (ship as unknown as { steerMotor?: number }).steerMotor = maxTurn > 0 ? clamp(err / maxTurn, -1, 1) : 0;
        // until the nose is aligned, thrust is ZERO (burning forward into the
        // threat while swinging around used to eat the whole margin).
        if (Math.abs(err) > 0.5) {
            ship.thrust.x = 0;
            ship.thrust.y = 0;
        } else {
            ship.thrust.x = Math.cos(ship.angle);
            ship.thrust.y = Math.sin(ship.angle);
        }
        playerTookControl = false;
    }
    // (thrustMultiplier is reset inside setSafeHold on release)
    // ===== Landing assist (user 2026-11-09): the landing button works like
    // the scanner's gate — near a planet at low speed (<1000 m/s) it is
    // armed; a tap runs a smooth AUTOMATIC touchdown (brake, approach,
    // descend) and takes over like the safety shield.
    const landButton = document.getElementById("landButton") as HTMLButtonElement | null;
    let autoLand = false;
    let autoLandBody: Planet | null = null;
    function nearestLandable(): Planet | null {
        let best: Planet | null = null;
        let bestD = Infinity;
        const consider = (p: Planet) => {
            const d = p.pos.distance(ship.pos) - ship.radius - p.radius;
            if (d < bestD && d < 9000) { bestD = d; best = p; }
        };
        for (const p of universe.planets) consider(p);
        const star = universe.star;
        const ds = star.pos.distance(ship.pos) - ship.radius - star.radius;
        // star is NOT landable (kill zone) — skip it on purpose
        return best;
    }
    function landButtonGate() {
        if (!landButton) return;
        const b = nearestLandable();
        const ok = b !== null && ship.velocity.mag() < 1000;
        landButton.disabled = !ok && !autoLand;
        landButton.classList.toggle("armed", ok);
    }
    function startAutoLand() {
        const b = nearestLandable();
        if (!b) return;
        autoLand = true;
        autoLandBody = b;
        routePilot.active = false; // landing outranks the route
    }
    function autoLandUpdate(dt: number) {
        if (!autoLand) return;
        if (ship.landing !== null) {
            autoLand = false;
            autoLandBody = null;
            safeShowToast("LANDED");
            return;
        }
        const b = autoLandBody;
        if (!b) { autoLand = false; return; }
        const dx = b.pos.x - ship.pos.x;
        const dy = b.pos.y - ship.pos.y;
        const dist = Math.hypot(dx, dy);
        const surface = b.radius + ship.radius;
        const spd = ship.velocity.mag();
        const n = { x: dx / dist, y: dy / dist };
        // brake first if too fast, else steer at the surface point and gloss
        const approachSpeed = dist - surface < 2500 ? 220 : 260 + Math.min(420, (dist - surface) * 0.08);
        let want: number;
        const vx = ship.velocity.x, vy = ship.velocity.y;
        const closing = vx * n.x + vy * n.y;
        const vv = Math.hypot(vx, vy);
        const relVx = vx - b.velocity.x, relVy = vy - b.velocity.y;
        const rel = Math.hypot(relVx, relVy);
        if (rel > approachSpeed + 60) {
            want = Math.atan2(relVy, relVx) + Math.PI; // retro burn
        } else {
            want = Math.atan2(dy, dx);
        }
        let err = want - ship.angle;
        while (err > PI) err -= PI * 2;
        while (err < -PI) err += PI * 2;
        const maxTurn = 2.8 * dt;
        ship.angle += clamp(err, -maxTurn, maxTurn);
        (ship as unknown as { steerMotor?: number }).steerMotor = maxTurn > 0 ? clamp(err / maxTurn, -1, 1) : 0;
        const thrustOn = rel > approachSpeed * 0.55 || dist - surface > 150;
        if (thrustOn) {
            ship.thrust.x = Math.cos(ship.angle);
            ship.thrust.y = Math.sin(ship.angle);
        } else {
            ship.thrust.x = 0;
            ship.thrust.y = 0;
        }
        playerTookControl = false;
    }
    // Abort the takeover from the button (tapped in main.ts).
    function releaseHold() {
        if (!safeHold) return;
        safeHold = false;
        safeButton?.classList.remove("hold");
        safeEdge?.classList.remove("active");
        playerTookControl = false;
        safeShowToast("CONTROL RETURNED");
    }
    function setSafetyEnabled(on: boolean) {
        (universe as unknown as { safetyEnabled?: boolean }).safetyEnabled = on;
        safeButton?.classList.toggle("engaged", on);
        safeButton?.classList.toggle("hold", safeHold);
        try { localStorage.setItem("safetyEnabled", on ? "1" : "0"); } catch { /* private mode */ }
    }

    // ===== Soft border / void (user 2026-11-09) =====
    // No hard wall: past ~170 km edges darken + burgundy pulses strengthen,
    // the warning shows; at the edge the ship is quietly woven back (no
    // black fade); past ~190 km we are in the VOID: black pulsing edges, a
    // short message, radar shows only the border line toward the system.
    let voidActive = false;
    const voidBanner = document.getElementById("voidBanner");
    const voidBannerNear = document.getElementById("voidBannerNear");
    const voidEdge = document.getElementById("voidEdge");
    function updateVoidBorder() {
        const d = ship.pos.mag();
        const R = UniverseConst.UNIVERSE_RANGE;
        // near-edge gradient of dread (0 at 150 km, 1 at the edge)
        const near = clamp((d - 150_000) / 50_000, 0, 1);
        if (d > 190_000 && !voidActive) voidActive = true;
        // leaving the void: turned back toward the system on the BIG cone
        // (±86°), fading the caption out smoothly as you swing onto course
        if (voidActive && d < 170_000) voidActive = false;
        let voidFade = 1;
        if (voidActive) {
            const toStar = Math.atan2(-ship.pos.y, -ship.pos.x);
            let err = Math.abs(((ship.angle - toStar + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
            voidFade = clamp((err - 0.6) / 0.9, 0, 1); // 0 when aimed home, 1 far off
            if (err < 1.5) voidActive = false;
        }
        // soft border (user 2026-11-09, no teleport, no wall): approaching
        // the ring we simply SLOW DOWN outward — you can skim the border
        // but never fly out through it. The pinch point bleeds radial speed.
        if (d > R - 20000 && ship.pos.mag() > 0) {
            const n = Vec2_makeWithAngleMag(Vec2.Zero(), ship.pos.angle(), 1);
            const radial = ship.velocity.x * n.x + ship.velocity.y * n.y;
            if (radial > 0) {
                const bleed = (d - (R - 20000)) / 20000; // 0..1 as we close
                const cut = 1 - Math.min(1, Math.max(0, bleed)) * 0.9;
                ship.velocity.x -= n.x * radial * (1 - cut);
                ship.velocity.y -= n.y * radial * (1 - cut);
            }
        }
        if (voidBanner) {
            voidBanner.classList.toggle("active", voidActive);
            voidBanner.style.opacity = voidActive ? (0.35 + 0.65 * voidFade).toFixed(2) : "";
        }
        if (voidBannerNear) {
            voidBannerNear.classList.toggle("near", !voidActive && near > 0.05);
        }
        if (voidEdge) {
            const edge = voidActive ? 0.95 : near * 0.55;
            voidEdge.style.opacity = edge.toFixed(2);
            voidEdge.classList.toggle("active", edge > 0.02);
        }
        universe.voidActive = voidActive;
    }

    // Debug/testing hook (debug-only, #debug=1): exposes entity layout so
    // QA routes can steer onto specific bodies (asteroids, planets) and
    // screenshot close-ups. Player builds never read it.
    function debugState() {
        return {
            ship: {
                x: ship.pos.x,
                y: ship.pos.y,
                vx: ship.velocity.x,
                vy: ship.velocity.y,
                angle: ship.angle,
                boost: ship.boost,
                thrustMag: ship.thrust.mag(),
                heat: ship.heat,
            },
            asteroids: universe.asteroids.map(a => ({
                id: a.id,
                x: a.pos.x,
                y: a.pos.y,
                vx: a.velocity.x,
                vy: a.velocity.y,
                angle: a.angle,
                radius: a.radius,
                seed: a.seed,
            })),
            planets: universe.planets.map(p => ({
                id: p.id,
                x: p.pos.x,
                y: p.pos.y,
                radius: p.radius,
                visualSeed: p.visualSeed,
            })),
            star: { x: universe.star.pos.x, y: universe.star.pos.y, radius: universe.star.radius },
            bh: { x: BLACK_HOLE.x, y: BLACK_HOLE.y, r: BLACK_HOLE.r },
            impact: universe.impactThreat ? { tti: universe.impactThreat.tti, level: universe.impactThreat.level } : null,
            liveSparks: universe.countLiveSparksPublic(),
            scan: { cooldown: universe.scan.cooldown, waveAge: universe.scan.waveAge },
            scannedCount: universe.planets.filter(p => p.scanned).length,
            scannedAsteroids: universe.asteroids.filter(a => a.scanned).length,
            starScanned: universe.star.scanned,
            starHeat: { proximity: universe.starProximity, countdown: universe.starCountdown, hot: universe.starHot },
            cargoCount: universe.cargoShips.length,
            scannedCargo: universe.cargoShips.filter(c => c.scanned).length,
            cargo: universe.cargoShips.map(c => ({ id: c.id, x: c.pos.x, y: c.pos.y, angle: c.angle, t: c.t, dir: c.dir })),
            route: {
                nodes: routeNodeList.map(n => ({ x: Math.round(n.x), y: Math.round(n.y), bodyId: n.bodyId })),
                idx: routeIdx,
                active: routePilot.active,
                phase: routePilot.phase,
            },
        };
    }

    // Debug teleport (#debug=1 only): QA routes place the ship against a
    // specific body (ram tests, landing shots). Syncs opos — position-based
    // dynamics derives velocity from (pos − opos)/dt.
    function teleport(x: number, y: number, angle?: number) {
        ship.pos.x = x;
        ship.pos.y = y;
        Vec2_copy(ship.opos, ship.pos);
        ship.velocity.x = 0;
        ship.velocity.y = 0;
        if (angle !== undefined) ship.angle = angle;
        ship.thrust.x = 0;
        ship.thrust.y = 0;
        ship.heat = 0;
    }

    return {
        pointerInput: flightStick.pointerInput,
        setAutopilot: setAutopilot,
        setBoost: setBoost,
        debugState: debugState,
        teleport: teleport,
        draw: (millis: number, context: CanvasRenderingContext2D, helper: CanvasHelper) => {
            applyKeyboardFlight(millis);
            safeHoldUpdate(universe.dt);
            autoLandUpdate(universe.dt);
            landButtonGate();
            pilotUpdate(universe.dt);
            universe.simulateFrame(millis);
            updateImpactWarning(millis);
            safeEngageCheck();
            updateVoidBorder();
            updateHeatHud();
            space(context, helper);
            flightStickDraw(context, helper);
            drawStickBars(context, helper);
            telemetry(millis);
            updateBoostGlow(millis);
            updateScanFx();
            drawRadar();
        },
        setControlsShow: (show: boolean) => {
            isControlsShow = show;
        },
        triggerScan: triggerPlayerScan,
        setRadarOpen: (open: boolean) => {
            radarOpen = open;
            if (radarOverlay) radarOverlay.classList.toggle("open", open);
        },
        setRouteTargetById,
        startRoute,
        cancelRoute,
        deleteLastNode: deleteLastRouteNode,
        clearRoute: () => { clearRouteNodes(); cancelRoute(); },
        setRadarPickMode: (v: boolean) => { radarPickMode = v; },
        radarIsPickMode: () => radarPickMode,
        setSafetyEnabled,
        releaseHold,
        startAutoLand,
        isSafetyHold: () => safeHold,
        setRadarDeleteMode: (v: boolean) => { radarDeleteMode = v; },
        radarIsDeleteMode: () => radarDeleteMode,
        /** Click-to-delete: remove the node under a radar point (px from center). */
        deleteNodeAt: (mx: number, my: number) => deleteNodeAt(mx, my),
        /** Radar click (canvas-local offsets from center): pick/info routing. */
        radarClick: (mx: number, my: number) => radarClick(mx, my),
        /** Anchored zoom (cx/cy = canvas px from center stay on the same world point). */
        radarZoomBy: (factor: number, cx: number, cy: number) => {
            if (!radarCanvas) return;
            const oldScale = radarBaseScale() * radarZoom;
            const star = universe.star;
            const wx = star.pos.x + radarPanX + cx / oldScale;
            const wy = star.pos.y + radarPanY + cy / oldScale;
            radarZoom = clamp(radarZoom * factor, 1, 60);
            const newScale = radarBaseScale() * radarZoom;
            radarPanX = wx - star.pos.x - cx / newScale;
            radarPanY = wy - star.pos.y - cy / newScale;
        },
        radarPanBy: (dxPx: number, dyPx: number) => {
            const s = radarBaseScale() * radarZoom;
            // drag-following (user 2026-11-09): dragging the pointer right
            // moves the MAP right with the pointer (content follows finger).
            radarPanX -= dxPx / s;
            radarPanY -= dyPx / s;
        },
        radarResetView: () => { radarZoom = 1; radarPanX = 0; radarPanY = 0; },
        routeInfo: () => ({
            nodes: routeNodeList.map(n => ({ x: Math.round(n.x), y: Math.round(n.y), bodyId: n.bodyId })),
            idx: routeIdx,
            active: routePilot.active,
            phase: routePilot.phase,
        }),
        /** Radar hit-test for route picking (canvas-local offsets from center). */
        radarHitTest: (mx: number, my: number): number | null => {
            if (!radarCanvas) return null;
            const star = universe.star;
            const scale = radarBaseScale() * radarZoom;
            let best: { id: number; d: number } | null = null;
            for (const p of universe.planets) {
                const px = (p.pos.x - star.pos.x - radarPanX) * scale;
                const py = (p.pos.y - star.pos.y - radarPanY) * scale;
                const d = Math.hypot(px - mx, py - my);
                if (d < 22 && (best === null || d < best.d)) best = { id: p.id, d };
            }
            return best === null ? null : best.id;
        },
        /** Pause-menu graphics tier (persisted, applied live by Spaaaace). */
        setPostFXTier: (t: string | null) => setRequestedPostFXTier(t),
    };
}
