/**
 * P03-T02 deterministic domain layer tests:
 * stable IDs, seeded runtime RNG, serialization round-trip and
 * order-independence of save/restore.
 */
import { describe, it, expect } from "vitest";
import { Namer } from "../src/core/Namer";
import { Universe } from "../src/universe/Universe";

/** Advance a universe by `frames` steps of `dtMs` wall milliseconds. */
function runSteps(u: Universe, frames: number, dtMs: number) {
    let millis = 1; // non-zero: the first call only arms the wall clock
    u.step(millis);
    for (let i = 0; i < frames; i++) {
        millis += dtMs;
        u.step(millis);
    }
}

describe("P03-T02 stable IDs", () => {
    it("assigns deterministic ids: star=0, planets=1..N (creation order), ship=1000", () => {
        const a = new Universe(new Namer(), 42n);
        a.initRandom();
        expect(a.star.id).toBe(0);
        expect(a.ship.id).toBe(1000);
        const ids = a.planets.map(p => p.id).sort((x, y) => x - y);
        for (let i = 0; i < ids.length; i++) {
            expect(ids[i]).toBe(i + 1);
        }
    });

    it("initTest assigns the same id scheme", () => {
        const a = new Universe(new Namer(), 1n);
        a.initTest();
        expect(a.star.id).toBe(0);
        expect(a.ship.id).toBe(1000);
        expect(a.planets.map(p => p.id).sort((x, y) => x - y)).toEqual(
            a.planets.map((_, i) => i + 1).sort((x, y) => x - y)
        );
    });
});

describe("P03-T02 serialization", () => {
    it("same seed + same steps produce byte-identical serialized state", () => {
        const a = new Universe(new Namer(), 777n);
        a.initRandom();
        const b = new Universe(new Namer(), 777n);
        b.initRandom();
        runSteps(a, 120, 16);
        runSteps(b, 120, 16);
        expect(a.serialize()).toBe(b.serialize());
    });

    it("round-trip preserves full simulation state", () => {
        const a = new Universe(new Namer(), 777n);
        a.initRandom();
        runSteps(a, 120, 16);
        const json = a.serialize();
        const b = Universe.deserialize(new Namer(), json);

        expect(b.now).toBe(a.now);
        expect(b.planets.length).toBe(a.planets.length);
        for (let i = 0; i < a.planets.length; i++) {
            const pa = a.planets[i];
            const pb = b.planets[i];
            expect(pb.id).toBe(pa.id);
            expect(pb.name).toBe(pa.name);
            expect(pb.explored).toBe(pa.explored);
            expect(pb.pos.x).toBe(pa.pos.x);
            expect(pb.pos.y).toBe(pa.pos.y);
            expect(pb.speed).toBe(pa.speed);
        }
        expect(b.ship.id).toBe(a.ship.id);
        expect(b.ship.pos.x).toBe(a.ship.pos.x);
        expect(b.ship.pos.y).toBe(a.ship.pos.y);
        expect(b.ship.velocity.x).toBe(a.ship.velocity.x);
        expect(b.ship.velocity.y).toBe(a.ship.velocity.y);
        expect(b.ship.angle).toBe(a.ship.angle);
    });

    it("restored universe continues simulation bit-identically (order independence)", () => {
        const a = new Universe(new Namer(), 777n);
        a.initRandom();
        runSteps(a, 60, 16);
        const b = Universe.deserialize(new Namer(), a.serialize());
        // b's wall clock restarts; arm it, then advance both universes equally
        b.step(1);
        let mA = 1 + 60 * 16;
        let mB = 1;
        for (let i = 0; i < 60; i++) {
            mA += 16;
            mB += 16;
            a.step(mA);
            b.step(mB);
        }
        expect(b.now).toBe(a.now);
        // byte-identical canonical state proves bit-exact parity after restore
        expect(b.serialize()).toBe(a.serialize());
    });

    it("deserialized world keeps player-discovered data (explored flags)", () => {
        const a = new Universe(new Namer(), 777n);
        a.initRandom();
        a.planets[0].explored = true;
        a.planets[0].atmosphere = "thick nitrogen";
        const b = Universe.deserialize(new Namer(), a.serialize());
        expect(b.planets[0].explored).toBe(true);
        expect(b.planets[0].atmosphere).toBe("thick nitrogen");
    });
});
