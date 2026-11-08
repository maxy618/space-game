/**
 * P04-T01 input action abstraction tests:
 * keyboard/mouse/touch feed one device-independent action layer; edge cases
 * (key repeat, focus loss, stuck keys, stick priority) must behave sanely.
 */
import { describe, it, expect } from "vitest";
import { InputActionLayer } from "../src/input/InputActions";

/** Minimal EventTarget double: records listeners, dispatches synchronously. */
class FakeEventTarget {
    private listeners = new Map<string, Array<(e: any) => void>>();
    addEventListener(type: string, listener: (e: any) => void) {
        const list = this.listeners.get(type) ?? [];
        list.push(listener);
        this.listeners.set(type, list);
    }
    removeEventListener(type: string, listener: (e: any) => void) {
        const list = this.listeners.get(type);
        if (list) {
            const i = list.indexOf(listener);
            if (i >= 0) list.splice(i, 1);
        }
    }
    dispatch(type: string, event: any) {
        const list = this.listeners.get(type);
        if (list) for (const l of list) l(event);
    }
}

function keyEvent(code: string, type: "keydown" | "keyup", repeat = false) {
    return { code, type, repeat, preventDefault() {} };
}

function makeLayer() {
    const target = new FakeEventTarget();
    const layer = new InputActionLayer();
    layer.attachKeyboard(target);
    return { target, layer };
}

function press(target: FakeEventTarget, code: string, repeat = false) {
    target.dispatch("keydown", keyEvent(code, "keydown", repeat));
}
function release(target: FakeEventTarget, code: string) {
    target.dispatch("keyup", keyEvent(code, "keyup"));
}

describe("P04-T01 input action layer", () => {
    it("W held gives forward thrust; releasing clears it", () => {
        const { target, layer } = makeLayer();
        press(target, "KeyW");
        expect(layer.resolve().forward).toBe(1);
        release(target, "KeyW");
        expect(layer.resolve().forward).toBe(0);
    });

    it("ArrowUp is an alias for forward", () => {
        const { target, layer } = makeLayer();
        press(target, "ArrowUp");
        expect(layer.resolve().forward).toBe(1);
    });

    it("A/D steer left/right; both pressed cancels to zero", () => {
        const { target, layer } = makeLayer();
        press(target, "KeyA");
        expect(layer.resolve().steer).toBe(-1);
        press(target, "KeyD");
        expect(layer.resolve().steer).toBe(0);
        release(target, "KeyA");
        expect(layer.resolve().steer).toBe(1);
    });

    it("S no longer brakes (W A D only)", () => {
        const { target, layer } = makeLayer();
        press(target, "KeyS");
        expect(layer.resolve().brake).toBe(0);
    });

    it("interact edge fires once per press; key repeat is ignored", () => {
        const { target, layer } = makeLayer();
        press(target, "KeyE");
        expect(layer.consumeEdge("interact")).toBe(true);
        expect(layer.consumeEdge("interact")).toBe(false);
        press(target, "KeyE", true); // auto-repeat must not queue again
        expect(layer.consumeEdge("interact")).toBe(false);
        release(target, "KeyE");
        press(target, "KeyE");
        expect(layer.consumeEdge("interact")).toBe(true);
    });

    it("P and Escape both fire the pause edge", () => {
        const { target, layer } = makeLayer();
        press(target, "KeyP");
        expect(layer.consumeEdge("pause")).toBe(true);
        press(target, "Escape");
        expect(layer.consumeEdge("pause")).toBe(true);
    });

    it("window blur releases all held keys and queued edges (no stuck input)", () => {
        const { target, layer } = makeLayer();
        press(target, "KeyW");
        press(target, "KeyD");
        press(target, "KeyQ"); // scan edge queued
        target.dispatch("blur", { type: "blur" });
        const state = layer.resolve();
        expect(state.forward).toBe(0);
        expect(state.brake).toBe(0);
        expect(state.steer).toBe(0);
        expect(layer.consumeEdge("scan")).toBe(false);
    });

    it("the active stick wins over the keyboard; release returns control", () => {
        const { target, layer } = makeLayer();
        press(target, "KeyW");
        layer.setStick(100, -50, true);
        const state = layer.resolve();
        expect(state.stickActive).toBe(true);
        expect(state.stickX).toBe(100);
        expect(state.stickY).toBe(-50);
        expect(state.forward).toBe(0);
        layer.setStick(0, 0, false);
        const after = layer.resolve();
        expect(after.stickActive).toBe(false);
        expect(after.forward).toBe(1);
    });

    it("fireEdge dispatches to the registered handler immediately", () => {
        const layer = new InputActionLayer();
        let fired = 0;
        layer.setEdgeHandler("pause", () => fired++);
        layer.fireEdge("pause");
        layer.fireEdge("pause");
        expect(fired).toBe(2);
        layer.setEdgeHandler("pause", null);
        layer.fireEdge("pause");
        expect(fired).toBe(2);
        // with no handler the edge lands in the poll queue
        expect(layer.consumeEdge("pause")).toBe(true);
    });
});
