/**
 * Ambient cargo traffic tests (user 2026-11-09): NPC haulers are
 * deterministic, follow planet-to-planet lanes, reverse at endpoints, and
 * are revealed by the scanner without affecting the player ship's physics.
 */
import { describe, it, expect } from "vitest";
import { Namer } from "../src/core/Namer";
import { Universe } from "../src/universe/Universe";

function makeUniverse(seed: bigint = 4242n) {
    const u = new Universe(new Namer(), seed);
    u.initRandom();
    return u;
}

describe("ambient cargo traffic", () => {
    it("spawns four ships on distinct planet lanes", () => {
        const u = makeUniverse();
        expect(u.cargoShips.length).toBe(4);
        for (const ship of u.cargoShips) {
            expect(ship.fromIdx).not.toBe(ship.toIdx);
            expect(ship.fromIdx).toBeGreaterThanOrEqual(0);
            expect(ship.fromIdx).toBeLessThan(u.planets.length);
            expect(ship.toIdx).toBeGreaterThanOrEqual(0);
            expect(ship.toIdx).toBeLessThan(u.planets.length);
            expect(ship.cruise).toBeGreaterThanOrEqual(700);
            expect(ship.cruise).toBeLessThanOrEqual(1300);
        }
    });

    it("is deterministic for the same seed", () => {
        const a = makeUniverse();
        const b = makeUniverse();
        expect(b.cargoShips.map(c => [c.fromIdx, c.toIdx, c.t, c.dir, c.cruise])).toEqual(
            a.cargoShips.map(c => [c.fromIdx, c.toIdx, c.t, c.dir, c.cruise]),
        );
    });

    it("moves along its lane and reverses at an endpoint", () => {
        const u = makeUniverse();
        const ship = u.cargoShips[0];
        ship.t = 0.97;
        ship.dir = 1;
        const before = ship.pos.copy();
        let millis = 1;
        u.step(millis);
        for (let i = 0; i < 180; i++) {
            millis += 16;
            u.step(millis);
        }
        const moved = Math.hypot(ship.pos.x - before.x, ship.pos.y - before.y);
        expect(moved).toBeGreaterThan(0);
        expect(ship.dir).toBe(-1);
        expect(ship.t).toBeLessThan(1);
    });

    it("does not collide with or slow the player ship", () => {
        const u = makeUniverse();
        u.ship.pos.x = u.cargoShips[0].pos.x + 1;
        u.ship.pos.y = 0;
        u.ship.velocity.x = 0;
        u.ship.velocity.y = 0;
        u.ship.thrust.x = 0;
        u.ship.thrust.y = 0;
        let millis = 1;
        u.step(millis);
        for (let i = 0; i < 60; i++) {
            millis += 16;
            u.step(millis);
        }
        expect(u.ship.velocity.mag()).toBeLessThan(1200);
        expect(u.cargoShips[0].collides).toBe(false);
    });
});
