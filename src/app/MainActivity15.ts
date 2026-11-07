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
import { VisibleUniverse15, ZoomedDrawScope15 } from "../render/VisibleUniverse15";
import { Asteroid, Landing, Planet, Spacecraft, Spark, SparkStyle, Star, StarClass, StarClassNames, StarClasses, Track, UniverseConst } from "../universe/Universe";
import { Landing15, Spacecraft15 } from "../universe/Universe15";
import { FlightStick } from "../input/FlightStick";
import { InputActionLayer } from "../input/InputActions";
import { Autopilot15 } from "../sim/Autopilot15";
import { VisibleUniverse } from "../render/VisibleUniverse";
import { timeToImpact, impactGatesPass, IMPACT_CLEAR_SECONDS, IMPACT_CRITICAL_SECONDS } from "../universe/CollisionPredict";
import { SCAN_COOLDOWN } from "../universe/Scanner";
import { createRoutePilot, pilotStep, type RouteThreat } from "../sim/RoutePilot";
import { chaseCamera, CAMERA_FOLLOW_RATE, velocityZoomFactor, fisheyeTargetForSpeed, parallaxOffsetPx, wrapTile, DUST_PARALLAX_PX_PER_M, STARFIELD_PARALLAX_PX_PER_M, decayKick, kickMetersForScreenPx } from "../camera/Camera";
import { newRandom } from "../core/RandomKt";

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
let radarOpen = false; // radar overlay state (mirrored in main.ts via setRadarOpen)

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
    let kickX = 0;
    let kickY = 0;
    const KICK_DECAY_RATE = 6; // per second → ~0.5 s visible kick
    let prevLanding = false;
    let prevDiscovery: number | null = null;
    let nearStarGlare = 1; // 1 = normal sky, 0 = fully washed out (close to star)

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
    for (let i = 0; i < 110; i++) starfield.push(makeStar());
    // Milky band (user 2026-11-09): a RESTRAINED cluster of tiny faint stars
    // along a diagonal — depth cue, not noise (user warning: the sky must
    // never read as mush). Faint alphas, sparse count.
    const band: StarDot[] = [];
    for (let i = 0; i < 110; i++) {
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
    for (let i = 0; i < 60; i++) {
        const s = makeStar();
        s.size = starfieldRng.minmax(0.9, 1.7);
        s.alpha = starfieldRng.minmax(0.25, 0.6);
        s.glint = starfieldRng.float() < 0.12;
        midfield.push(s);
    }
    const dustfield: StarDot[] = [];
    for (let i = 0; i < 36; i++) {
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
        // disc glow
        const disc = g.createRadialGradient(0, 0, 0, 0, 0, R);
        disc.addColorStop(0, coreHue);
        disc.addColorStop(0.25, hue);
        disc.addColorStop(1, "rgba(0,0,0,0)");
        g.globalAlpha = 0.16;
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
            g.globalAlpha = 0.10 + rng() * 0.22 * (1 - t * 0.5);
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
    const galaxies = [
        { rx: 20, alpha: 0.55, hue: "#9FB4E8", coreHue: "#FFE8C8" },
        { rx: 11, alpha: 0.42, hue: "#E8C8B0", coreHue: "#FFF2DC" },
        { rx: 6, alpha: 0.30, hue: "#A8C8E8", coreHue: "#FFE8C8" },
    ].map(g => ({
        x: starfieldRng.minmax(0, 512),
        y: starfieldRng.minmax(0, 512),
        rx: g.rx,
        alpha: g.alpha,
        hue: g.hue,
        coreHue: g.coreHue,
        rot: starfieldRng.minmax(0, PI),
        sprite: buildGalaxySprite(() => starfieldRng.float(), g.hue, g.coreHue),
    }));
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
        const warpActive = fisheyeSmooth > 0.01;
        const drawCtx = warpActive ? offCtx : context;
        if (warpActive) {
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
            // galaxies first (deepest): pre-rendered spiral sprites
            {
                const gox = -parallaxOffsetPx(chaseX, dpr, STARFIELD_PARALLAX_PX_PER_M * 0.6);
                const goy = -parallaxOffsetPx(chaseY, dpr, STARFIELD_PARALLAX_PX_PER_M * 0.6);
                for (const g of galaxies) {
                    const bx = wrapTile(g.x + gox, tile);
                    const by = wrapTile(g.y + goy, tile);
                    const size = g.rx * 2 * dpr;
                    for (let tx = 0; tx < tilesX; tx++) {
                        for (let ty = 0; ty < tilesY; ty++) {
                            w2.save();
                            w2.translate(bx + tx * tile, by + ty * tile);
                            w2.rotate(g.rot);
                            w2.globalAlpha = g.alpha;
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
            const targetZoom = (camZoom / CAMERA_DISTANCE) / factor / scanPull;
            // Clamp to a positive range: a zero/negative cameraZoom would hang the
            // gridStep while-loop below and freeze the whole page.
            cameraZoom = clamp(expSmooth(cameraZoom, targetZoom, u.dt, 2.5), MIN_CAMERA_ZOOM, MAX_CAMERA_ZOOM);
        } else if (!TOUCH_CAMERA_ZOOM) cameraZoom = isBaklava ? expSmooth(cameraZoom, DEFAULT_CAMERA_ZOOM / CAMERA_DISTANCE, u.dt, 5) : DEFAULT_CAMERA_ZOOM / CAMERA_DISTANCE;
        else cameraZoom = isBaklava ? expSmooth(cameraZoom, camZoom / CAMERA_DISTANCE, u.dt, 5) : camZoom / CAMERA_DISTANCE;
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
                    }
                    prevLanding = landingNow;
                    const discId = u.latestDiscovery ? u.latestDiscovery.id : null;
                    if (discId !== null && discId !== prevDiscovery) {
                        kickY += kickMetersForScreenPx(2, cameraZoom);
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

        let gridStep = 1000;
        const dp32 = toLocalPx(32);
        while (gridStep * deviceScale < dp32) gridStep *= 10;

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

        var x = floor(visibleSpaceRectMeterLeft / gridStep) * gridStep;
        w2.strokeStyle = Colors.Eigengrau2;
        while (x < visibleSpaceRectMeterRight) {
            w2.lineWidth = (((x % (gridStep * 10) === 0)) ? 3 : 1.5) / cameraZoom;
            w2.beginPath();
            w2.moveTo(x, visibleSpaceRectMeterTop);
            w2.lineTo(x, visibleSpaceRectMeterBottom);
            w2.stroke();
            x += gridStep;
        }

        var y = floor(visibleSpaceRectMeterTop / gridStep) * gridStep;
        while (y < visibleSpaceRectMeterBottom) {
            w2.lineWidth = (((y % (gridStep * 10) === 0)) ? 3 : 1.5) / cameraZoom;
            w2.beginPath();
            w2.moveTo(visibleSpaceRectMeterLeft, y);
            w2.lineTo(visibleSpaceRectMeterRight, y);
            w2.stroke();
            y += gridStep;
        }

        zoomedDrawScope.zoom = cameraZoom;
        zoomedDrawScope.context = w2;
        zoomedDrawScope.helper = helper;
        zoomedDrawScope.drawUniverse(u);

        w2.restore();

        // Fisheye blit: radial barrel mapping offscreen → screen, tile by tile.
        if (warpActive) {
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
            inputLayer.setStick(x, y, isDown);
            if (universe.follow instanceof Spacecraft) {
                const ship = universe.follow as Spacecraft;
                if (x === 0 && y === 0) {
                    ship.thrust.x = 0;
                    ship.thrust.y = 0;
                } else {
                    const a = atan2(y, x);
                    ship.angle = a;

                    const m = sqrt(x * x + y * y);
                    if (m < minRadius) {
                        // within this radius, just reorient
                        ship.thrust.x = 0;
                        ship.thrust.y = 0;
                    } else {
                        Vec2_makeWithAngleMag(
                            ship.thrust,
                            a,
                            clamp(lexp(minRadius, maxRadius, m), 0, 1)
                        );
                    }
                }
            }
        }
    );
    const autopilot = new Autopilot15(universe.ship as Spacecraft15, universe);
    const flightStickDraw = flightStick.draw;
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

    // Keyboard flight (P04-T01): W thrust forward, S brake, A/D steer.
    // Applied per frame; the flight stick wins while it is active.
    let lastFrameMillis = -1;
    const KEYBOARD_TURN_RATE = 1.8; // radians per second while steering
    function applyKeyboardFlight(millis: number) {
        const actions = inputLayer.resolve();
        const target = universe.follow instanceof Spacecraft ? universe.follow as Spacecraft : null;
        if (target !== null && !actions.stickActive) {
            // any player flight input overrides the route pilot (except during
            // the threat stop, where steering back is the designed recovery)
            if (actions.forward > 0 || actions.brake > 0 || actions.steer !== 0) playerTookControl = true;
            const dt = lastFrameMillis < 0 ? 0 : clamp((millis - lastFrameMillis) / 1000, 0, 0.1);
            if (actions.steer !== 0) {
                target.angle += actions.steer * KEYBOARD_TURN_RATE * dt;
            }
            if (actions.forward > 0) {
                Vec2_makeWithAngleMag(target.thrust, target.angle, actions.forward);
            } else if (actions.brake > 0) {
                // brake: the engine always thrusts forward along the heading
                // (Universe15 applies deltaV along ship.angle), so rotate the
                // ship to face retrograde (opposite the velocity) and burn.
                const v = target.velocity;
                if (v.x !== 0 || v.y !== 0) {
                    target.angle = atan2(v.y, v.x) + Math.PI;
                }
                Vec2_makeWithAngleMag(target.thrust, target.angle, actions.brake);
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
    // Trigger → wave visual + instant reveal of planets in range + a brief
    // camera pull-out so the player sees the sweep "from above".
    const scanButton = document.getElementById("scanButton");
    const radarOverlay = document.getElementById("radarOverlay");
    const radarCanvas = document.getElementById("radarCanvas") as HTMLCanvasElement | null;
    function triggerPlayerScan(): number {
        return universe.triggerScan();
    }
    function updateScanFx() {
        const s = universe.scan;
        // camera pull-out while the wave is visible (smooth in/out)
        const wantPull = s.waveAge >= 0 ? 1.35 : 1;
        scanPull = expSmooth(scanPull, wantPull, universe.dt, 2.2);
        // button cooldown sweep
        if (scanButton) {
            const cd = s.cooldown;
            if (cd > 0) {
                (scanButton as HTMLButtonElement).disabled = true;
                const frac = cd / SCAN_COOLDOWN;
                scanButton.style.background =
                    "conic-gradient(rgba(167,167,202,0.35) " + ((1 - frac) * 360) + "deg, rgba(22,22,29,0.72) 0deg)";
            } else {
                (scanButton as HTMLButtonElement).disabled = false;
                scanButton.style.background = "";
            }
        }
    }

    /**
     * Radar / system map (user 2026-11-09): schematic star-centered view.
     * Discovered (scanned/explored) planets = colored glyph + name;
     * unknown = faint hollow dot. Ship = arrow marker with velocity vector.
     * Drawn per frame while open (the sim keeps running — it's an overlay).
     */
    function drawRadar() {
        if (!radarOpen || !radarCanvas) return;
        const ctx2 = radarCanvas.getContext("2d");
        if (!ctx2) return;
        const W = radarCanvas.width;
        const H = radarCanvas.height;
        const c = W / 2;
        const star = universe.star;
        // scale: system span + margin → radar radius
        const maxOrbit = Math.max(
            ...universe.planets.map(p => p.pos.distance(star.pos)),
            UniverseConst.PLANET_ORBIT_RANGE_MIN * 1.2,
        );
        const scale = (W * 0.44) / maxOrbit;
        ctx2.clearRect(0, 0, W, H);
        ctx2.save();
        ctx2.translate(c, c);
        // orbit rings (hairline)
        ctx2.strokeStyle = "rgba(60,60,76,0.9)";
        ctx2.lineWidth = 1;
        for (const p of universe.planets) {
            const r = p.pos.distance(star.pos) * scale;
            ctx2.beginPath();
            ctx2.arc(0, 0, r, 0, PI * 2);
            ctx2.stroke();
        }
        // star
        ctx2.fillStyle = star.color;
        ctx2.beginPath();
        ctx2.arc(0, 0, Math.max(3, star.radius * scale * 1.6), 0, PI * 2);
        ctx2.fill();
        // planets
        ctx2.font = "10px 'Roboto Mono', monospace";
        for (const p of universe.planets) {
            const px = (p.pos.x - star.pos.x) * scale;
            const py = (p.pos.y - star.pos.y) * scale;
            if (p.scanned || p.explored) {
                ctx2.fillStyle = p.color;
                ctx2.beginPath();
                ctx2.arc(px, py, 4, 0, PI * 2);
                ctx2.fill();
                ctx2.fillStyle = "rgba(167,167,202,0.85)";
                ctx2.fillText(p.name, px + 7, py + 3);
            } else {
                ctx2.strokeStyle = "rgba(122,122,158,0.55)";
                ctx2.lineWidth = 1.2;
                ctx2.beginPath();
                ctx2.arc(px, py, 3.4, 0, PI * 2);
                ctx2.stroke();
                ctx2.fillStyle = "rgba(122,122,158,0.7)";
                ctx2.fillText("?", px + 6, py + 3);
            }
        }
        // asteroid fields: faint cluster dots (radar sees big rocks at close range)
        ctx2.fillStyle = "rgba(122,122,158,0.4)";
        for (const a of universe.asteroids) {
            const dx = (a.pos.x - universe.ship.pos.x) * scale;
            const dy = (a.pos.y - universe.ship.pos.y) * scale;
            if (dx * dx + dy * dy < (W * 0.35) * (W * 0.35)) {
                ctx2.fillRect(
                    (a.pos.x - star.pos.x) * scale - 1,
                    (a.pos.y - star.pos.y) * scale - 1, 2, 2);
            }
        }
        // ship marker: arrow + velocity vector
        const sx = (universe.ship.pos.x - star.pos.x) * scale;
        const sy = (universe.ship.pos.y - star.pos.y) * scale;
        ctx2.translate(sx, sy);
        ctx2.rotate(universe.ship.angle);
        ctx2.fillStyle = "#B7B7FF";
        ctx2.beginPath();
        ctx2.moveTo(7, 0);
        ctx2.lineTo(-5, 4.4);
        ctx2.lineTo(-5, -4.4);
        ctx2.closePath();
        ctx2.fill();
        ctx2.rotate(-universe.ship.angle);
        const vmag = universe.ship.velocity.mag() / 1000; // scale: 1000 m/s → 1 px per scale unit
        ctx2.strokeStyle = "rgba(183,183,255,0.6)";
        ctx2.lineWidth = 1.4;
        ctx2.beginPath();
        ctx2.moveTo(0, 0);
        ctx2.lineTo(universe.ship.velocity.x / 6000 * 40, universe.ship.velocity.y / 6000 * 40);
        ctx2.stroke();
        ctx2.restore();
    }

    // ===== Route autopilot (user 2026-11-09) =====
    // Simple A→B pilot with auto-boost; stops on threats and waits for the
    // player to steer back on course. Route targets are picked on the radar
    // map (main.ts resolves clicks → setRouteTargetById).
    const routePilot = createRoutePilot();
    let routeTarget: Planet | null = null;
    let playerTookControl = false;
    let arrivedClock = 0;
    function setRouteTargetById(id: number | null) {
        routeTarget = id === null ? null : (universe.planets.find(p => p.id === id) ?? null);
        if (routeTarget === null) routePilot.active = false;
        return routeTarget !== null;
    }
    function startRoute() {
        if (routeTarget === null) return false;
        playerTookControl = false;
        routePilot.active = true;
        routePilot.phase = "chase";
        arrivedClock = 0;
        return true;
    }
    function cancelRoute() {
        routePilot.active = false;
        routePilot.phase = "chase";
        setBoost(false);
        ship.thrust.x = 0;
        ship.thrust.y = 0;
        routeTarget = null;
        universe.routeTarget = null;
        universe.routePhase = "off";
    }
    function pilotUpdate(dt: number) {
        if (routePilot.active === false || routeTarget === null) return;
        // player override during flight (not during the threat stop — there
        // the player steering back on course is the designed recovery)
        if (playerTookControl && routePilot.phase !== "stopped") {
            cancelRoute();
            return;
        }
        const threats: RouteThreat[] = [];
        for (const b of impactBodies()) {
            if (b === routeTarget) continue;
            threats.push({ x: b.pos.x, y: b.pos.y, vx: b.velocity.x, vy: b.velocity.y, radius: b.radius });
        }
        const intent = pilotStep(
            routePilot,
            { x: routeTarget.pos.x, y: routeTarget.pos.y, radius: routeTarget.radius, vx: routeTarget.velocity.x, vy: routeTarget.velocity.y },
            threats,
            { x: ship.pos.x, y: ship.pos.y, vx: ship.velocity.x, vy: ship.velocity.y, angle: ship.angle },
            dt,
            ship.profile.engineAccel,
        );
        // steering (pilot owns the nose in chase/brake; player steers in stop)
        if (routePilot.phase !== "stopped") {
            const bearing = Math.atan2(routeTarget.pos.y - ship.pos.y, routeTarget.pos.x - ship.pos.x);
            let err = bearing - ship.angle;
            while (err > PI) err -= PI * 2;
            while (err < -PI) err += PI * 2;
            const maxTurn = KEYBOARD_TURN_RATE * dt;
            ship.angle += clamp(err, -maxTurn, maxTurn);
        }
        ship.thrust.x = intent.thrustX;
        ship.thrust.y = intent.thrustY;
        setBoost(intent.boost);
        universe.routeTarget = routeTarget;
        universe.routePhase = routePilot.phase;
        if (routePilot.phase === "arrived") {
            arrivedClock += dt;
            if (arrivedClock > 2) { cancelRoute(); }
        } else arrivedClock = 0;
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
    function updateImpactWarning(millis: number) {
        if (lastFrameMillisImpact >= 0) impactEvalIn -= (millis - lastFrameMillisImpact) / 1000;
        lastFrameMillisImpact = millis;
        if (impactEvalIn > 0) return;
        impactEvalIn = 0.1;

        // single pass over all bodies, keep the most urgent gated threat
        let bestBody: { pos: Vec2, radius: number } | null = null;
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

        if (bestBody === null) {
            universe.impactThreat = null;
            if (impactHud && impactHud.classList.contains("active")) impactHud.classList.remove("active");
            return;
        }
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
            })),
            star: { x: universe.star.pos.x, y: universe.star.pos.y, radius: universe.star.radius },
            impact: universe.impactThreat ? { tti: universe.impactThreat.tti, level: universe.impactThreat.level } : null,
            liveSparks: universe.countLiveSparksPublic(),
            scan: { cooldown: universe.scan.cooldown, waveAge: universe.scan.waveAge },
            scannedCount: universe.planets.filter(p => p.scanned).length,
            route: routeTarget === null ? null : { id: routeTarget.id, active: routePilot.active, phase: routePilot.phase },
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
            pilotUpdate(universe.dt);
            universe.simulateFrame(millis);
            updateImpactWarning(millis);
            space(context, helper);
            flightStickDraw(context, helper);
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
        routeInfo: () => routeTarget === null ? null : {
            id: routeTarget.id,
            active: routePilot.active,
            phase: routePilot.phase,
        },
        /** Radar hit-test for route picking (canvas-local offsets from center). */
        radarHitTest: (mx: number, my: number): number | null => {
            if (!radarCanvas) return null;
            const star = universe.star;
            const maxOrbit = Math.max(
                ...universe.planets.map(p => p.pos.distance(star.pos)),
                UniverseConst.PLANET_ORBIT_RANGE_MIN * 1.2,
            );
            const scale = (radarCanvas.width * 0.44) / maxOrbit;
            let best: { id: number; d: number } | null = null;
            for (const p of universe.planets) {
                const px = (p.pos.x - star.pos.x) * scale;
                const py = (p.pos.y - star.pos.y) * scale;
                const d = Math.hypot(px - mx, py - my);
                if (d < 14 && (best === null || d < best.d)) best = { id: p.id, d };
            }
            return best === null ? null : best.id;
        },
    };
}
