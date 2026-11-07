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
import { Vec2_makeWithAngleMag } from "../core/Vec2";
import { VisibleUniverse15, ZoomedDrawScope15 } from "../render/VisibleUniverse15";
import { StarClassNames, UniverseConst } from "../universe/Universe";
import { Spacecraft } from "../universe/Universe";
import { Landing15, Spacecraft15 } from "../universe/Universe15";
import { FlightStick } from "../input/FlightStick";
import { InputActionLayer } from "../input/InputActions";
import { Autopilot15 } from "../sim/Autopilot15";
import { VisibleUniverse } from "../render/VisibleUniverse";
import { chaseCamera, CAMERA_FOLLOW_RATE, velocityZoomFactor, parallaxOffsetPx, wrapTile, DUST_PARALLAX_PX_PER_M, STARFIELD_PARALLAX_PX_PER_M, decayKick, kickMetersForScreenPx } from "../camera/Camera";
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

// Fisheye warp-boost edge distortion strength (user 2026-11-08). 0 = off,
// 1 = full. Driven by boost engagement, applied as radial screen warp per
// frame in the render layer below (barrel toward edges, center stays sharp).
let FISHEYE = 0;

let playSpeed = 1;
let camZoom = DEFAULT_CAMERA_ZOOM;
let cachedMassString = "";

let isBaklava = false;
let isControlsShow = false;

const atan2 = Math.atan2;
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

    // Deterministic multi-layer starfield (P05-T03, deepened 2026-11-08):
    // three parallax planes — far (0.08 px/m, fine), mid (0.15 px/m, bigger
    // brighter), near dust (1.3 px/m, faint) — phase-locked to camera
    // translation only (never zoom-scaled), wrapped in 512 px tiles.
    const STARFIELD_SEED = 123456789n;
    const starfieldRng = newRandom(STARFIELD_SEED);
    interface StarDot { x: number; y: number; size: number; alpha: number }
    const starfield: StarDot[] = [];
    for (let i = 0; i < 110; i++) {
        starfield.push({
            x: starfieldRng.minmax(0, 512),
            y: starfieldRng.minmax(0, 512),
            size: starfieldRng.minmax(0.5, 1.4),
            alpha: starfieldRng.minmax(0.16, 0.7),
        });
    }
    const midfield: StarDot[] = [];
    for (let i = 0; i < 60; i++) {
        midfield.push({
            x: starfieldRng.minmax(0, 512),
            y: starfieldRng.minmax(0, 512),
            size: starfieldRng.minmax(0.9, 1.7),
            alpha: starfieldRng.minmax(0.25, 0.6),
        });
    }
    const dustfield: StarDot[] = [];
    for (let i = 0; i < 36; i++) {
        dustfield.push({
            x: starfieldRng.minmax(0, 512),
            y: starfieldRng.minmax(0, 512),
            size: starfieldRng.minmax(0.6, 1.4),
            alpha: starfieldRng.minmax(0.03, 0.12),
        });
    }
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
        if (!reducedMotion) {
            if (FISHEYE > fisheyeSmooth) fisheyeSmooth = Math.min(FISHEYE, fisheyeSmooth + u.dt * 2.2);
            else fisheyeSmooth = Math.max(FISHEYE, fisheyeSmooth - u.dt * 3.0);
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
            const drawLayer = (dots: StarDot[], pxPerM: number) => {
                const ox = -parallaxOffsetPx(chaseX, dpr, pxPerM);
                const oy = -parallaxOffsetPx(chaseY, dpr, pxPerM);
                for (const dot of dots) {
                    const bx = wrapTile(dot.x + ox, tile);
                    const by = wrapTile(dot.y + oy, tile);
                    for (let tx = 0; tx < tilesX; tx++) {
                        for (let ty = 0; ty < tilesY; ty++) {
                            w2.globalAlpha = dot.alpha;
                            w2.fillStyle = "#D8D8FF";
                            w2.fillRect(bx + tx * tile, by + ty * tile, dot.size * dpr, dot.size * dpr);
                        }
                    }
                }
                w2.globalAlpha = 1;
            };
            drawLayer(starfield, STARFIELD_PARALLAX_PX_PER_M);
            drawLayer(midfield, 0.15);
            drawLayer(dustfield, DUST_PARALLAX_PX_PER_M);
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
            const targetZoom = (camZoom / CAMERA_DISTANCE) / factor;
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

/** Fisheye warp-boost strength 0..1 (0.02 handled smooth inside Spaaaace). */
export function setBoostEngaged(engaged: boolean) {
    // Gating: boost only engages at/above base cap; main.ts enforces the UI
    // rule (button disabled below cap), this keeps the engine honest.
    FISHEYE = engaged ? 1 : 0;
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

    // Boost control (user 2026-11-08): main.ts flips ship.boost + multiplier.
    function setBoost(engaged: boolean) {
        ship.boost = engaged;
        ship.thrustMultiplier = engaged ? 1.5 : 1;
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
        };
    }

    return {
        pointerInput: flightStick.pointerInput,
        setAutopilot: setAutopilot,
        setBoost: setBoost,
        debugState: debugState,
        draw: (millis: number, context: CanvasRenderingContext2D, helper: CanvasHelper) => {
            applyKeyboardFlight(millis);
            universe.simulateFrame(millis);
            space(context, helper);
            flightStickDraw(context, helper);
            telemetry(millis);
        },
        setControlsShow: (show: boolean) => {
            isControlsShow = show;
        }
    };
}
