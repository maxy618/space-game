/**
 * Determinism tests for the procedural universe.
 *
 * The whole game relies on stable seeds: the same seed must always produce
 * the same random sequence, the same star system, and the same planet layout.
 * These tests lock that contract in.
 */
import { describe, it, expect } from "vitest";
import { XorWowRandom } from "../src/core/XorWowRandom";
import { newRandom } from "../src/core/RandomKt";
import { Namer } from "../src/core/Namer";
import { Universe } from "../src/universe/Universe";

describe("XorWowRandom determinism", () => {
    it("produces the identical signed-int sequence for identical seeds", () => {
        const a = new XorWowRandom(123, 456);
        const b = new XorWowRandom(123, 456);
        const seqA: number[] = [];
        const seqB: number[] = [];
        for (let i = 0; i < 100; i++) {
            seqA.push(a.intSigned());
            seqB.push(b.intSigned());
        }
        expect(seqA).toEqual(seqB);
    });

    it("produces the identical unsigned-int sequence for identical seeds", () => {
        const a = new XorWowRandom(0, 1);
        const b = new XorWowRandom(0, 1);
        for (let i = 0; i < 50; i++) {
            expect(a.int()).toBe(b.int());
        }
    });

    it("produces different sequences for different seeds", () => {
        const a = new XorWowRandom(1, 2);
        const b = new XorWowRandom(3, 4);
        const seqA: number[] = [];
        const seqB: number[] = [];
        for (let i = 0; i < 20; i++) {
            seqA.push(a.intSigned());
            seqB.push(b.intSigned());
        }
        expect(seqA).not.toEqual(seqB);
    });

    it("accepts a (0, 0) seed because ~0 = -1 keeps state[4] non-zero, and stays deterministic", () => {
        // Faithful to Kotlin's XorWowRandom: the all-zero check is on the state
        // (state[4] = seed1.inv()), so a (0,0) seed is valid, not rejected.
        const a = new XorWowRandom(0, 0);
        const b = new XorWowRandom(0, 0);
        for (let i = 0; i < 20; i++) {
            expect(a.intSigned()).toBe(b.intSigned());
        }
    });

    it("newRandom splits a bigint seed deterministically into two 32-bit words", () => {
        const seed = 0x123456789abcdef0n;
        const expected1 = Number(seed & 0xffffffffn);
        const expected2 = Number((seed >> 32n) & 0xffffffffn);
        const viaNewRandom = newRandom(seed);
        const direct = new XorWowRandom(expected1, expected2);
        for (let i = 0; i < 30; i++) {
            expect(viaNewRandom.intSigned()).toBe(direct.intSigned());
        }
    });
});

describe("Universe determinism", () => {
    it("initTest creates an identical planet layout on every run", () => {
        const a = new Universe(new Namer(), 1n);
        const b = new Universe(new Namer(), 1n);
        a.initTest();
        b.initTest();

        expect(a.planets.length).toBe(b.planets.length);
        for (let i = 0; i < a.planets.length; i++) {
            const pa = a.planets[i];
            const pb = b.planets[i];
            expect(pa.name).toBe(pb.name);
            expect(pa.radius).toBe(pb.radius);
            expect(pa.pos.x).toBe(pb.pos.x);
            expect(pa.pos.y).toBe(pb.pos.y);
            expect(pa.speed).toBe(pb.speed);
            expect(pa.mass).toBe(pb.mass);
        }
        expect(a.star.name).toBe(b.star.name);
        expect(a.star.radius).toBe(b.star.radius);
        expect(a.ship.pos.x).toBe(b.ship.pos.x);
        expect(a.ship.pos.y).toBe(b.ship.pos.y);
    });

    it("initRandom generates an identical system for an identical fixed seed", () => {
        const seed = 123456789n;
        const a = new Universe(new Namer(), seed);
        const b = new Universe(new Namer(), seed);
        a.initRandom();
        b.initRandom();

        expect(a.star.name).toBe(b.star.name);
        expect(a.star.radius).toBe(b.star.radius);
        expect(a.planets.length).toBe(b.planets.length);
        for (let i = 0; i < a.planets.length; i++) {
            const pa = a.planets[i];
            const pb = b.planets[i];
            expect(pa.name).toBe(pb.name);
            expect(pa.radius).toBe(pb.radius);
            expect(pa.pos.x).toBe(pb.pos.x);
            expect(pa.pos.y).toBe(pb.pos.y);
            expect(pa.speed).toBe(pb.speed);
            expect(pa.mass).toBe(pb.mass);
            expect(pa.orbitCenter.x).toBe(pb.orbitCenter.x);
            expect(pa.orbitCenter.y).toBe(pb.orbitCenter.y);
        }
    });

    it("different fixed seeds generate different systems", () => {
        const a = new Universe(new Namer(), 1n);
        const b = new Universe(new Namer(), 2n);
        a.initRandom();
        b.initRandom();

        const layoutA = a.planets.map((p) => `${p.name}:${p.pos.x}:${p.pos.y}`).join("|");
        const layoutB = b.planets.map((p) => `${p.name}:${p.pos.x}:${p.pos.y}`).join("|");
        // It would be extremely unlikely (though not impossible) for two seeds
        // to collide; assert the star names differ at minimum.
        const different =
            layoutA !== layoutB || a.star.name !== b.star.name || a.star.radius !== b.star.radius;
        expect(different).toBe(true);
    });
});
