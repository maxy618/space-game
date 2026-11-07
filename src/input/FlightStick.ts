/*
 * FlightStick — on-canvas joystick input widget.
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
 *
 * Extracted from the Android reference MainActivity (P03-T03 boundary
 * extraction): input handling lives in its own module and exposes a narrow
 * interface — a pointer handler and a draw callback — with no coupling to
 * the universe, renderer or game state.
 */

import { CanvasHelper } from "../core/CanvasHelper";

const PI = Math.PI;
const atan2 = Math.atan2;
const cos = Math.cos;
const max = Math.max;
const min = Math.min;
const sin = Math.sin;
const sqrt = Math.sqrt;

export function FlightStick(
    minRadius: number,
    maxRadius: number,
    color: string,
    onStickChanged: (x: number, y: number, isDown: boolean) => void
) {
    let originX: number;
    let originY: number;
    let targetX: number;
    let targetY: number;
    let isDown: boolean = false;
    let isDownTouch: boolean = false;

    function pointerInput(e: Event) {
        if (!isDown) {
            if (e.type === "touchstart") {
                if ((e as TouchEvent).touches.length === 1) {
                    const touch = (e as TouchEvent).touches[0];
                    originX = targetX = touch.clientX * window.devicePixelRatio;
                    originY = targetY = touch.clientY * window.devicePixelRatio;
                    isDown = true;
                    isDownTouch = true;
                    e.preventDefault();
                }
            } else if (e.type === "pointerdown") {
                originX = targetX = (e as PointerEvent).clientX * window.devicePixelRatio;
                originY = targetY = (e as PointerEvent).clientY * window.devicePixelRatio;
                isDown = true;
                isDownTouch = (e as PointerEvent).pointerType === "touch";
                e.preventDefault();
                try {
                    (e.target as Element).setPointerCapture((e as PointerEvent).pointerId);
                } catch {
                    // Pointer capture can fail for inactive pointers (synthetic events in tests,
                    // or real edge cases); the game logic must continue without capture.
                }
            } else if (e.type === "dblclick") {
                originX = targetX = (e as MouseEvent).clientX * window.devicePixelRatio;
                originY = targetY = (e as MouseEvent).clientY * window.devicePixelRatio;
                isDown = true;
            }
        } else {
            if (e.type === "touchend" || e.type === "touchcancel" || e.type === "pointerup" || e.type === "pointercancel" || e.type === "dblclick") {
                isDown = false;
                onStickChanged(0, 0, false);
            } else if (e.type === "touchmove") {
                const touch = (e as TouchEvent).touches[0];
                targetX = touch.clientX * window.devicePixelRatio;
                targetY = touch.clientY * window.devicePixelRatio;
                onStickChanged(targetX - originX, targetY - originY, true);
                e.preventDefault();
            } else if (e.type === "pointermove") {
                targetX = (e as PointerEvent).clientX * window.devicePixelRatio;
                targetY = (e as PointerEvent).clientY * window.devicePixelRatio;
                onStickChanged(targetX - originX, targetY - originY, true);
                e.preventDefault();
            } else if (e.type === "touchstart") {
                if ((e as TouchEvent).touches.length > 1) {
                    isDown = false;
                    onStickChanged(0, 0, false);
                }
            } else if (e.type === "contextmenu" && !isDownTouch) {
                isDown = false;
                onStickChanged(0, 0, false);
            }
        }
    }
    return {
        pointerInput: pointerInput,
        draw: (context: CanvasRenderingContext2D, helper: CanvasHelper) => {
            if (isDown) {
                const deltaX = targetX - originX;
                const deltaY = targetY - originY;
                const mag = min(maxRadius, sqrt(deltaX * deltaX + deltaY * deltaY));
                const r = max(minRadius, mag);
                const a = atan2(deltaY, deltaX);
                context.strokeStyle = color;
                context.lineWidth = 2;
                if (mag < minRadius) {
                    const density = window.devicePixelRatio;
                    context.setLineDash([density, density * 2]);
                }
                context.beginPath();
                context.arc(originX, originY, r, 0, PI * 2);
                context.stroke();
                helper.clearLineDash();
                context.beginPath();
                context.moveTo(originX, originY);
                context.lineTo(originX + cos(a) * mag, originY + sin(a) * mag);
                context.stroke();
            }
        }
    };
}
