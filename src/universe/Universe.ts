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

import { Deque } from "../core/Deque"
import { Colors } from "../core/Colors";
import { lerp } from "../core/MathHelpers";
import { clamp } from "../core/Maths";
import { Namer } from "../core/Namer";
import { Body, Constraint, Container, Entity, Removable, Simulator } from "../core/Physics";
import { chooseRandom } from "../core/Randomness";
import { Vec2, Vec2_angle, Vec2_copy, Vec2_makeWithAngleMag, Vec2_makeWithAngleMagAdd } from "../core/Vec2";
import { LOG } from "../core/Debug";
import { DEFAULT_SHIP_PROFILE } from "./ShipProfile";

const PI = Math.PI;
const abs = Math.abs;
const pow = Math.pow;
const sqrt = Math.sqrt;

// in kotlin 4/3==1 (Int)
const FOUR_OVER_THREE = 1;

/** Reserved stable id for the player ship (P03-T02 serialization contract). */
const SHIP_STABLE_ID = 1000;

export const enum UniverseConst {
    UNIVERSE_RANGE = 200_000,

    NUM_PLANETS_RANGE_MIN = 1,
    NUM_PLANETS_RANGE_MAX = 10,
    STAR_RADIUS_RANGE_MIN = 1_000,
    STAR_RADIUS_RANGE_MAX = 8_000,
    PLANET_RADIUS_RANGE_MIN = 50,
    PLANET_RADIUS_RANGE_MAX = 2_000,
    PLANET_ORBIT_RANGE_MIN = (STAR_RADIUS_RANGE_MAX * 2),
    PLANET_ORBIT_RANGE_MAX = (UNIVERSE_RANGE * 0.75),

    GRAVITATION = 1e-2,
    KEPLER_CONSTANT = 50, // * 4f * PIf * PIf / GRAVITATION

    // m = d * r
    PLANETARY_DENSITY = 2.5,
    STELLAR_DENSITY = 0.5,

    SPACECRAFT_MASS = 10,

    // Base cruise cap. Boost raises the cap to CRAFT_SPEED_LIMIT_BOOST while
    // engaged (user 2026-11-08). Both are ENGINE caps, not total-velocity
    // caps — see Spacecraft.update.
    CRAFT_SPEED_LIMIT = 4_000,
    CRAFT_SPEED_LIMIT_BOOST = 6_000,

    // Trail (user 2026-11-09): points are recorded per DISTANCE traveled,
    // not per sim step — an even, dashed path. Points EXPIRE BY TIME
    // (TRACK_LIFETIME): while flying, the tail is lifetime × speed behind
    // the ship — always far off-screen, never visibly retracts; when the
    // ship stops, the trail visibly shrinks and vanishes after the
    // lifetime. TRACK_LENGTH is just a memory cap.
    TRACK_LENGTH = 20_000,
    TRACK_SAMPLE_DIST = 50,
    TRACK_LIFETIME = 15, // seconds

    // Ship-only gravity strengthen (user 2026-11-08): the raw Newton term
    // felt weightless at flight speed. The SHIP feels 4x stronger wells
    // (close flybys bend the trajectory), while asteroids keep the original
    // Keplerian calibration so belts and orbits are unchanged.
    SHIP_GRAVITY_MULTIPLIER = 4,
    /**
     * Wish 43 (user 2026-11-09): engines ALWAYS let you climb out of a well.
     * Gravity accel is capped at this fraction of the ship's engine accel, so
     * a straight full-thrust escape is physically possible from anywhere —
     * the pull is still strongly felt, it just stays counterable.
     */
    GRAVITY_THRUST_FRACTION = 0.55,
    MAIN_ENGINE_ACCEL = 1000, // thrust effect, pixels per second squared
    LAUNCH_MECO = 0.6 // how long to suspend gravity when launching (prevents an instant re-land while lifting off)
}

export const SCALED_THRUST = true;

export class Planet extends Body {
    readonly orbitCenter: Vec2;
    radius: number;
    pos: Vec2;
    speed: number;
    color: string;
    atmosphere = "";
    description = "";
    flora = "";
    fauna = "";
    explored = false;
    /** Scanner-revealed (user 2026-11-09): shown on radar without visiting.
     * Saved in v2 (v1 migrates to false). */
    scanned = false;
    // Visual identity seed (P07-T02): stable in [0,1), derived from the
    // system seed. Drives patch tinting — planets differ in structure, not
    // just hue. Deterministic across runs of the same universe seed.
    visualSeed = 0;
    private readonly orbitRadius: number;
    constructor(
        orbitCenter: Vec2,
        radius: number,
        pos: Vec2,
        speed: number,
        color: string = "#FFFFFF"
    ) {
        super();
        this.orbitCenter = orbitCenter;
        this.radius = radius;
        this.pos = pos;
        this.speed = speed;
        this.color = color;
        this.orbitRadius = pos.distance(orbitCenter)
        // in kotlin 4/3==1 (Int)
        this.mass = FOUR_OVER_THREE * PI * radius * radius * radius * UniverseConst.PLANETARY_DENSITY;
    }

    update(sim: Simulator, dt: number) {
        const orbitAngle = Vec2_angle(this.pos, this.orbitCenter);
        // constant linear velocity
        Vec2_makeWithAngleMag(this.velocity, orbitAngle + PI / 2, this.speed);

        super.update(sim, dt);
    }

    postUpdate(sim: Simulator, dt: number) {
        // This is kind of like a constraint, but whatever.
        const orbitAngle = Vec2_angle(this.pos, this.orbitCenter);
        Vec2_makeWithAngleMag(this.pos, orbitAngle, this.orbitRadius)
        this.pos.x += this.orbitCenter.x;
        this.pos.y += this.orbitCenter.y;
        super.postUpdate(sim, dt)
    }
}

export const enum StarClass {
    O,
    B,
    A,
    F,
    G,
    K,
    M
}

export const StarClasses: readonly StarClass[] = Object.freeze([
    StarClass.O,
    StarClass.B,
    StarClass.A,
    StarClass.F,
    StarClass.G,
    StarClass.K,
    StarClass.M
]);

export const StarClassNames: readonly string[] = Object.freeze([
    "O",
    "B",
    "A",
    "F",
    "G",
    "K",
    "M"
]);

function starColor(cls: StarClass): string {
    switch (cls) {
        case StarClass.O: return "#6666FF";
        case StarClass.B: return "#CCCCFF";
        case StarClass.A: return "#EEEEFF";
        case StarClass.F: return "#FFFFFF";
        case StarClass.G: return "#FFFF66";
        case StarClass.K: return "#FFCC33";
        case StarClass.M: return "#FF8800";
    }
}

export class Star extends Planet {
    readonly cls: StarClass;
    radius!: number;
    /** The star's class/name is only known after a scan (user 2026-11-09). */
    scanned = false;
    constructor(cls: StarClass, radius: number) {
        super(Vec2.Zero(), radius, Vec2.Zero(), 0, starColor(cls));
        this.cls = cls;
        // in kotlin 4/3==1 (Int)
        this.mass = FOUR_OVER_THREE * PI * pow(radius, 3) * UniverseConst.STELLAR_DENSITY;
        this.collides = false;
    }
    anim = 0;
    update(sim: Simulator, dt: number) {
        this.anim += dt;
    }
}

export class Asteroid extends Body {
    /** Deterministic visual seed in [0,1): drives the polygon shape. */
    seed = 0;
    /** Spin rate (rad/s), signed. */
    spin = 0;
    /** Regular 9-vertex polygon radii (×radius), shared physics/render. */
    radii: number[] = [];
    /** Revealed by the scanner (radar/info visibility). */
    scanned = false;
    constructor(radius: number) {
        super();
        this.radius = radius;
        this.mass = FOUR_OVER_THREE * PI * radius * radius * radius * (UniverseConst.PLANETARY_DENSITY / 2);
        // collidable (user 2026-11-08): impacts push the ship out, aligned
        // contact lands on the rock like on a planet.
        this.collides = true;
    }
    update(sim: Simulator, dt: number) {
        this.angle += this.spin * dt;
        super.update(sim, dt);
    }
    /** Distance from center to the polygon surface along angle a (world).
     * Must EXACTLY match drawAsteroid (VisibleUniverse15): the rendered
     * vertex is (cos(a)*rr, sin(a)*rr*0.85) — including the 0.85 vertical
     * SQUASH (user 2026-11-09: without it the ship landed on air in Y and
     * dug into the rock where the face is fatter). */
    surfaceDistance(a: number): number {
        const local = a - this.angle;
        const verts = this.radii.length;
        if (verts === 0) return this.radius;
        // local angle in [0, 2π)
        let ang = local % (PI * 2);
        if (ang < 0) ang += PI * 2;
        const step = (PI * 2) / verts;
        const i = Math.floor(ang / step) % verts;
        const a0 = i * step;
        const r0 = this.radius * this.radii[i];
        const r1 = this.radius * this.radii[(i + 1) % verts];
        const t = (ang - a0) / step;
        const rr = r0 + (r1 - r0) * t;
        // squash-aware distance: |(cos, sin*0.85)| * rr
        const sx = Math.cos(ang);
        const sy = Math.sin(ang) * 0.85;
        return rr * Math.sqrt(sx * sx + sy * sy);
    }
    /** World angle of the outward FACE NORMAL at local direction a (world) —
     * the ship stands perpendicular to the face, not to the radius. */
    surfaceNormal(a: number): number {
        const verts = this.radii.length;
        if (verts === 0) return a;
        const local = a - this.angle;
        let ang = local % (PI * 2);
        if (ang < 0) ang += PI * 2;
        const step = (PI * 2) / verts;
        const i = Math.floor(ang / step) % verts;
        const a0 = i * step;
        const a1 = (i + 1) * step;
        const p0 = [Math.cos(a0) * this.radius * this.radii[i], Math.sin(a0) * this.radius * this.radii[i] * 0.85];
        const p1 = [Math.cos(a1) * this.radius * this.radii[(i + 1) % verts], Math.sin(a1) * this.radius * this.radii[(i + 1) % verts] * 0.85];
        // edge direction + outward normal (turn right side away from centroid)
        const ex = p1[0] - p0[0];
        const ey = p1[1] - p0[1];
        let nx = ey;
        let ny = -ex;
        const mid = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
        if (nx * mid[0] + ny * mid[1] < 0) { nx = -nx; ny = -ny; }
        return Math.atan2(ny, nx) + this.angle;
    }
}

export class Universe extends Simulator {
    readonly namer: Namer;
    latestDiscovery: Planet | null = null;
    star!: Star;
    ship!: Spacecraft;
    planets: Array<Planet> = [];
    asteroids: Array<Asteroid> = [];
    follow: Body | null = null;
    ringfence = new Container(UniverseConst.UNIVERSE_RANGE);

    constructor(namer: Namer, randomSeed: bigint) {
        super(randomSeed);
        this.namer = namer;
    }

    initTest() {
        const systemName = "TEST SYSTEM"
        this.star =
            new Star(
                StarClass.A,
                UniverseConst.STAR_RADIUS_RANGE_MAX,
            );
        this.star.name = "TEST SYSTEM";
        this.star.id = 0;

        for (let it = 0; it < UniverseConst.NUM_PLANETS_RANGE_MAX; it++) {
            const thisPlanetFrac = it / (UniverseConst.NUM_PLANETS_RANGE_MAX - 1);
            const radius =
                lerp(UniverseConst.PLANET_RADIUS_RANGE_MIN, UniverseConst.PLANET_RADIUS_RANGE_MAX, thisPlanetFrac);
            const orbitRadius =
                lerp(UniverseConst.PLANET_ORBIT_RANGE_MIN, UniverseConst.PLANET_ORBIT_RANGE_MAX, thisPlanetFrac);

            const period = sqrt(orbitRadius * orbitRadius * orbitRadius / this.star.mass) * UniverseConst.KEPLER_CONSTANT;
            const speed = 2 * PI * orbitRadius / period;

            const p = new Planet(
                this.star.pos.copy(),
                radius,
                Vec2_makeWithAngleMag(Vec2.Zero(), thisPlanetFrac * PI * 2, orbitRadius).addSelf(this.star.pos),
                speed,
                Colors.Eigengrau4
            );
            LOG && console.log(
                "Landroid",
                "created planet", p, "with period", period, "and vel", speed
            );
            const num = it + 1;
            p.id = num; // stable id 1..N, assigned in creation order (pre-sort)
            p.description = "TEST PLANET #" + num;
            p.atmosphere = "radius=" + radius;
            p.flora = "mass=" + p.mass;
            p.fauna = "speed=" + speed;
            this.planets.push(p);
            this.addEntity(p);
        }

        this.planets.sort((a, b) => a.pos.distance(this.star.pos) - b.pos.distance(this.star.pos));
        this.planets.forEach((planet, idx) => planet.name = (systemName + " " + (idx + 1)));
        this.addEntity(this.star);

        this.ship = new Spacecraft();
        this.ship.id = SHIP_STABLE_ID;

        Vec2_makeWithAngleMag(this.ship.pos, PI / 4, UniverseConst.PLANET_ORBIT_RANGE_MIN).addSelf(this.star.pos);
        this.ship.angle = 0;
        this.addEntity(this.ship);

        this.ringfence.add(this.ship);
        this.addConstraint(this.ringfence);

        this.follow = this.ship;
    }

    initRandom() {
        const systemName = this.namer.nameSystem(this.rngForInit);
        this.star = new Star(
            chooseRandom(this.rngForInit, StarClasses),
            this.rngForInit.minmax(UniverseConst.STAR_RADIUS_RANGE_MIN, UniverseConst.STAR_RADIUS_RANGE_MAX)
        );
        this.star.name = systemName;
        this.star.id = 0;
        for (let it = 0, times = this.rngForInit.minmaxInt(UniverseConst.NUM_PLANETS_RANGE_MIN, UniverseConst.NUM_PLANETS_RANGE_MAX + 1); it < times; it++) {
            const radius = this.rngForInit.minmax(UniverseConst.PLANET_RADIUS_RANGE_MIN, UniverseConst.PLANET_RADIUS_RANGE_MAX);
            const orbitRadius =
                lerp(
                    UniverseConst.PLANET_ORBIT_RANGE_MIN,
                    UniverseConst.PLANET_ORBIT_RANGE_MAX,
                    this.rngForInit.float()
                );

            // Kepler's third law
            const period = sqrt(orbitRadius * orbitRadius * orbitRadius / this.star.mass) * UniverseConst.KEPLER_CONSTANT;
            const speed = 2 * PI * orbitRadius / period;

            const p = new Planet(
                this.star.pos,
                radius,
                Vec2_makeWithAngleMag(Vec2.Zero(), this.rngForInit.float() * PI * 2, orbitRadius).addSelf(this.star.pos),
                speed,
                Colors.Eigengrau4
            );
            LOG && console.log(
                "Landroid",
                "created planet", p, "with period", period, "and vel", speed
            );
            p.id = it + 1; // stable id 1..N, assigned in creation order (pre-sort)
            p.visualSeed = this.rngForInit.float(); // deterministic patch seed
            p.description = this.namer.describePlanet(this.rngForInit);
            p.atmosphere = this.namer.describeAtmo(this.rngForInit);
            p.flora = this.namer.describeLife(this.rngForInit);
            p.fauna = this.namer.describeLife(this.rngForInit);
            this.planets.push(p);
            this.addEntity(p);
        }
        this.spawnAsteroids();
        this.planets.sort((a, b) => a.pos.distance(this.star.pos) - b.pos.distance(this.star.pos));
        this.planets.forEach((planet, idx) => planet.name = (systemName + " " + (idx + 1)));
        this.spawnCargoShips();
        this.addEntity(this.star);

        this.ship = new Spacecraft();
        this.ship.id = SHIP_STABLE_ID;

        Vec2_makeWithAngleMag(
            this.ship.pos,
            this.rngForInit.float() * PI * 2,
            this.rngForInit.minmax(UniverseConst.PLANET_ORBIT_RANGE_MIN, UniverseConst.PLANET_ORBIT_RANGE_MAX)
        ).addSelf(this.star.pos);
        this.ship.angle = this.rngForInit.float() * PI * 2;
        this.addEntity(this.ship);

        this.ringfence.add(this.ship);
        this.addConstraint(this.ringfence);

        this.follow = this.ship;
    }

    updateAll(dt: number, entities: Set<Entity>) {
        // check for passing in front of the sun
        this.ship.transit = false;
        const fn = (planet: Planet) => {
            const d = planet.pos.distance(this.ship.pos);
            if (d < planet.radius) {
                if (planet instanceof Star) this.ship.transit = true
            } else if (
                this.now > this.ship.launchClock + UniverseConst.LAUNCH_MECO
            ) { // within MECO sec of launch, no gravity at all
                // simulate gravity: $ f_g = G * m1 * m2 * 1/d^2 $
                // (× SHIP_GRAVITY_MULTIPLIER — ship-only, see UniverseConst)
                // (user 2026-11-09: near-field boost — close to a body the
                // pull grows beyond 1/d² so proximity is FELT; scale-in
                // over the innermost few radii keeps it smooth)
                const closeR = planet instanceof Star ? planet.radius * 6 : planet.radius * 3;
                const k = clamp(1 - d / Math.max(1, closeR), 0, 1);
                const nearBoost = 1 + (planet instanceof Star ? 4 : 1.5) * k;
                // user 2026-11-09 (wish 43): engines ALWAYS let you climb out
                // — gravity may never exceed a fraction of full thrust, so a
                // straight escape burn is physically possible from anywhere.
                // The pull still ramps hard near the surface, it just stops
                // growing past the thrust fraction instead of swallowing the
                // ship with no counterplay.
                const gAccel = UniverseConst.GRAVITATION * UniverseConst.SHIP_GRAVITY_MULTIPLIER * nearBoost * (this.ship.mass * planet.mass) / (d * d);
                const gCap = this.ship.profile.engineAccel * UniverseConst.GRAVITY_THRUST_FRACTION;
                const dvMag = dt * Math.min(gAccel, gCap);
                Vec2_makeWithAngleMagAdd(
                    this.ship.velocity,
                    Vec2_angle(planet.pos, this.ship.pos),
                    dvMag
                );
            }
        }

        this.planets.forEach(fn);
        fn(this.star);

        // Asteroids feel the same gravity (user 2026-11-08): they drift and
        // orbit under the star/planet wells instead of flying in straight lines.
        // Acceleration is G·M/d² (mass-independent, as it should be).
        for (const a of this.asteroids) {
            for (const p of [this.star, ...this.planets]) {
                const d = p.pos.distance(a.pos);
                if (d > p.radius) {
                    Vec2_makeWithAngleMagAdd(
                        a.velocity,
                        Vec2_angle(p.pos, a.pos),
                        dt * UniverseConst.GRAVITATION * p.mass / (d * d)
                    );
                }
            }
        }

        // Keep traffic lanes attached to the orbiting planet endpoints.
        for (const cargo of this.cargoShips) {
            cargo.laneA = this.planets[cargo.fromIdx]?.pos ?? null;
            cargo.laneB = this.planets[cargo.toIdx]?.pos ?? null;
        }

        super.updateAll(dt, entities);
    }

    /**
     * Ambient cargo traffic (user 2026-11-09): 4 haulers on deterministic
     * planet-to-planet lanes. Not saved — regenerated from the world seed.
     */
    cargoShips: CargoShip[] = [];

    spawnCargoShips() {
        if (this.planets.length < 2) return;
        const rng = this.rngForInit;
        const n = 4;
        for (let i = 0; i < n; i++) {
            const ship = new CargoShip();
            ship.id = 3001 + i;
            ship.fromIdx = i % this.planets.length;
            const extraStep = this.planets.length > 2 ? rng.minmaxInt(0, this.planets.length - 2) : 0;
            ship.toIdx = (i + 1 + extraStep) % this.planets.length;
            if (ship.toIdx === ship.fromIdx) ship.toIdx = (ship.fromIdx + 1) % this.planets.length;
            ship.t = rng.float();
            ship.dir = rng.float() < 0.5 ? 1 : -1;
            ship.cruise = rng.minmax(700, 1300);
            ship.laneOffset = rng.minmax(-4000, 4000);
            ship.hue = rng.float() < 0.5 ? "#D8A84E" : "#8FB8D8";
            // Endpoints are attached to planet orbits in updateAll; snap to the
            // starting point so the first frame is not measured from (0,0).
            const a = this.planets[ship.fromIdx].pos;
            const b = this.planets[ship.toIdx].pos;
            const len = Math.hypot(b.x - a.x, b.y - a.y);
            const px = a.x + (b.x - a.x) * ship.t;
            const py = a.y + (b.y - a.y) * ship.t;
            const nx = len > 1 ? -(b.y - a.y) / len : 0;
            const ny = len > 1 ? (b.x - a.x) / len : 0;
            ship.pos.x = px + nx * ship.laneOffset;
            ship.pos.y = py + ny * ship.laneOffset;
            ship.opos.x = ship.pos.x;
            ship.opos.y = ship.pos.y;
            ship.laneA = a;
            ship.laneB = b;
            this.cargoShips.push(ship);
            this.addEntity(ship);
        }
    }

    /**
     * Spawn the asteroid population (user 2026-11-09 redesign): CLUSTERS
     * instead of one uniform ring. 4–6 dense fields (16–30 rocks each,
     * elliptical spread around a seeded center) + 26 scattered loners.
     * Rocks are BIG (260–1400 m) — real maneuvering obstacles, fun to
     * slalom at speed. Tangential Keplerian velocities keep everything
     * orbiting coherently. Stable ids (2001+), not saved (regenerated
     * from the world seed); collisions/landing on rocks work.
     */
    spawnAsteroids() {
        const rng = this.rngForInit;
        let id = 2001;
        const placeRock = (orbitRadius: number, angle: number, small: boolean = false) => {
            // wish 35 (user 2026-11-09): a dedicated layer of SMALL rocks
            // (30–120 m) — the belt read as too empty; tiny debris fills the
            // space around the big maneuvering rocks without replacing them.
            const radius = small ? rng.minmax(30, 120) : rng.minmax(260, 1400);
            const a = new Asteroid(radius);
            a.id = id++;
            a.seed = rng.float();
            a.spin = rng.minmax(-0.6, 0.6);
            const verts = small ? 12 : 9;
            a.radii = Array.from({ length: verts }, () => 0.55 + rng.float() * 0.55);
            Vec2_makeWithAngleMag(a.pos, angle, orbitRadius).addSelf(this.star.pos);
            // circular-orbit velocity (same Keplerians as planets)
            const period = sqrt(orbitRadius * orbitRadius * orbitRadius / this.star.mass) * UniverseConst.KEPLER_CONSTANT;
            const speed = 2 * PI * orbitRadius / period;
            Vec2_makeWithAngleMag(a.velocity, Vec2_angle(a.pos, this.star.pos) + PI / 2, speed);
            this.asteroids.push(a);
            this.addEntity(a);
        };
        // dense maneuvering fields
        const numClusters = 4 + rng.minmaxInt(0, 3); // 4..6
        for (let c = 0; c < numClusters; c++) {
            const centerAngle = rng.float() * PI * 2;
            const centerRad = lerp(60_000, 110_000, rng.float());
            const radSpread = rng.minmax(6_000, 14_000);
            const angSpread = rng.minmax(0.16, 0.34); // arc-length ≈ rad × angSpread
            const rocks = rng.minmaxInt(16, 31); // 16..30
            for (let i = 0; i < rocks; i++) {
                const ang = centerAngle + (rng.float() + rng.float() - 1) * angSpread;
                const rad = centerRad + (rng.float() + rng.float() - 1) * radSpread;
                placeRock(clamp(rad, 45_000, 130_000), ang);
            }
            // small-debris halo: 2-3× the big-rock count, spread wider and
            // full of gaps so they read as dust around the main field
            const pebbles = rng.minmaxInt(34, 72);
            for (let i = 0; i < pebbles; i++) {
                const ang = centerAngle + (rng.float() + rng.float() - 1) * angSpread * 1.6;
                const rad = centerRad + (rng.float() + rng.float() - 1) * radSpread * 1.5;
                placeRock(clamp(rad, 44_000, 132_000), ang, true);
            }
        }
        // scattered loners across the belt
        for (let i = 0; i < 26; i++) {
            placeRock(lerp(60_000, 110_000, rng.float()), rng.float() * PI * 2);
        }
        // scattered small rocks: faint dust arc across the whole belt
        for (let i = 0; i < 40; i++) {
            placeRock(lerp(48_000, 126_000, rng.float()), rng.float() * PI * 2, true);
        }
    }

    closestPlanet(): Planet {
        // allocation-free (user 2026-11-08): the old map+sort created an
        // array of pairs EVERY solve step — pure GC pressure in the hot path
        let best: Planet = this.star;
        let bestDist = this.ship.pos.distance(this.star.pos);
        for (const p of this.planets) {
            const d = this.ship.pos.distance(p.pos);
            if (d < bestDist) { bestDist = d; best = p; }
        }
        return best;
    }

    closestPlanetForZoom(): Planet {
        let best: Planet = this.star;
        let bestScore = this.ship.pos.distance(this.star.pos) - this.star.radius * 1.2;
        for (const p of this.planets) {
            const s = this.ship.pos.distance(p.pos) - p.radius * 1.2;
            if (s < bestScore) { bestScore = s; best = p; }
        }
        return best;
    }

    solveAll(dt: number, constraints: Set<Constraint>) {
        if (this.ship.landing === null) {
            const planet = this.closestPlanet();

            if (planet.collides) {
                const d = (this.ship.pos.distance(planet.pos)) - this.ship.radius - planet.radius;
                const a = Vec2_angle(this.ship.pos, planet.pos);

                if (d < 0) {
                    // landing, or impact?

                    // 1. relative speed
                    const vDiff = (this.ship.velocity.distance(planet.velocity));
                    // 2. landing angle
                    const aDiff = abs(this.ship.angle - a);

                    // landing criteria
                    if (aDiff < PI / 4
                        //                        &&
                        //                        vDiff < 100f
                    ) {
                        const landing = new Landing(this.ship, planet, a);
                        this.ship.landing = landing;
                        Vec2_copy(this.ship.velocity, planet.velocity);
                        this.addConstraint(landing);

                        planet.explored = true;
                        planet.scanned = true; // landing == scanning
                        this.latestDiscovery = planet;
                    } else {
                        const impact = Vec2_makeWithAngleMag(Vec2.Zero(), a, planet.radius).addSelf(planet.pos);
                        Vec2_makeWithAngleMag(this.ship.pos, a, planet.radius + this.ship.radius - d).addSelf(planet.pos);

                        //                        add(Spark(
                        //                            lifetime = 1f,
                        //                            style = Spark.Style.DOT,
                        //                            color = Color.Yellow,
                        //                            size = 10f
                        //                        ).apply {
                        //                            pos = impact
                        //                            opos = impact
                        //                            velocity = Vec2.Zero
                        //                        })
                        //
                        for (let it = 1; it <= 10; it++) {
                            const spark = new Spark(
                                this.rng.minmax(0.5, 2),
                                false,
                                0,
                                SparkStyle.DOT,
                                Colors.White,
                                1
                            );
                            Vec2_makeWithAngleMag(
                                spark.pos,
                                this.rng.minmax(0, 2 * PI),
                                this.rng.minmax(0.1, 0.5)
                            ).addSelf(impact);
                            Vec2_copy(spark.opos, spark.pos);
                            Vec2_makeWithAngleMag(
                                spark.velocity,
                                //                                            a +
                                // rng.nextFloatInRange(-PIf, PIf),
                                this.rng.minmax(0, 2 * PI),
                                this.rng.minmax(0.1, 0.5)
                            );
                            spark.velocity.x += this.ship.velocity.x * 0.8;
                            spark.velocity.y += this.ship.velocity.y * 0.8;
                            this.addEntity(spark);
                        }
                    }
                }
            }
        }

        super.solveAll(dt, constraints)
    }

    postUpdateAll(dt: number, entities: Set<Entity>) {
        super.postUpdateAll(dt, entities);
        this.bounceAsteroidsOffBodies();
        entities.forEach((it: any) => {
            if ((it as Removable).canBeRemoved
                && (it as Removable).canBeRemoved()) {
                entities.delete(it);
            }
        });
    }

    /**
     * Asteroid-rebound (user 2026-11-09): rocks that plunge into a planet
     * or the star are pushed back OUT onto the surface and REBUILT with a
     * reflected velocity (restitution 0.55) — they rebound and fly on a new
     * course instead of passing through. Position and opos are shifted by
     * the same correction so the derived velocity stays smooth.
     */
    private bounceAsteroidsOffBodies() {
        const e = 0.55;
        for (const a of this.asteroids) {
            for (const p of this.planets) {
                const dx = a.pos.x - p.pos.x;
                const dy = a.pos.y - p.pos.y;
                const d = Math.hypot(dx, dy);
                const contact = p.radius + a.radius;
                if (d === 0 || d >= contact) continue;
                const nx = dx / d;
                const ny = dy / d;
                // 1. push out of the surface (pos and opos together)
                const push = contact - d;
                a.pos.x += nx * push;
                a.pos.y += ny * push;
                a.opos.x += nx * push;
                a.opos.y += ny * push;
                // 2. reflect the velocity about the surface normal
                const vn = a.velocity.x * nx + a.velocity.y * ny;
                if (vn < 0) {
                    a.velocity.x -= (1 + e) * vn * nx;
                    a.velocity.y -= (1 + e) * vn * ny;
                }
            }
            // the star: same treatment (it has collides=false, so it is not
            // handled by the generic solver)
            {
                const p = this.star;
                const dx = a.pos.x - p.pos.x;
                const dy = a.pos.y - p.pos.y;
                const d = Math.hypot(dx, dy);
                const contact = p.radius + a.radius;
                if (d === 0 || d >= contact) continue;
                const nx = dx / d;
                const ny = dy / d;
                const push = contact - d;
                a.pos.x += nx * push;
                a.pos.y += ny * push;
                a.opos.x += nx * push;
                a.opos.y += ny * push;
                const vn = a.velocity.x * nx + a.velocity.y * ny;
                if (vn < 0) {
                    a.velocity.x -= (1 + e) * vn * nx;
                    a.velocity.y -= (1 + e) * vn * ny;
                }
            }
        }
    }

    /**
     * Serialize the persistent universe state to JSON (P03-T02).
     * Ephemeral bodies (sparks) are excluded. The planets array order is
     * preserved exactly: floating-point gravity accumulation is order
     * sensitive, so a restored world must replay in the same order.
     */
    serialize(): string {
        const ship = this.ship;
        return JSON.stringify({
            v: 2,
            randomSeed: this.randomSeed.toString(),
            now: this.now,
            star: {
                id: this.star.id,
                name: this.star.name,
                cls: this.star.cls,
                radius: this.star.radius,
                pos: { x: this.star.pos.x, y: this.star.pos.y },
            },
            planets: this.planets.map(p => ({
                id: p.id,
                name: p.name,
                radius: p.radius,
                pos: { x: p.pos.x, y: p.pos.y },
                speed: p.speed,
                color: p.color,
                visualSeed: p.visualSeed,
                explored: p.explored,
                scanned: p.scanned,
                atmosphere: p.atmosphere,
                description: p.description,
                flora: p.flora,
                fauna: p.fauna,
            })),
            ship: {
                id: ship.id,
                pos: { x: ship.pos.x, y: ship.pos.y },
                velocity: { x: ship.velocity.x, y: ship.velocity.y },
                angle: ship.angle,
                thrust: { x: ship.thrust.x, y: ship.thrust.y },
                landingPlanetId: ship.landing ? ship.landing.planet.id : null,
            },
            followId: this.follow ? this.follow.id : null,
            latestDiscoveryId: this.latestDiscovery ? this.latestDiscovery.id : null,
        });
    }

    /**
     * Rebuild a universe from a serialize() snapshot (P03-T02).
     * Restores exact state; persistent bodies keep their stable ids, so
     * landing/follow cross-references survive the round-trip.
     */
    static deserialize(namer: Namer, json: string): Universe {
        const data = JSON.parse(json);
        // Save migration (user 2026-11-09): v1 → v2 adds planet.scanned
        // (scanner reveals), defaulting to false. Nothing else changed yet.
        const version = data.v ?? 1;
        const u = new Universe(namer, BigInt(data.randomSeed));
        u.now = data.now;

        const star = new Star(data.star.cls, data.star.radius);
        star.id = data.star.id;
        star.name = data.star.name;
        star.pos.x = data.star.pos.x;
        star.pos.y = data.star.pos.y;
        u.star = star;
        u.addEntity(star);

        for (const pd of data.planets) {
            const p = new Planet(star.pos, pd.radius, new Vec2(pd.pos.x, pd.pos.y), pd.speed, pd.color);
            p.id = pd.id;
            p.name = pd.name;
            p.visualSeed = pd.visualSeed ?? 0;
            p.explored = pd.explored;
            p.scanned = version >= 2 ? (pd.scanned ?? false) : false;
            p.atmosphere = pd.atmosphere;
            p.description = pd.description;
            p.flora = pd.flora;
            p.fauna = pd.fauna;
            u.planets.push(p);
            u.addEntity(p);
        }
        // Ambient traffic is regenerated from the seed, like asteroids.
        u.spawnCargoShips();

        const ship = new Spacecraft();
        ship.id = data.ship.id;
        ship.pos.x = data.ship.pos.x;
        ship.pos.y = data.ship.pos.y;
        ship.velocity.x = data.ship.velocity.x;
        ship.velocity.y = data.ship.velocity.y;
        ship.angle = data.ship.angle;
        ship.thrust.x = data.ship.thrust.x;
        ship.thrust.y = data.ship.thrust.y;
        u.ship = ship;
        u.addEntity(ship);
        u.ringfence.add(ship);
        u.addConstraint(u.ringfence);

        if (data.ship.landingPlanetId !== null) {
            const planet = u.planets.find(p => p.id === data.ship.landingPlanetId);
            if (planet) {
                const landing = new Landing(ship, planet, Vec2_angle(ship.pos, planet.pos));
                ship.landing = landing;
                u.addConstraint(landing);
            }
        }
        if (data.followId !== null) {
            if (data.followId === ship.id) u.follow = ship;
            else if (data.followId === star.id) u.follow = star;
            else u.follow = u.planets.find(p => p.id === data.followId) || null;
        }
        if (data.latestDiscoveryId !== null) {
            u.latestDiscovery = u.planets.find(p => p.id === data.latestDiscoveryId) || null;
        }
        return u;
    }
}

export class Landing implements Constraint {
    ship: Spacecraft | null;
    readonly planet: Planet;
    readonly angle: number;
    private landingVector: Vec2;
    /**
     * Spin anchor (user 2026-11-09): the landing is stored in the body's
     * LOCAL frame (angle − body angle at touch-down). A spinning asteroid
     * carries the ship around with the very point it stands on — same
     * footing while the rock rotates.
     */
    readonly localAngle: number;
    /** Local outward surface orientation (null = radial, for planets). */
    readonly orientationLocal: number | null;
    readonly surfaceRadius: number;
    /**
     * surfaceRadius: the distance from the body CENTER to the landing face.
     * For asteroids this is the POLYGON surface distance (user 2026-11-09:
     * resting on the rock face, never on a hover-circle of "air"), not the
     * ball-with-the-same-name radius.
     */
    constructor(ship: Spacecraft, planet: Planet, angle: number, surfaceRadius: number = planet.radius, orientationWorld: number | null = null) {
        this.ship = ship;
        this.planet = planet;
        this.angle = angle;
        this.localAngle = angle - planet.angle;
        this.orientationLocal = orientationWorld === null ? null : orientationWorld - planet.angle;
        this.surfaceRadius = surfaceRadius;
        this.landingVector = Vec2_makeWithAngleMag(Vec2.Zero(), angle, ship.radius + surfaceRadius);
    }
    solve(sim: Simulator, dt: number) {
        if (this.ship !== null) {
            // recompute in the body's CURRENT frame: spin carries us, and we
            // face the surface normal (perpendicular), not the raw radius.
            const worldAngle = this.planet.angle + this.localAngle;
            const orientWorld = this.orientationLocal === null ? worldAngle : this.planet.angle + this.orientationLocal;
            const lv = Vec2_makeWithAngleMag(Vec2.Zero(), worldAngle, this.ship.radius + this.surfaceRadius);
            this.ship.pos.x = this.ship.pos.x * .5 + (this.planet.pos.x + lv.x) * .5;
            this.ship.pos.y = this.ship.pos.y * .5 + (this.planet.pos.y + lv.y) * .5; // @@@ FIXME
            this.ship.angle = orientWorld;
        }
    }
}

export enum SparkStyle {
    LINE,
    LINE_ABSOLUTE,
    DOT,
    DOT_ABSOLUTE,
    RING
}

export class Spark extends Body implements Removable {
    lifetime: number;
    collides: boolean;
    mass: number;
    readonly style: SparkStyle;
    readonly color: string;
    readonly size: number;

    constructor(lifetime: number,
        collides: boolean = false,
        mass: number = 0,
        style: SparkStyle = SparkStyle.LINE,
        color: string = Colors.Gray,
        size: number = 2) {
        super();
        this.lifetime = lifetime;
        this.collides = collides;
        this.mass = mass;
        this.style = style;
        this.color = color;
        this.size = size;
    }
    update(sim: Simulator, dt: number) {
        super.update(sim, dt);
        this.lifetime -= dt;
    }
    canBeRemoved(): boolean {
        return this.lifetime < 0;
    }
    postUpdate(sim: Simulator, dt: number): void {
        // The speed of Spark is unchangeable
    }
}

/**
 * NPC cargo ship (user 2026-11-09): ambient space traffic. Hauls between
 * two planets of the system along a straight lane (deterministic from the
 * world seed, NOT saved — regenerated like asteroids). Visible to the
 * radar as amber dots; the scanner range check applies like other bodies.
 * Not a physics body: position is driven along the lane each step and
 * opos is synced so the derived velocity stays sane for the radar.
 */
export class CargoShip extends Body {
    fromIdx = 0;
    toIdx = 1;
    /** Route progress 0..1 (from → to). */
    t = 0;
    /** Lane direction: +1 heading to `to`, -1 heading home. */
    dir = 1;
    cruise = 900;
    /** Perpendicular lane offset (m) — traffic doesn't overlap. */
    laneOffset = 0;
    /** Per-ship hue for the radar dot. */
    hue = "#D8A84E";
    /** Revealed by the scanner (radar visibility). */
    scanned = false;

    constructor() {
        super("CargoShip");
        this.collides = false;
        this.radius = 60;
        this.mass = 400;
    }

    update(sim: Simulator, dt: number) {
        if (dt > 0) {
            const a = this.laneA;
            const b = this.laneB;
            if (a !== null && b !== null) {
                const len = Math.hypot(b.x - a.x, b.y - a.y);
                if (len > 1) {
                    this.t += (this.dir * this.cruise * dt) / len;
                    if (this.t >= 1) { this.t = 1; this.dir = -1; }
                    else if (this.t <= 0) { this.t = 0; this.dir = 1; }
                    const tt = this.t;
                    // current lane point + perpendicular offset
                    const px = a.x + (b.x - a.x) * tt;
                    const py = a.y + (b.y - a.y) * tt;
                    const nx = -(b.y - a.y) / len;
                    const ny = (b.x - a.x) / len;
                    const oldX = this.pos.x;
                    const oldY = this.pos.y;
                    this.pos.x = px + nx * this.laneOffset;
                    this.pos.y = py + ny * this.laneOffset;
                    // derived velocity (position-based dynamics) + heading
                    this.velocity.x = dt > 0 ? (this.pos.x - oldX) / dt : 0;
                    this.velocity.y = dt > 0 ? (this.pos.y - oldY) / dt : 0;
                    this.angle = Math.atan2(this.pos.y - oldY, this.pos.x - oldX);
                }
            }
        }
        Vec2_copy(this.opos, this.pos);
    }

    postUpdate(_sim: Simulator, _dt: number): void {
        // CargoShips are kinematically driven in update(); do not let the
        // generic Body integration derive a different velocity from opos.
    }

    /** Lane endpoints, refreshed lazily from the planet orbits. */
    laneA: { x: number; y: number } | null = null;
    laneB: { x: number; y: number } | null = null;
}

export class Track {    positions = new Deque<Vec2>(UniverseConst.TRACK_LENGTH);
    private angles = new Deque<number>(UniverseConst.TRACK_LENGTH);
    /** Sim time (seconds) each point was recorded — for lifetime expiry. */
    private times = new Deque<number>(UniverseConst.TRACK_LENGTH);
    /** Most recent expire() time — used for ages in rendering. */
    private lastNow = 0;
    private lastX = NaN;
    private lastY = NaN;
    add(x: number, y: number, a: number, now: number) {
        // Per-step capture (user 2026-11-09): the tail grows smoothly at ANY
        // speed — the old distance-sampling made slow flight look jumpy.
        this.lastX = x;
        this.lastY = y;
        if (this.positions.size() >= (UniverseConst.TRACK_LENGTH - 1)) {
            this.dropOldest();
        }
        this.positions.addLast(new Vec2(x, y));
        this.angles.addLast(a);
        this.times.addLast(now);
    }
    /**
     * Expire points older than TRACK_LIFETIME (user 2026-11-09): the tail
     * vanishes by AGE, not by count. While flying, expired points are far
     * outside the viewport (lifetime × speed behind the ship); when the
     * ship is parked, the whole trail visibly shrinks away.
     */
    expire(now: number) {
        this.lastNow = now;
        while (this.times.size() > 0
            && now - (this.times.first() as number) > UniverseConst.TRACK_LIFETIME) {
            this.dropOldest();
        }
        // fully expired: reset the distance sampler so the next trail
        // starts fresh rather than jumping from an old position
        if (this.positions.size() === 0) {
            this.lastX = NaN;
            this.lastY = NaN;
        }
    }
    private dropOldest() {
        this.positions.removeFirst();
        this.angles.removeFirst();
        this.times.removeFirst();
    }

    /** Number of recorded points. */
    size(): number { return this.positions.size(); }

    /** Iterate points with their AGE in seconds (for age-faded drawing). */
    forEachPoint(fn: (x: number, y: number, age: number) => void) {
        for (let i = 0; i < this.positions.size(); i++) {
            const p = this.positions.at(i);
            const t = this.times.at(i);
            if (p === undefined || t === undefined) continue;
            fn(p.x, p.y, this.lastNow - t);
        }
    }
}

export class Spacecraft extends Body {
    thrust = Vec2.Zero();
    launchClock = 0;

    transit = false;

    /** Boost burner engaged (user 2026-11-08): raises the ENGINE cap from
     * engineSpeedCap to boostSpeedCap while held. Set by the boost button
     * in main.ts. It says nothing about the ship's total velocity. */
    boost = false;
    /** Thrust multiplier while boosting (from the ship profile). Applied
     * in update(). */
    thrustMultiplier = 1;

    /** Data-driven ship characteristics (user 2026-11-08): engine caps,
     * boost behavior, heat resistance, glow/destruction parameters. */
    profile = DEFAULT_SHIP_PROFILE;

    /** Stellar heat accumulator 0..1 (StarHeat.ts); destroys at 1. */
    heat = 0;

    track = new Track();

    landing: Landing | null = null;

    constructor() {
        super();
        this.mass = UniverseConst.SPACECRAFT_MASS;
        this.radius = 12;
    }

    update(sim: Simulator, dt: number) {
        // check for thrusters
        const thrustMag = this.thrust.mag();
        if (thrustMag > 0) {
            let deltaV = this.profile.engineAccel * dt * this.thrustMultiplier;
            if (SCALED_THRUST) deltaV *= clamp(thrustMag, 0, 1);

            if (this.landing === null) {
                // we are free in space, so we attempt to pivot toward the desired direction
                // NOTE: no longer required thanks to FlightStick
                // angle = thrust.angle()
            } else {
                if (this.launchClock === 0) this.launchClock = sim.now + 1; /* @@@ TODO extract */

                if (sim.now > this.launchClock) {
                    // first-stage to orbit has 1000x power
                    //                    deltaV *= 1000f
                    sim.removeConstraint(this.landing);
                    this.landing = null;
                } else {
                    deltaV = 0;
                }
            }

            // ENGINE-ONLY speed caps (user 2026-11-08). The caps limit what
            // the ENGINE can add — never the ship's total velocity:
            //   - regular engine: profile.engineSpeedCap (4000)
            //   - boost burner:   profile.boostSpeedCap (6000)
            // Gravity (already applied this step in Universe.updateAll) may
            // accelerate the ship past both caps and is NEVER cancelled:
            // the clamp keeps the greater of the pre-burn speed and the
            // cap, so releasing boost never bleeds speed, braking works
            // normally (it lowers speed), and gravity slingshots persist.
            const cap = this.boost ? this.profile.boostSpeedCap : this.profile.engineSpeedCap;
            const speedBefore = this.velocity.mag();
            // this is it. impart thrust to the ship.
            // note that we always thrust in the forward direction
            Vec2_makeWithAngleMagAdd(this.velocity, this.angle, deltaV);
            const speedAfter = this.velocity.mag();
            if (speedAfter > cap && speedAfter > speedBefore) {
                const scale = Math.max(speedBefore, cap) / speedAfter;
                this.velocity.x *= scale;
                this.velocity.y *= scale;
            }
        } else {
            if (this.launchClock !== 0) this.launchClock = 0;
        }

        super.update(sim, dt);
    }

    postUpdate(sim: Simulator, dt: number) {
        super.postUpdate(sim, dt);

        // special effects all need to be added after the simulation step so they have
        // the correct position of the ship.
        this.track.add(this.pos.x, this.pos.y, this.angle, sim.now);
        this.track.expire(sim.now);

        const mag = this.thrust.mag();
        if (sim.rng.float() < mag) {
            // exhaust
            const spark = new Spark(
                sim.rng.minmax(0.5, 1),
                true,
                1,
                SparkStyle.RING,
                "rgba(255,255,255,0.25)",
                3
            );
            Vec2_copy(spark.pos, this.pos);
            Vec2_copy(spark.opos, this.opos);
            Vec2_copy(spark.velocity, this.velocity);
            Vec2_makeWithAngleMagAdd(
                spark.velocity,
                this.angle + sim.rng.minmax(-0.2, 0.2),// -0.2,0.2
                -UniverseConst.MAIN_ENGINE_ACCEL * mag * 10 * dt
            );
            sim.addEntity(spark);
        }
    }
}
