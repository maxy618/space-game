/*
 * Device-independent input action layer (P04-T01).
 *
 * Keyboard, mouse/stick and touch all feed ONE action layer; the game
 * consumes resolved actions once per frame. Focus loss and keyup loss
 * release every held input, so no input can get stuck (e.g. a ship that
 * keeps thrusting after a window switch or a lost keyup event).
 *
 * Continuous actions (thrust/brake/steer) are polled per frame via
 * resolve(); edge actions (interact/scan/landLaunch/pause) are queued on
 * press and consumed once, either by a registered handler or by polling.
 */

export type EdgeAction = "interact" | "scan" | "landLaunch" | "pause";

export interface EventTargetLike {
    addEventListener(type: string, listener: (e: Event) => void, options?: boolean | AddEventListenerOptions): void;
    removeEventListener(type: string, listener: (e: Event) => void, options?: boolean | AddEventListenerOptions): void;
}

/** Continuous movement axes resolved once per frame from all sources. */
export interface ContinuousActions {
    /** Stick vector (screen space, device px). Active while pointer is down. */
    stickX: number;
    stickY: number;
    stickActive: boolean;
    /** Forward thrust magnitude 0..1 (keyboard W / ArrowUp). */
    forward: number;
    /** Brake/retro thrust magnitude 0..1 (keyboard S / ArrowDown). */
    brake: number;
    /** Steering axis -1..+1 (keyboard A/D or ArrowLeft/ArrowRight). */
    steer: number;
}

/** Physical-key → hold action mapping (P04-T01, user 2026-11-09: W A D only —
 * S removed; turning is the A/D engines). */
const HOLD_KEYS: Record<string, "forward" | "steerLeft" | "steerRight"> = {
    KeyW: "forward",
    ArrowUp: "forward",
    KeyA: "steerLeft",
    ArrowLeft: "steerLeft",
    KeyD: "steerRight",
    ArrowRight: "steerRight",
};

/** Physical-key → edge action mapping (P04-T01). */
const EDGE_KEYS: Record<string, EdgeAction> = {
    KeyE: "interact",
    KeyQ: "scan",
    KeyL: "landLaunch",
    KeyP: "pause",
    Escape: "pause",
};

/**
 * Tracks held keys and queued edge actions from keyboard events.
 * Windows blur releases everything — a lost keyup can never leave a key stuck.
 */
export class KeyboardSource {
    private held = new Set<string>();
    private edgeQueue: EdgeAction[] = [];
    private listeners: Array<[string, (e: Event) => void]> = [];
    private attachedTo: EventTargetLike | null = null;
    /** Set by the layer: dispatches an edge to its handler or queues it. */
    onEdge: ((action: EdgeAction) => void) | null = null;

    /** Register keyboard listeners on a target (the window in the browser). */
    attach(target: EventTargetLike): void {
        if (this.attachedTo === target) return;
        this.detach();
        const onKeyDown = (e: Event) => {
            const ke = e as KeyboardEvent;
            const edge = EDGE_KEYS[ke.code];
            if (edge) {
                if (!ke.repeat) {
                    if (this.onEdge) this.onEdge(edge);
                    else this.edgeQueue.push(edge);
                }
                return;
            }
            if (HOLD_KEYS[ke.code]) this.held.add(ke.code);
        };
        const onKeyUp = (e: Event) => {
            this.held.delete((e as KeyboardEvent).code);
        };
        // Focus loss releases every held key: keyup events are often lost
        // when a window loses focus (alt-tab, OS overlay, DevTools focus).
        const onBlur = () => this.releaseAll();
        target.addEventListener("keydown", onKeyDown);
        target.addEventListener("keyup", onKeyUp);
        target.addEventListener("blur", onBlur);
        this.listeners = [["keydown", onKeyDown], ["keyup", onKeyUp], ["blur", onBlur]];
        this.attachedTo = target;
    }

    detach(): void {
        if (!this.attachedTo) return;
        for (const [type, listener] of this.listeners) {
            this.attachedTo.removeEventListener(type, listener);
        }
        this.listeners = [];
        this.attachedTo = null;
    }

    /** Clear every held key and queued edge (focus loss / keyup loss). */
    releaseAll(): void {
        this.held.clear();
        this.edgeQueue.length = 0;
    }

    /** Continuous keyboard contribution; active only while keys are held. */
    getState(): { forward: number; brake: number; steer: number; active: boolean } {
        let steer = 0;
        if (this.held.has("KeyD") || this.held.has("ArrowRight")) steer += 1;
        if (this.held.has("KeyA") || this.held.has("ArrowLeft")) steer -= 1;
        const forward = this.held.has("KeyW") || this.held.has("ArrowUp") ? 1 : 0;
        const brake = 0; // S key removed (user 2026-11-09: W A D only)
        return { forward, brake, steer, active: this.held.size > 0 };
    }

    /** Poll a queued edge action (consumed once). */
    consumeEdge(action: EdgeAction): boolean {
        const i = this.edgeQueue.indexOf(action);
        if (i < 0) return false;
        this.edgeQueue.splice(i, 1);
        return true;
    }

    /** Push an edge action programmatically (e.g. from UI buttons). */
    queueEdge(action: EdgeAction): void {
        this.edgeQueue.push(action);
    }
}

/**
 * One action layer fed by every device. The stick wins while it is active
 * (pointer down); the keyboard fills in when it is not.
 */
export class InputActionLayer {
    private readonly keyboard = new KeyboardSource();
    private stickX = 0;
    private stickY = 0;
    private stickActive = false;
    private readonly edgeHandlers = new Map<EdgeAction, () => void>();

    constructor() {
        // Physical key edges flow through the same dispatch path as fireEdge:
        // handler if registered, otherwise polled via consumeEdge().
        this.keyboard.onEdge = (action) => this.fireEdge(action);
    }

    attachKeyboard(target: EventTargetLike): void {
        this.keyboard.attach(target);
    }

    detachKeyboard(): void {
        this.keyboard.detach();
    }

    /** Stick source reports its state (device pixels, screen space). */
    setStick(x: number, y: number, active: boolean): void {
        this.stickX = x;
        this.stickY = y;
        this.stickActive = active;
    }

    /** Dispatch an edge action: handler if registered, otherwise queued. */
    fireEdge(action: EdgeAction): void {
        const handler = this.edgeHandlers.get(action);
        if (handler) handler();
        else this.keyboard.queueEdge(action);
    }

    /** Register (or clear, with null) the handler for an edge action. */
    setEdgeHandler(action: EdgeAction, handler: (() => void) | null): void {
        if (handler) this.edgeHandlers.set(action, handler);
        else this.edgeHandlers.delete(action);
    }

    /** Merge all sources once per frame; the stick wins when it is active. */
    resolve(): ContinuousActions {
        if (this.stickActive) {
            return { stickX: this.stickX, stickY: this.stickY, stickActive: true, forward: 0, brake: 0, steer: 0 };
        }
        const kb = this.keyboard.getState();
        return {
            stickX: 0,
            stickY: 0,
            stickActive: false,
            forward: kb.forward,
            brake: kb.brake,
            steer: kb.steer,
        };
    }

    /** Poll a queued edge action (consumed once). */
    consumeEdge(action: EdgeAction): boolean {
        return this.keyboard.consumeEdge(action);
    }

    /** Release everything (focus loss, pause, etc.). */
    releaseAll(): void {
        this.keyboard.releaseAll();
        this.setStick(0, 0, false);
    }
}
