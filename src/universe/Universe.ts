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
import { addImpulse, applyEngineThrust } from "./Relativity";
import { DEFAULT_SHIP_SPEC, type ShipSpec } from "./ShipSpec";

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
    // engaged (user 2026-11-08).
    CRAFT_SPEED_LIMIT = 4_000,
    CRAFT_SPEED_LIMIT_BOOST = 6_000,
    MAIN_ENGINE_ACCEL = 1000, // thrust effect, pixels per second squared
    LAUNCH_MECO = 2, // how long to suspend gravity when launching

    TRACK_LENGTH = 10_000
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
    /** Distance from center to the polygon surface along angle a (world). */
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
        const a1 = (i + 1) * step;
        const r0 = this.radius * this.radii[i];
        const r1 = this.radius * this.radii[(i + 1) % verts];
        const t = (ang - a0) / step;
        return r0 + (r1 - r0) * t;
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
    /** Initial ship spawn position (respawn point, temp_mission §6). */
    private shipSpawnX = 0;
    private shipSpawnY = 0;
    private shipSpawnAngle = 0;
    /** Seconds remaining in the destruction→respawn sequence (0 = alive). */
    private respawnTimer = 0;
    /** Screen-flash alpha 0..1, decays in updateAll (render reads it). */
    flash = 0;
    /** Total destructions this session (telemetry/tests). */
    destructionCount = 0;

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
        this.recordSpawn();
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
        this.spawnAsteroids(120);
        this.planets.sort((a, b) => a.pos.distance(this.star.pos) - b.pos.distance(this.star.pos));
        this.planets.forEach((planet, idx) => planet.name = (systemName + " " + (idx + 1)));
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
        this.recordSpawn();
    }

    /** Save the current ship state as its respawn point (temp_mission §6). */
    private recordSpawn() {
        this.shipSpawnX = this.ship.pos.x;
        this.shipSpawnY = this.ship.pos.y;
        this.shipSpawnAngle = this.ship.angle;
    }

    /** Heat-zone tunables, relative to the star radius (temp_mission §6). */
    static CORONA_OUTER = 2.0; // heating starts inside 2×R
    static INNER_DANGER = 1.0; // crossing inside 1×R destroys (the surface)
    static MAX_HEAT_RATE = 0.25; // heat/sec at the surface (scale by spec)
    static COOL_RATE = 0.1; // heat/sec outside the corona

    /**
     * Star-corona heating for one step (temp_mission §6). Heat accumulates
     * inside 2×R quadratically toward the surface and cools outside.
     * Returns true if the ship must be destroyed this step (heat ≥ max or
     * inside the inner boundary). Pure function for testability.
     */
    static heatingStep(heat: number, distance: number, starRadius: number, scale: number, dt: number): { heat: number; danger: boolean; destroy: boolean } {
        const coronaOuter = Universe.CORONA_OUTER * starRadius;
        const inner = Universe.INNER_DANGER * starRadius;
        if (!(distance < coronaOuter)) {
            const cooled = Math.max(0, heat - Universe.COOL_RATE * scale * dt);
            return { heat: cooled, danger: false, destroy: distance < inner };
        }
        const q = Math.min(1, Math.max(0, (coronaOuter - distance) / (coronaOuter - inner)));
        const rate = Universe.MAX_HEAT_RATE * scale * q * q;
        const h = heat + rate * dt;
        return { heat: h, danger: true, destroy: h >= 1 || distance < inner };
    }

    /** Main relativistic gravity impulse on the ship (no ship-mass factor). */
    private applyShipGravity(dt: number) {
        const ship = this.ship;
        const m0 = ship.spec.restMass;
        // Effective G preserves the pre-fix numeric feel for the default ship:
        // the old code folded the ship mass into G (G·M_ship = 0.01·10), so
        // the true well strength was 0.1. Acceleration is now G_eff·M/d²,
        // independent of the ship's own mass (future ships share the well).
        const gEff = UniverseConst.GRAVITATION * UniverseConst.SPACECRAFT_MASS;
        const bodies: Planet[] = [...this.planets, this.star];
        for (const planet of bodies) {
            if (!(planet.mass > 0)) continue;
            const d = planet.pos.distance(ship.pos);
            // Softened distance: gravity stays on even inside the star's
            // surface (capped at the surface value) — never disabled
            // prematurely, never singular at the centre.
            const dEff = Math.max(d, planet.radius);
            const accel = gEff * planet.mass / (dEff * dEff);
            if (!(accel > 0)) continue;
            const a = Vec2_angle(planet.pos, ship.pos);
            const dp = m0 * accel * dt;
            const n = addImpulse(ship.velocity.x, ship.velocity.y, m0, dp * Math.cos(a), dp * Math.sin(a));
            ship.velocity.x = n.vx;
            ship.velocity.y = n.vy;
        }
    }

    /** Begin the destruction sequence: flash + debris, then respawn. */
    private destroyShip() {
        const ship = this.ship;
        this.flash = 1;
        this.respawnTimer = 1.5;
        this.destructionCount++;
        // Model-independent debris: generic sparks (works for any ship art).
        for (let i = 0; i < 40; i++) {
            const spark = new Spark(
                this.rng.minmax(0.6, 1.8),
                false,
                0,
                SparkStyle.DOT,
                i % 3 === 0 ? "#FFCC66" : Colors.White,
                this.rng.minmax(1, 2.5),
            );
            Vec2_makeWithAngleMag(spark.pos, this.rng.minmax(0, PI * 2), this.rng.minmax(0, ship.radius * 0.8)).addSelf(ship.pos);
            Vec2_copy(spark.opos, spark.pos);
            Vec2_makeWithAngleMag(spark.velocity, this.rng.minmax(0, PI * 2), this.rng.minmax(80, 520));
            spark.velocity.x += ship.velocity.x * 0.3;
            spark.velocity.y += ship.velocity.y * 0.3;
            this.addEntity(spark);
        }
        // Freeze the husk in place; the wreck stays visible only via debris.
        ship.velocity.x = 0;
        ship.velocity.y = 0;
        ship.thrust.x = 0;
        ship.thrust.y = 0;
    }

    /** Respawn at the initial spawn point. Universe data is untouched. */
    private respawnShip() {
        const ship = this.ship;
        if (ship.landing !== null) {
            this.removeConstraint(ship.landing);
            ship.landing = null;
        }
        ship.pos.x = this.shipSpawnX;
        ship.pos.y = this.shipSpawnY;
        ship.opos.x = this.shipSpawnX;
        ship.opos.y = this.shipSpawnY;
        ship.velocity.x = 0;
        ship.velocity.y = 0;
        ship.angle = this.shipSpawnAngle;
        ship.thrust.x = 0;
        ship.thrust.y = 0;
        ship.heat = 0;
        ship.boost = false;
        ship.boostLatched = false;
        ship.thrustMultiplier = 1;
        ship.launchClock = 0;
        // Track restarts from the respawn point (no jumps across the map).
        ship.track.clear();
        this.respawnTimer = 0;
    }

    /** True while the destruction→respawn sequence is running. */
    get isDestroyed(): boolean {
        return this.respawnTimer > 0;
    }

    /** Fraction of the respawn sequence left (1 → 0), for render fades. */
    get respawnProgress(): number {
        return this.respawnTimer > 0 ? this.respawnTimer / 1.5 : 0;
    }

    updateAll(dt: number, entities: Set<Entity>) {
        // Destruction→respawn sequence (temp_mission §6). While destroyed the
        // husk is frozen; the timer ticks in sim time and respawns cleanly.
        // The universe (planets, asteroids, explored) is never touched.
        if (this.respawnTimer > 0) {
            this.respawnTimer -= dt;
            this.flash = Math.max(0, this.flash - dt * 2.2);
            if (this.respawnTimer <= 0) this.respawnShip();
            // Still integrate planets/asteroids so the world lives on;
            // the ship itself is frozen (no thrust/gravity) until respawn.
            super.updateAll(dt, entities);
            return;
        }
        this.flash = Math.max(0, this.flash - dt * 2.2);

        // check for passing in front of the sun
        this.ship.transit = false;
        const starD = this.star.pos.distance(this.ship.pos);
        this.ship.starDistance = starD;
        if (starD < this.star.radius) this.ship.transit = true;

        // Heating (temp_mission §6): corona exposure accumulates heat and
        // cools outside. MECO launch grace still suppresses gravity (kept),
        // but heating applies whenever the star is near — dangerous flybys
        // are possible, instant death is not.
        const heatRes = Universe.heatingStep(
            this.ship.heat, starD, this.star.radius,
            this.ship.spec.heatRateScale, dt,
        );
        this.ship.heat = heatRes.heat;
        this.ship.coronaDanger = heatRes.danger;
        if (heatRes.destroy) {
            this.destroyShip();
            super.updateAll(dt, entities);
            return;
        }

        // Relativistic ship gravity (temp_mission §3): acceleration is
        // G·M_source/d² (mass-independent — the old ship.mass factor was a
        // dimensional error: it made gravity ∝ ship mass). The force acts
        // through momentum (p = γ·m0·v), so slingshots can exceed 4000/6000
        // freely (bounded only by C_GAME). Gravity stays on inside the
        // star surface (softened at the surface value) — no premature
        // cutoff; MECO grace within 2 s of launch is preserved.
        if (this.now > this.ship.launchClock + UniverseConst.LAUNCH_MECO) {
            this.applyShipGravity(dt);
        }

        // Asteroids feel the same gravity (user 2026-11-08): they drift and
        // orbit under the star/planet wells instead of flying in straight lines.
        // Acceleration is G_eff·M/d² (mass-independent, as it should be).
        const gEff = UniverseConst.GRAVITATION * UniverseConst.SPACECRAFT_MASS;
        for (const a of this.asteroids) {
            for (const p of [this.star, ...this.planets]) {
                const d = p.pos.distance(a.pos);
                if (d > p.radius) {
                    Vec2_makeWithAngleMagAdd(
                        a.velocity,
                        Vec2_angle(p.pos, a.pos),
                        dt * gEff * p.mass / (d * d)
                    );
                }
            }
        }

        super.updateAll(dt, entities);
    }

    /**
     * Spawn a drifting asteroid belt (user 2026-11-08): 36 seeded asteroids
     * clustered in one radial band (60–110 km), radii 25–350 m, with
     * tangential Keplerian velocities around the star — the belt slowly
     * rotates coherently under gravity. They are visual/physics bodies, not
     * landable — collisions are disabled, they keep stable ids (2001+) and
     * are NOT saved (decorative debris, regenerated from the world seed).
     */
    spawnAsteroids(count: number) {
        for (let i = 0; i < count; i++) {
            const radius = this.rngForInit.minmax(80, 450);
            const orbitRadius = lerp(60_000, 110_000, this.rngForInit.float());
            const a = new Asteroid(radius);
            a.id = 2001 + i;
            a.seed = this.rngForInit.float();
            a.spin = this.rngForInit.minmax(-0.6, 0.6);
            a.radii = Array.from({ length: 9 }, () => 0.55 + this.rngForInit.float() * 0.55);
            Vec2_makeWithAngleMag(a.pos, this.rngForInit.float() * PI * 2, orbitRadius).addSelf(this.star.pos);
            // circular-orbit velocity (same Keplerians as planets)
            const period = sqrt(orbitRadius * orbitRadius * orbitRadius / this.star.mass) * UniverseConst.KEPLER_CONSTANT;
            const speed = 2 * PI * orbitRadius / period;
            Vec2_makeWithAngleMag(a.velocity, Vec2_angle(a.pos, this.star.pos) + PI / 2, speed);
            this.asteroids.push(a);
            this.addEntity(a);
        }
    }

    closestPlanet(): Planet {
        const newArray = Array.from(this.planets);
        newArray.push(this.star);
        const bodiesByDist = newArray
            .map(planet => [planet.pos, planet])
            .sort((a, b) => (a[0] as Vec2).distance(this.ship.pos) - (b[0] as Vec2).distance(this.ship.pos));

        return bodiesByDist[0][1] as Planet;
    }

    closestPlanetForZoom(): Planet {
        const newArray = Array.from(this.planets);
        newArray.push(this.star);
        const bodiesByDist = newArray
            .map(planet => [planet.pos, planet])
            .sort((a, b) => ((a[0] as Vec2).distance(this.ship.pos) - (a[1] as Planet).radius * 1.2) - ((b[0] as Vec2).distance(this.ship.pos) - (b[1] as Planet).radius * 1.2));

        return bodiesByDist[0][1] as Planet;
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
        entities.forEach((it: any) => {
            if ((it as Removable).canBeRemoved
                && (it as Removable).canBeRemoved()) {
                entities.delete(it);
            }
        });
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
            v: 1,
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
                heat: ship.heat,
                boost: ship.boost,
                thrustMultiplier: ship.thrustMultiplier,
                spawn: { x: this.shipSpawnX, y: this.shipSpawnY, angle: this.shipSpawnAngle },
                respawnTimer: this.respawnTimer,
                destructionCount: this.destructionCount,
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
            p.atmosphere = pd.atmosphere;
            p.description = pd.description;
            p.flora = pd.flora;
            p.fauna = pd.fauna;
            u.planets.push(p);
            u.addEntity(p);
        }

        const ship = new Spacecraft();
        ship.id = data.ship.id;
        ship.pos.x = data.ship.pos.x;
        ship.pos.y = data.ship.pos.y;
        ship.velocity.x = data.ship.velocity.x;
        ship.velocity.y = data.ship.velocity.y;
        ship.angle = data.ship.angle;
        ship.thrust.x = data.ship.thrust.x;
        ship.thrust.y = data.ship.thrust.y;
        // New ship fields (temp_mission §6); old v:1 saves lack them.
        ship.heat = data.ship.heat ?? 0;
        ship.boost = data.ship.boost ?? false;
        ship.thrustMultiplier = data.ship.thrustMultiplier ?? 1;
        u.ship = ship;
        u.addEntity(ship);
        u.ringfence.add(ship);
        u.addConstraint(u.ringfence);
        if (data.ship.spawn) {
            (u as any).shipSpawnX = data.ship.spawn.x;
            (u as any).shipSpawnY = data.ship.spawn.y;
            (u as any).shipSpawnAngle = data.ship.spawn.angle;
        } else {
            u.recordSpawn();
        }
        if (data.ship.respawnTimer) (u as any).respawnTimer = data.ship.respawnTimer;
        if (data.ship.destructionCount) (u as any).destructionCount = data.ship.destructionCount;

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
    constructor(ship: Spacecraft, planet: Planet, angle: number) {
        this.ship = ship;
        this.planet = planet;
        this.angle = angle;
        this.landingVector = Vec2_makeWithAngleMag(Vec2.Zero(), angle, ship.radius + planet.radius);
    }
    solve(sim: Simulator, dt: number) {
        if (this.ship !== null) {
            this.ship.pos.x = this.ship.pos.x * .5 + (this.planet.pos.x + this.landingVector.x) * .5;
            this.ship.pos.y = this.ship.pos.y * .5 + (this.planet.pos.y + this.landingVector.y) * .5; // @@@ FIXME
            this.ship.angle = this.angle;
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

export class Track {
    positions = new Deque<Vec2>(UniverseConst.TRACK_LENGTH);
    private angles = new Deque<number>(UniverseConst.TRACK_LENGTH);
    add(x: number, y: number, a: number) {
        if (this.positions.size() >= (UniverseConst.TRACK_LENGTH - 1)) {
            this.positions.removeFirst();
            this.angles.removeFirst();
            this.positions.removeFirst();
            this.angles.removeFirst();
        }
        this.positions.addLast(new Vec2(x, y));
        this.angles.addLast(a);
    }
    /** Drop the whole trail (respawn restart — no segment across the map). */
    clear() {
        this.positions.clear();
        this.angles.clear();
    }
}

export class Spacecraft extends Body {
    thrust = Vec2.Zero();
    launchClock = 0;

    transit = false;

    /** Boost burner engaged (user 2026-11-08): raises the ENGINE limit from
     * 4000 to 6000 while held. Set by the boost button in main.ts. It is an
     * engine limit, not a total-velocity cap (temp_mission §3): external
     * forces may exceed it and releasing it never slows the ship. */
    boost = false;
    /** Legacy latch field (pre-relativistic drag). Kept for save compat; the
     * brake-drag behaviour it used to trigger was removed (temp_mission §4):
     * disabling boost no longer decelerates the ship. */
    boostLatched = false;
    /** Thrust multiplier (boost = 1.5). Applied in update(). */
    thrustMultiplier = 1;
    /** Physical spec (rest mass, engine limits, heating) — see ShipSpec.ts. */
    spec: ShipSpec = { ...DEFAULT_SHIP_SPEC };
    /** Normalized star-heating 0..maxHeat (corona exposure). Per-ship. */
    heat = 0;
    /** Distance to star center at last heat update (meters, for UI). */
    starDistance = Infinity;
    /** Whether the ship is inside the star corona danger zone. */
    coronaDanger = false;

    track = new Track();

    landing: Landing | null = null;

    constructor() {
        super();
        this.mass = this.spec.restMass;
        this.radius = 12;
    }

    update(sim: Simulator, dt: number) {
        // check for thrusters
        const thrustMag = this.thrust.mag();
        if (thrustMag > 0) {
            let deltaV = this.spec.engineAccel * dt * this.thrustMultiplier;
            if (SCALED_THRUST) deltaV *= clamp(thrustMag, 0, 1);

            if (this.landing !== null) {
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

            // Engine thrust, relativistically and limit-aware (temp_mission
            // §3–§4): the 4000/6000 limits cap ENGINE-driven speed only.
            // Gravity may exceed them; thrust above the limit cannot increase
            // speed along travel but braking/steering still work. At ≤6000
            // γ≈1.005, so ordinary feel is preserved.
            if (deltaV > 0) {
                const limit = this.boost ? this.spec.boostLimit : this.spec.engineLimit;
                const n = applyEngineThrust(
                    this.velocity.x, this.velocity.y, this.angle, deltaV,
                    limit, this.spec.restMass,
                );
                this.velocity.x = n.vx;
                this.velocity.y = n.vy;
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
        this.track.add(this.pos.x, this.pos.y, this.angle);

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
