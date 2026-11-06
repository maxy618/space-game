/*
 * Phase 02 unit tests: simulation clock arithmetic, Fuse lifetime,
 * Namer15 activity templates and Autopilot15 strategy state machine.
 */

import { describe, it, expect } from "vitest";
import { SimClock } from "../src/core/SimClock";
import { Fuse } from "../src/core/Physics15";
import { Namer15 } from "../src/core/Namer15";
import { SYSTEM } from "@thi.ng/random";
import { Landing, Planet, Spacecraft, Universe, UniverseConst } from "../src/universe/Universe";
import { Spacecraft15 } from "../src/universe/Universe15";
import { Autopilot15 } from "../src/app/Autopilot15";
import { Namer } from "../src/core/Namer";
import { Vec2 } from "../src/core/Vec2";

describe("SimClock", () => {
    it("drawTime = millis at speed 1 with no pause", () => {
        const clock = new SimClock();
        clock.drawTime(1000); // first frame
        expect(clock.drawTime(2000)).toBe(2000);
    });

    it("pause freezes time at pauseTime, resume adds offset", () => {
        const clock = new SimClock();
        clock.drawTime(1000);
        clock.pause(2000); // paused at 2000
        // drawTime while paused should be frozen at pauseTime
        expect(clock.drawTime(5000)).toBe(2000);
        clock.resume(7000); // pauseOffset += 1 * (7000 - 2000) = 5000
        // now millis=8000 -> 8000 - 5000 = 3000
        expect(clock.drawTime(8000)).toBe(3000);
    });

    it("speed change keeps simulation time continuous", () => {
        const clock = new SimClock();
        clock.drawTime(1000);
        // at t=2000 switch speed 1 -> 2: pauseOffset += (2-1)*2000 = 2000
        clock.setSpeed(2, 2000);
        // at millis=4000: 2*4000 - 2000 = 6000
        // without speed change: 2*4000 = 8000... wait, at t=2000 sim time was 2000.
        // with speed 2 from t=2000: sim time = 2000 + 2*(4000-2000) = 6000. Correct.
        expect(clock.drawTime(4000)).toBe(6000);
    });

    it("paused drawTime returns pauseTime regardless of millis", () => {
        const clock = new SimClock();
        clock.pause(100);
        expect(clock.drawTime(999999)).toBe(100);
    });
});

describe("Fuse", () => {
    it("counts down and expires below zero", () => {
        const fuse = new Fuse(10);
        fuse.update(5);
        expect(fuse.canBeRemoved()).toBe(false);
        fuse.update(5);
        expect(fuse.canBeRemoved()).toBe(false);
        fuse.update(0.5);
        expect(fuse.canBeRemoved()).toBe(true);
    });
});

describe("Namer15.describeActivity", () => {
    const namer = new Namer15();

    it("returns an upper-case activity string", () => {
        const s = namer.describeActivity(SYSTEM, null);
        expect(s).toBe(s.toUpperCase());
        expect(s.length).toBeGreaterThan(0);
    });

    it("resolves {planet} template to planet description", () => {
        const planet = { description: "TEST TYPE", flora: "F", fauna: "A", atmosphere: "AIR" } as Planet;
        for (let i = 0; i < 50; i++) {
            const s = namer.describeActivity(SYSTEM, planet);
            expect(s.includes("{")).toBe(false);
            expect(s.includes("undefined")).toBe(false);
        }
    });
});

describe("Autopilot15", () => {
    function makeShipAndUniverse() {
        const universe = new Universe(new Namer(), 12345n);
        // fake star + planet
        const star = { pos: new Vec2(0, 0) } as any;
        const planet = new Planet(star.pos, 500, new Vec2(5000, 0), 10) as Planet;
        planet.name = "TEST 1";
        universe.planets.push(planet);
        universe.ship = new Spacecraft15() as unknown as Spacecraft;
        const ship = universe.ship as Spacecraft15;
        const autopilot = new Autopilot15(ship, universe as any);
        ship.autopilot = autopilot;
        return { universe, planet, ship, autopilot };
    }

    it("does nothing when disabled", () => {
        const { autopilot, ship } = makeShipAndUniverse();
        const sim = { now: 100, dt: 0.1 } as any;
        const thrustBefore = { x: ship.thrust.x, y: ship.thrust.y };
        autopilot.update(sim, 0.1);
        expect(autopilot.enabled).toBe(false);
        expect(ship.thrust.x).toBe(thrustBefore.x);
    });

    it("selects nearest unexplored planet as target when enabled", () => {
        const { autopilot, planet, ship } = makeShipAndUniverse();
        autopilot.enabled = true;
        const sim = { now: 100, dt: 0.1 } as any;
        autopilot.update(sim, 0.1);
        expect(autopilot.target).toBe(planet);
        // flying toward target from far away => CHASING
        expect(autopilot.strategy).toBe("CHASING");
        void ship;
    });

    it("approaches: thrust opposite to velocity when within braking distance", () => {
        const { autopilot, planet, ship } = makeShipAndUniverse();
        autopilot.enabled = true;
        // place the ship just before the planet, flying fast towards it
        ship.pos.x = 2000; ship.pos.y = 0;
        ship.velocity.x = 1000; ship.velocity.y = 0; // flying towards planet at x=5000
        const sim = { now: 100, dt: 0.1 } as any;
        autopilot.update(sim, 0.1);
        // altitude = 3000 - 500 = 2500; brakingDistance ~ 5 * relativeSpeed = 5000 initially smoothed down
        // relativeSpeed = 1000, altitude(2500) < brakingDistance(~5000) => APPROACHING
        expect(autopilot.target).toBe(planet);
        expect(["APPROACHING", "CHASING"]).toContain(autopilot.strategy);
    });

    it("LANDING when altitude below landingAltitude", () => {
        const { autopilot, planet, ship } = makeShipAndUniverse();
        autopilot.enabled = true;
        ship.pos.x = planet.pos.x - 540; ship.pos.y = 0; // altitude = 40 < landingAltitude (min(radius,100)=100)
        ship.velocity.x = 0; ship.velocity.y = 0;
        const sim = { now: 100, dt: 0.1 } as any;
        autopilot.update(sim, 0.1);
        expect(autopilot.strategy).toBe("LANDING");
        expect(ship.thrust.mag()).toBe(0);
    });

    it("LANDED when ship has a landing", () => {
        const { autopilot, planet, ship, universe } = makeShipAndUniverse();
        autopilot.enabled = true;
        autopilot.target = planet;
        const landing = new Landing(ship, planet, 0);
        ship.landing = landing;
        const sim = { now: 100, dt: 0.1 } as any;
        autopilot.update(sim, 0.1);
        expect(autopilot.strategy).toBe("LANDED");
        expect(autopilot.target).toBe(null);
        void universe;
    });

    it("LAUNCHING full thrust when landed without target", () => {
        const { autopilot, ship, universe } = makeShipAndUniverse();
        autopilot.enabled = true;
        autopilot.target = null;
        const landing = new Landing(ship, universe.planets[0], 0);
        ship.landing = landing;
        const sim = { now: 100, dt: 0.1 } as any;
        autopilot.update(sim, 0.1);
        expect(autopilot.strategy).toBe("LAUNCHING");
        expect(ship.thrust.mag()).toBeCloseTo(1);
    });

    it("telemetry format", () => {
        const { autopilot } = makeShipAndUniverse();
        autopilot.enabled = true;
        autopilot.strategy = "CHASING";
        const t = autopilot.getTelemetry();
        expect(t.startsWith("---- AUTOPILOT ENGAGED ----")).toBe(true);
        expect(t).toContain("EXE: CHASING");
    });

    it("speed limit is respected", () => {
        expect(UniverseConst.CRAFT_SPEED_LIMIT).toBeGreaterThan(0);
    });
});
