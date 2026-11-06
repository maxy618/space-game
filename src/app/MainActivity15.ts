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
import { FlightStick } from "./MainActivity";
import { Autopilot15 } from "./Autopilot15";
import { VisibleUniverse } from "../render/VisibleUniverse";

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
// original default view), max speed = 1.3x (farther). Interpolated linearly in
// between and smoothed per frame. The ship always stays clearly visible.
const SPEED_ZOOM_NEAR = 0.7; // visible-space factor when the ship is stopped
const SPEED_ZOOM_FAR = 1.7; // visible-space factor at CRAFT_SPEED_LIMIT (user preference: keep pushing farther, tune 0.7..1.7+)
const SPEED_ZOOM_REF = 800; // px/s treated as "medium" speed = exactly the original view
let SPEED_ZOOM_ENABLED = true;

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

    const centerFracX = 0.5;
    const centerFracY = 0.5;

    return (context: CanvasRenderingContext2D, helper: CanvasHelper) => {
        const canvasWidth = context.canvas.width;
        const canvasHeight = context.canvas.height;
        context.fillStyle = Colors.Eigengrau;
        context.fillRect(0, 0, canvasWidth, canvasHeight);

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
            const targetZoom = clamp(500 / distToNearestSurf, MIN_CAMERA_ZOOM, MAX_CAMERA_ZOOM);
            cameraZoom = isBaklava ? expSmooth(cameraZoom, targetZoom, u.dt, 1.5) : targetZoom;
        } else if (SPEED_ZOOM_ENABLED) {
            // Player-facing: camera view scales smoothly with ship speed.
            // Visible-space factor: stopped -> SPEED_ZOOM_NEAR (closer),
            // SPEED_ZOOM_REF (medium) -> exactly the original view,
            // CRAFT_SPEED_LIMIT (max) -> SPEED_ZOOM_FAR (farther).
            const speed = u.ship.velocity.mag();
            // One smooth curve, no kinks: both halves flatten at the junction
            // (speed == SPEED_ZOOM_REF), so the zoom glides exponentially
            // instead of stepping through two stages.
            let factor;
            if (speed <= SPEED_ZOOM_REF) {
                const x = clamp(speed / SPEED_ZOOM_REF, 0, 1);
                factor = 1 - (1 - SPEED_ZOOM_NEAR) * (1 - x) * (1 - x);
            } else {
                const t = clamp((speed - SPEED_ZOOM_REF) / (UniverseConst.CRAFT_SPEED_LIMIT - SPEED_ZOOM_REF), 0, 1);
                factor = lerp(1, SPEED_ZOOM_FAR, t * t);
            }
            const targetZoom = camZoom / factor;
            // Clamp to a positive range: a zero/negative cameraZoom would hang the
            // gridStep while-loop below and freeze the whole page.
            cameraZoom = clamp(expSmooth(cameraZoom, targetZoom, u.dt, 2.5), MIN_CAMERA_ZOOM, MAX_CAMERA_ZOOM);
        } else if (!TOUCH_CAMERA_ZOOM) cameraZoom = isBaklava ? expSmooth(cameraZoom, DEFAULT_CAMERA_ZOOM, u.dt, 5) : DEFAULT_CAMERA_ZOOM;
        else cameraZoom = isBaklava ? expSmooth(cameraZoom, camZoom, u.dt, 5) : camZoom;
        if (!TOUCH_CAMERA_PAN) {
            const follow = u.follow;
            if (follow !== null) {
                cameraOffsetX = -follow.pos.x;
                cameraOffsetY = -follow.pos.y;
            } else {
                cameraOffsetX = cameraOffsetY = 0;
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

        context.save();
        context.scale(deviceScale, deviceScale);
        context.translate(
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
        context.strokeStyle = Colors.Eigengrau2;
        while (x < visibleSpaceRectMeterRight) {
            context.lineWidth = (((x % (gridStep * 10) === 0)) ? 3 : 1.5) / cameraZoom;
            context.beginPath();
            context.moveTo(x, visibleSpaceRectMeterTop);
            context.lineTo(x, visibleSpaceRectMeterBottom);
            context.stroke();
            x += gridStep;
        }

        var y = floor(visibleSpaceRectMeterTop / gridStep) * gridStep;
        while (y < visibleSpaceRectMeterBottom) {
            context.lineWidth = (((y % (gridStep * 10) === 0)) ? 3 : 1.5) / cameraZoom;
            context.beginPath();
            context.moveTo(visibleSpaceRectMeterLeft, y);
            context.lineTo(visibleSpaceRectMeterRight, y);
            context.stroke();
            y += gridStep;
        }

        zoomedDrawScope.zoom = cameraZoom;
        zoomedDrawScope.context = context;
        zoomedDrawScope.helper = helper;
        zoomedDrawScope.drawUniverse(u);

        context.restore();
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
    topContainer: HTMLElement, bottomContainer: HTMLElement, autopilotText: HTMLElement) {
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
        Colors.Green,
        (x, y) => {
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

    return {
        pointerInput: flightStick.pointerInput,
        setAutopilot: setAutopilot,
        draw: (millis: number, context: CanvasRenderingContext2D, helper: CanvasHelper) => {
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
