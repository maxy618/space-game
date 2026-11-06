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
 */

export function initSpeedControl(setSpeed: (speed: number, text: string) => void): (() => void) {
    const maxIntegralPart = 50;
    const INTEGRAL_PAGE_SIZE = 18;
    const speedContainerMask = document.getElementById("speedContainerMask")!;
    const integralDiv = document.getElementById("speedIntegral")!;
    const decimalDiv = document.getElementById("speedDecimal")!;
    const integralButton = document.getElementById("butIntegral")!;
    const decimalButton = document.getElementById("butDecimal")!;
    const integralUpButton = document.createElement("button");
    const integralDownButton = document.createElement("button");
    const integralCloseButton = document.createElement("button");
    const decimalCloseButton = document.createElement("button");
    const integralButtons: HTMLButtonElement[] = Array(INTEGRAL_PAGE_SIZE);
    let integralPart = 1;
    let decimalPart = 0;
    let integralPageOffset = 0;
    let i: number;
    function setIntegralPart(n: number) {
        n += integralPageOffset;
        if (integralPart !== n) {
            integralPart = n;
            integralButton.textContent = String(integralPart);
            setSpeed(integralPart + decimalPart, integralButton.textContent + decimalButton.textContent);
        }
    }
    function setDecimalPart(n: number) {
        const newPart = n / 100;
        if (decimalPart !== newPart) {
            decimalPart = newPart;
            decimalButton.textContent = "." + Math.floor(n / 10) + (n % 10);
            setSpeed(integralPart + decimalPart, integralButton.textContent + decimalButton.textContent);
        }
    }
    function refreshIntegralButton() {
        integralUpButton.disabled = integralPageOffset <= 0;
        integralDownButton.disabled = integralPageOffset + INTEGRAL_PAGE_SIZE >= maxIntegralPart;
    }
    function refreshIntegralButtonText() {
        for (i = 0; i < INTEGRAL_PAGE_SIZE; i++) {
            const button = integralButtons[i];
            const part = i + 1 + integralPageOffset;
            button.textContent = String(part);
        }
    }
    function integralUp() {
        integralPageOffset = Math.max(0, integralPageOffset - INTEGRAL_PAGE_SIZE);
        refreshIntegralButton();
        refreshIntegralButtonText();
    }
    function integralDown() {
        integralPageOffset = Math.min(maxIntegralPart - INTEGRAL_PAGE_SIZE, integralPageOffset + INTEGRAL_PAGE_SIZE);
        refreshIntegralButton();
        refreshIntegralButtonText();
    }
    function closeControl() {
        speedContainerMask.className = "speed-container-hide";
    }
    integralUpButton.addEventListener("click", integralUp);
    integralDownButton.addEventListener("click", integralDown);
    for (i = 0; i < INTEGRAL_PAGE_SIZE; i++) {
        const part = i + 1;
        (integralButtons[i] = document.createElement("button")).addEventListener("click", () => {
            setIntegralPart(part);
            closeControl();
        });
    }
    for (i = 0; i < 100; i += 5) {
        const part = i;
        const button = document.createElement("button");
        button.textContent = "." + Math.floor(part / 10) + (part % 10);
        button.addEventListener("click", () => {
            setDecimalPart(part);
            closeControl();
        });
        decimalDiv.appendChild(button);
        if (part === 25) {
            decimalDiv.appendChild(decimalCloseButton);
        }
    }
    for (i = 0; i < 6; i++) {
        integralDiv.appendChild(integralButtons[i]);
    }
    integralDiv.appendChild(integralCloseButton);
    for (i = 6; i < 12; i++) {
        integralDiv.appendChild(integralButtons[i]);
    }
    integralDiv.appendChild(integralUpButton);
    for (i = 12; i < INTEGRAL_PAGE_SIZE; i++) {
        integralDiv.appendChild(integralButtons[i]);
    }
    integralDiv.appendChild(integralDownButton);
    integralUpButton.textContent = "↑";
    integralDownButton.textContent = "↓";
    integralCloseButton.textContent = "X";
    decimalCloseButton.textContent = "X";
    integralCloseButton.addEventListener("click", closeControl);
    decimalCloseButton.addEventListener("click", closeControl);
    speedContainerMask.addEventListener("click", closeControl);
    return () => {
        speedContainerMask.className = "speed-container-show";
    };
}
