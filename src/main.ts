/*
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
 *
 * Ported from reference/landroid-web/src/player15.ts (Apache-2.0).
 */

import { CanvasHelper } from "./core/CanvasHelper";
import { SimClock } from "./core/SimClock";
import { setDrawFlag } from "./core/Flag15";
import {
    DEFAULT_CAMERA_ZOOM,
    getCamZoom,
    getIsBaklava,
    MainActivity15,
    RandomSeedType,
    setCamZoom,
    setDynamicZoom,
    setFixedRandomSeed,
    setIsBaklava,
    setPlaySpeed,
    setRandomSeedType,
    setSpeedZoomEnabled,
} from "./app/MainActivity15";
import { initSpeedControl } from "./playerSpeed";
import { InputActionLayer } from "./input/InputActions";
import { UniverseConst } from "./universe/Universe";

const unsupportedFeatures: Array<String> = [];
if (typeof BigInt === "undefined") {
    unsupportedFeatures.push("BigInt");
}
if (typeof String.prototype.matchAll === "undefined") {
    unsupportedFeatures.push("String.prototype.matchAll");
}
if (unsupportedFeatures.length > 0) {
    alert("Your browser does not support the following features: " + unsupportedFeatures + ".\nThe app will exit now.");
    throw new Error("Unsupported features: " + unsupportedFeatures);
}

const canvas = document.getElementById("canvasMain") as HTMLCanvasElement;
const canvasContext: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;
// Manual zoom (wheel / two-finger pinch) is a DEBUG-only tool per project policy.
let manualZoom = false;
// All debug controls (speed, pause, zoom select) are hidden unless #debug=1.
let debugMode = false;
if (!canvasContext) {
    alert("Unable to get canvas 2d context.\nThe app will exit now.");
    throw new Error("Unable to get canvas 2d context");
}
const helper = new CanvasHelper(canvasContext);

let isTwoFingerDown = false;
let downZoom = 0;
let downDistance = 0;
let controlsInterval: any = -1;
let controlsShow = false;

const controlsContainer = document.getElementById("rightContainer")!;
const autopilotButton = document.getElementById("autoPilotButton")!;
let selectedZoomIndex = 0;
const zoomSelect = document.getElementById("zoomSelect") as HTMLSelectElement;
function zoomSelectChange() {
    const hash = location.hash;
    const params = hash ? new URLSearchParams(hash.substring(1)) : new URLSearchParams();
    switch (selectedZoomIndex = zoomSelect.selectedIndex) {
        case 0:
            params.set("zoom", "fixed");
            break;
        case 1:
            params.set("zoom", "dynamic");
            break;
        case 2:
            params.set("zoom", "manual");
            break;
    }
    const newHash = params.toString();
    if (location.hash !== "#" + newHash) {
        history.replaceState({}, "", "#" + newHash);
        loadParams();
    }
}
zoomSelect.addEventListener("change", zoomSelectChange);

function loadParams() {
    const hash = location.hash;
    const params = hash ? new URLSearchParams(hash.substring(1)) : new URLSearchParams();
    const zoomParam = params.get("zoom");
    setDynamicZoom(zoomParam === "dynamic");
    if (zoomParam === "dynamic") selectedZoomIndex = 1;
    manualZoom = zoomParam === "manual";
    if (manualZoom) selectedZoomIndex = 2;
    if (!manualZoom && zoomParam !== "dynamic") {
        setCamZoom(DEFAULT_CAMERA_ZOOM);
        selectedZoomIndex = 0;
    }
    zoomSelect.removeEventListener("change", zoomSelectChange);
    zoomSelect.selectedIndex = selectedZoomIndex;
    zoomSelect.addEventListener("change", zoomSelectChange);
    // Debug tools (speed, pause, zoom modes, autopilot button) are hidden from players.
    debugMode = params.get("debug") === "1";
    controlsContainer.hidden = !debugMode;
    // Player-facing velocity zoom: camera smoothly zooms out as ship speed rises.
    // Can be disabled for testing via #speedzoom=0.
    setSpeedZoomEnabled(params.get("speedzoom") !== "0");
    const seedStr = params.get("seed");
    if (seedStr) {
        if (seedStr === "evergreen") {
            setRandomSeedType(RandomSeedType.Evergreen);
        } else if (seedStr === "daily") {
            setRandomSeedType(RandomSeedType.Daily);
        } else try {
            const SEED_MAX = 9223372036854775807n;
            const SEED_MIN = -9223372036854775808n;
            let seed = BigInt(seedStr);
            if (seed > SEED_MAX) seed = SEED_MAX;
            if (seed < SEED_MIN) seed = SEED_MIN;
            setRandomSeedType(RandomSeedType.Fixed);
            setFixedRandomSeed(seed);
        } catch (e) {
            console.error(e);
        }
    }
    const drawFlagStr = params.get("flag");
    if (drawFlagStr === "true" || drawFlagStr === "1") {
        setDrawFlag(true);
    } else if (drawFlagStr === "false" || drawFlagStr === "0") {
        setDrawFlag(false);
    }
    const baklavaStr = params.get("is16");
    if (baklavaStr === "true" || baklavaStr === "1") {
        setIsBaklava(true);
        updateAutopilotButton();
    } else if (baklavaStr === "false" || baklavaStr === "0") {
        setIsBaklava(false);
        updateAutopilotButton();
    }
}
loadParams();
window.addEventListener("hashchange", loadParams);

// One action layer for every device (P04-T01): keyboard, mouse and touch all
// feed the same set of player actions; focus loss releases held inputs.
const inputLayer = new InputActionLayer();
inputLayer.attachKeyboard(window);

const activity = MainActivity15(
    document.getElementById("topText")!,
    document.getElementById("bottomText")!,
    document.getElementById("topContainer")!,
    document.getElementById("bottomContainer")!,
    document.getElementById("autopilotText")!,
    inputLayer,
);

// Debug-only test hook: QA routes (asteroid close-ups) steer the ship via
// real input events, using these positions only to aim. Never player-facing.
if (typeof location !== "undefined" && location.hash.includes("debug=1")) {
    (window as unknown as { __game?: unknown }).__game = activity.debugState;
    // Debug-only teleport (QA routes; #debug=1): place the ship at a given
    // position/heading without disturbing the simulation.
    (window as unknown as { __teleport?: unknown }).__teleport = activity.teleport;
}
const pointerInput = activity.pointerInput;
const drawFn = activity.draw;
const setAutopilot = activity.setAutopilot;
let animationID = -1;
const clock = new SimClock();

function animation(millis: number) {
    const drawTime = clock.drawTime(millis);
    if (clock.skippedWarning) {
        console.warn(clock.skippedWarning);
        clock.skippedWarning = null;
    }
    if (clock.shouldDraw()) drawFn(drawTime, canvasContext, helper);
    clock.consumeRedraw();
    keepPauseButtonClear();
    animationID = requestAnimationFrame(animation);
}

document.getElementById("loading")!.hidden = true;

function onCanvasResize() {
    const clientRect = canvas.getBoundingClientRect();
    canvas.width = Math.round(clientRect.width * window.devicePixelRatio);
    canvas.height = Math.round(clientRect.height * window.devicePixelRatio);
    clock.needRedraw = true;
    keepPauseButtonClear();
}

canvas.hidden = false;
function enableTouch() {
    canvas.addEventListener("touchstart", pointerInput);
    canvas.addEventListener("touchmove", pointerInput);
    canvas.addEventListener("touchend", pointerInput);
    canvas.addEventListener("touchcancel", pointerInput);
    canvas.addEventListener("pointerdown", pointerInput);
    canvas.addEventListener("pointermove", pointerInput);
    canvas.addEventListener("pointerup", pointerInput);
    canvas.addEventListener("pointercancel", pointerInput);
    canvas.addEventListener("dblclick", pointerInput);
    canvas.addEventListener("contextmenu", pointerInput);
}
function disableTouch() {
    canvas.removeEventListener("touchstart", pointerInput);
    canvas.removeEventListener("touchmove", pointerInput);
    canvas.removeEventListener("touchend", pointerInput);
    canvas.removeEventListener("touchcancel", pointerInput);
    canvas.removeEventListener("pointerdown", pointerInput);
    canvas.removeEventListener("pointermove", pointerInput);
    canvas.removeEventListener("pointerup", pointerInput);
    canvas.removeEventListener("pointercancel", pointerInput);
    canvas.removeEventListener("dblclick", pointerInput);
    canvas.removeEventListener("contextmenu", pointerInput);
}
enableTouch();

function updateAutopilotButton() {
    if (getIsBaklava() && !controlsShow) {
        autopilotButton.classList.add("controls-show");
    } else {
        autopilotButton.classList.remove("controls-show");
    }
}

function setAutoPilotState(newState: boolean) {
    setAutopilot(newState);
    if (newState) {
        autopilotButton.classList.add("autopilot-button-selected");
    } else {
        autopilotButton.classList.remove("autopilot-button-selected");
    }
}

autopilotButton.addEventListener("click", function () {
    setAutoPilotState(!autopilotButton.classList.contains("autopilot-button-selected"));
    setDynamicZoom(autopilotButton.classList.contains("autopilot-button-selected"));
    showControlsNoHide();
});

function hideControls() {
    controlsShow = false;
    activity.setControlsShow(false);
    zoomSelect.removeEventListener("blur", showControlsAutoHide);
    zoomSelect.blur();
    clearInterval(controlsInterval);
    controlsContainer.classList.remove("controls-show");
    updateAutopilotButton();
}

function showControlsNoHide() {
    controlsShow = true;
    activity.setControlsShow(true);
    controlsContainer.classList.add("controls-show");
    updateAutopilotButton();
}

function showControlsAutoHide() {
    showControlsNoHide();
    clearInterval(controlsInterval);
    controlsInterval = setInterval(hideControls, 2000);
}

zoomSelect.addEventListener("focus", showControlsAutoHide);
zoomSelect.addEventListener("blur", showControlsAutoHide);
zoomSelect.addEventListener("change", showControlsAutoHide);

function handleZoom(e: TouchEvent) {
    if (!isTwoFingerDown) {
        if (e.type === "touchstart" && e.touches.length === 2) {
            isTwoFingerDown = true;
            const dx = e.touches[1].clientX - e.touches[0].clientX;
            const dy = e.touches[1].clientY - e.touches[0].clientY;
            downZoom = getCamZoom();
            downDistance = Math.sqrt(dx * dx + dy * dy);
            e.preventDefault();
            showControlsNoHide();
        }
    } else {
        if (e.type === "touchstart") {
            if (e.touches.length !== 2) {
                isTwoFingerDown = false;
                showControlsAutoHide();
            }
        } else if (e.type === "touchend" || e.type === "touchcancel") {
            isTwoFingerDown = false;
            showControlsAutoHide();
        } else if (e.type === "touchmove") {
            const dx = e.touches[1].clientX - e.touches[0].clientX;
            const dy = e.touches[1].clientY - e.touches[0].clientY;
            const newDistance = Math.sqrt(dx * dx + dy * dy);
            if (manualZoom) {
                setCamZoom(downZoom * newDistance / downDistance);
                clock.needRedraw = true;
            }
            e.preventDefault();
        }
    }
}

canvas.addEventListener("touchstart", handleZoom);
canvas.addEventListener("touchmove", handleZoom);
canvas.addEventListener("touchend", handleZoom);
canvas.addEventListener("touchcancel", handleZoom);

function handleWheel(e: WheelEvent) {
    if (manualZoom) {
        setCamZoom(getCamZoom() * (1 - e.deltaY / 1000));
        clock.needRedraw = true;
    }
    showControlsAutoHide();
}

document.addEventListener("wheel", handleWheel);

const pauseCheck = document.getElementById("pauseCheck") as HTMLInputElement;
pauseCheck.checked = false;
function onPauseCheck() {
    if (pauseCheck.checked) {
        clock.pause(performance.now());
        disableTouch();
    } else {
        clock.resume(performance.now());
        enableTouch();
    }
    showControlsAutoHide();
}
pauseCheck.addEventListener("change", onPauseCheck);

const speedButton = document.getElementById("speedButton")!;
speedButton.textContent = "1x";
speedButton.addEventListener("click", initSpeedControl((newSpeed: number, text: string) => {
    if (newSpeed === 0) {
        if (!pauseCheck.checked) {
            pauseCheck.checked = true;
            onPauseCheck();
        }
        return;
    }
    speedButton.textContent = text + "x";
    clock.setSpeed(newSpeed, performance.now());
    setPlaySpeed(newSpeed);
}));

// Player-facing pause: a styled button in the top-right corner that stops the
// game and opens a full-screen frosted pause menu (Continue, Settings, Exit).
// No seed or debug controls. Settings and Exit are placeholders for now.
const pauseButton = document.getElementById("pauseButton") as HTMLButtonElement;
const pauseMenu = document.getElementById("pauseMenu") as HTMLDivElement;
const pauseContinue = document.getElementById("pauseContinue") as HTMLButtonElement;
const pauseSettings = document.getElementById("pauseSettings") as HTMLButtonElement;
const pauseExit = document.getElementById("pauseExit") as HTMLButtonElement;

function setPlayerPaused(paused: boolean) {
    if (paused) {
        clock.pause(performance.now());
        disableTouch();
        pauseMenu.hidden = false;
        pauseMenu.classList.add("pause-open");
        spawnPausePulseChain();
    } else {
        pauseMenu.classList.remove("pause-open");
        pauseMenu.hidden = true;
        clearPausePulseTimers();
        // Drop any pulses still animating; the menu fades out anyway.
        pauseMenu.querySelectorAll(".pause-pulse").forEach((p) => p.remove());
        clock.resume(performance.now());
        enableTouch();
    }
}

// Atmosphere: while paused, soft white pulses breathe across the screen with
// an ordered rhythm, not wild randomness: there is ALWAYS at least one pulse
// alive; the next one is born around the middle of the current pulse's life
// (not at its start, not at its end) in a random place. Sometimes an
// independent second pulse overlaps it, so two can coexist in different
// states. Everything is cleared on resume.
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let pausePulseTimers: number[] = [];
function clearPausePulseTimers() {
    pausePulseTimers.forEach((t) => clearTimeout(t));
    pausePulseTimers = [];
}
function spawnPausePulse(durationSec: number) {
    const pulse = document.createElement("div");
    pulse.className = "pause-pulse";
    const size = 200 + Math.random() * 420;
    // The center may drift past the edges so blobs can be partly off-screen.
    const x = Math.random() * (window.innerWidth + size * 0.8) - size * 0.9;
    const y = Math.random() * (window.innerHeight + size * 0.8) - size * 0.9;
    pulse.style.width = pulse.style.height = size + "px";
    pulse.style.left = x + "px";
    pulse.style.top = y + "px";
    pulse.style.animationDuration = durationSec.toFixed(2) + "s";
    pulse.style.setProperty("--pulse-max", (0.5 + Math.random() * 0.5).toFixed(2));
    pulse.addEventListener("animationend", () => pulse.remove());
    pauseMenu.appendChild(pulse);
}
function spawnPausePulseChain() {
    if (reducedMotion || !pauseMenu.classList.contains("pause-open")) return;
    const duration = 2.2 + Math.random() * 1.4; // seconds
    spawnPausePulse(duration);
    // The next pulse is born mid-life of this one, keeping the screen alive.
    pausePulseTimers.push(window.setTimeout(spawnPausePulseChain, duration * 1000 * (0.45 + Math.random() * 0.2)));
    // Occasionally an overlapping second pulse in another spot.
    if (Math.random() < 0.35) {
        pausePulseTimers.push(window.setTimeout(() => {
            if (pauseMenu.classList.contains("pause-open")) spawnPausePulse(1.8 + Math.random() * 1.2);
        }, duration * 1000 * (0.3 + Math.random() * 0.3)));
    }
}

// Layout guarantee: the pause button must never sit on top of the telemetry
// text. Only the FIRST telemetry line can reach the top-right corner (the
// rest of the block grows downward), so the button slides just below that
// line when they would collide, with a proper margin. Otherwise it rests at
// its normal position, cleared by the phone safe-area inset (P04-T03).
const PAUSE_BUTTON_TOP_PX = 14;
const COLLISION_MARGIN_PX = 8;

/** Pixel height of the phone safe-area inset at the top (env() via :root var). */
function safeAreaTopPx(): number {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--safe-top");
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
}

let lastPauseButtonTop = -1;
function keepPauseButtonClear() {
    const topText = document.getElementById("topText");
    if (!topText) return;
    const lineRange = document.createRange();
    lineRange.selectNodeContents(topText);
    const lineRects = Array.from(lineRange.getClientRects());
    // The first line is what could ever overlap a top-right button.
    const firstLine = lineRects.length > 0 ? lineRects[0] : topText.getBoundingClientRect();
    const buttonBox = pauseButton.getBoundingClientRect();
    const firstLineBottom = firstLine.bottom + 8; // container margin (8px)
    const overlaps =
        firstLine.right + COLLISION_MARGIN_PX > buttonBox.left &&
        firstLine.left < buttonBox.right &&
        firstLineBottom + COLLISION_MARGIN_PX > buttonBox.top &&
        firstLine.top < buttonBox.bottom;
    const top = overlaps ? (firstLineBottom + COLLISION_MARGIN_PX) : PAUSE_BUTTON_TOP_PX + safeAreaTopPx();
    // Only touch the style when the value actually changes: rewriting it every
    // frame makes the button permanently "unstable" for clicks and wastes layout.
    if (top !== lastPauseButtonTop) {
        lastPauseButtonTop = top;
        pauseButton.style.top = top + "px";
    }
}

pauseButton.addEventListener("click", function () {
    // Toggle: if the menu is closed (hidden) we pause; if it is open we resume.
    setPlayerPaused(pauseMenu.hidden);
});

// Keyboard P / Escape reaches the same pause toggle through the action layer.
inputLayer.setEdgeHandler("pause", function () {
    pauseButton.click();
});

// Boost burner (user 2026-11-08): only engages at/above the 4000 cruise cap;
// while held the cap rises to 6000 and the camera pulls back 2x past base
// with fisheye edge distortion. Two modes, auto-detected by press duration:
//  - HOLD (>250 ms): boost until released; releasing turns it off.
//  - TAP (≤250 ms): toggles boost on/off until the next tap.
// Toggle mode auto-disengages if velocity drops below 3500 (below cap - hysteresis).
const boostButton = document.getElementById("boostButton") as HTMLButtonElement;
let boostHeld = false;
let boostKnownVelocity = 0;
let boostToggleOn = false;
let pressStartedAt = 0;
let boostMode: "none" | "hold" | "tap" = "none";

function currentShipVelocity(): number {
    const text = document.getElementById("bottomText")?.textContent ?? "";
    const m = /VEL:\s*(\d+)/.exec(text);
    return m ? Number(m[1]) : boostKnownVelocity;
}

function syncBoost() {
    const vel = currentShipVelocity();
    boostKnownVelocity = vel;
    // toggle mode cancels if the ship slows below the hysteresis floor
    if (boostToggleOn && vel < UniverseConst.CRAFT_SPEED_LIMIT - 500) {
        boostToggleOn = false;
    }
    const atCap = vel >= UniverseConst.CRAFT_SPEED_LIMIT - 1;
    boostButton.disabled = !atCap;
    // HOLD engaged while the finger stays down past 300 ms; TAP engaged
    // while the toggle state is on.
    const holdEngaged = boostHeld && (performance.now() - pressStartedAt) > 300 && atCap;
    const engaged = holdEngaged || (boostToggleOn && atCap);
    boostButton.classList.toggle("engaged", engaged);
    activity.setBoost(engaged);
}
function pressBoost() {
    boostHeld = true;
    pressStartedAt = performance.now();
    boostButton.classList.add("held");
    syncBoost();
}
function releaseBoost() {
    const wasTap = boostHeld && (performance.now() - pressStartedAt) <= 300;
    boostHeld = false;
    boostMode = "none";
    boostButton.classList.remove("held");
    if (wasTap) {
        // quick tap → flip the toggle (stays until the next tap or slow-down)
        boostToggleOn = !boostToggleOn;
    }
    syncBoost();
}
boostButton.addEventListener("pointerdown", (e) => { e.preventDefault(); pressBoost(); });
boostButton.addEventListener("pointerup", releaseBoost);
boostButton.addEventListener("pointercancel", releaseBoost);
boostButton.addEventListener("pointerleave", releaseBoost);
boostButton.addEventListener("click", (e) => e.preventDefault());
// sync every frame so the disabled state tracks the cruise cap
setInterval(syncBoost, 200);

pauseContinue.addEventListener("click", function () {
    setPlayerPaused(false);
});

// Placeholders (later phase): settings menu, exit to main menu.
pauseSettings.addEventListener("click", function () {
    showControlsNoHide();
});

pauseExit.addEventListener("click", function () {
    showControlsNoHide();
});

setTimeout(function () {
    onCanvasResize();
    new ResizeObserver(onCanvasResize).observe(canvas);
    setTimeout(() => animationID = requestAnimationFrame(animation), 0);
}, 0);
