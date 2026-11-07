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

import { Autopilot15 } from "../sim/Autopilot15";
import { Colors } from "../core/Colors";
import { LOG } from "../core/Debug";
import { drawFlag } from "../core/Flag15";
import { lerp } from "../core/MathHelpers";
import { Namer15 } from "../core/Namer15";
import { createPolygon, drawPolygon, parseSvgPathData } from "../core/PathTools";
import { Constraint, Container, Simulator } from "../core/Physics";
import { chooseRandom } from "../core/Randomness";
import { Asteroid, Landing, Planet, Spacecraft, Spark, SparkStyle, Star, StarClass, StarClasses, Track, UniverseConst } from "../universe/Universe";
import { starHeatStep, STAR_CORONA_FACTOR } from "../universe/StarHeat";
import { Landing15, Spacecraft15 } from "../universe/Universe15";
import { Vec2, Vec2_angle, Vec2_copy, Vec2_makeWithAngleMag } from "../core/Vec2";
import { clamp } from "../core/Maths";
import { VisibleUniverse, ZoomedDrawScope } from "./VisibleUniverse";

const solveSimulator = Simulator.prototype.solveAll;

const PI = Math.PI;
const abs = Math.abs;
const sqrt = Math.sqrt;

export class ZoomedDrawScope15 extends ZoomedDrawScope {
    readonly spaceshipLegs = parseSvgPathData("\nM-7   -6.5\nl-3.5  0\nl-1   -2\nl 0    4\nl 1   -2\nZ\nM-7    6.5\nl-3.5  0\nl-1   -2\nl 0    4\nl 1   -2\nZ\n")
    readonly thrustPath = createPolygon(-3, 3, -5, 0);

    // Deterministic nebula macroform (P07-T03): seeded once at construction.
    // Three overlapping rotated blobs near the system core, drawn at low
    // alpha under the bodies — coherent filaments, never hard-edged clouds.
    private readonly nebulaBlobs: Array<{ x: number; y: number; r: number; rot: number; color: string; alpha: number; rr: number[] }> = (() => {
        let s = 1234567n; // LCG — deterministic, independent of the world seed
        const next = () => {
            s = (s * 6364136223846793005n + 1442695040888963407n) & ((1n << 64n) - 1n);
            return Number((s >> 11n) & ((1n << 53n) - 1n)) / 9007199254740992;
        };
        const colors = ["#7A6AA0", "#4A7A8A", "#8A6A9A", "#5A8AAA"];
        return colors.map((color, i) => ({
            x: (next() - 0.5) * 60000,
            y: (next() - 0.5) * 60000,
            r: 22000 + next() * 26000,
            rot: next() * PI * 2,
            color,
            // slightly more visible (user 2026-11-08) — soft edges via
            // shadow-blur halo in drawNebula carry the rest of the lift
            alpha: 0.08 + 0.04 * (i % 2) + next() * 0.04,
            rr: Array.from({ length: 12 }, () => 0.65 + next() * 0.6),
        }));
    })();

    drawUniverse(universe: VisibleUniverse) {
        this.drawNebula(); // layer 3 backdrop-under-bodies, before gravity rings
        // Black-hole landmark (P07-T04): the system is not a black hole, but
        // the signature encounter is rendered as a fixed distant landmark at
        // the far side of the playable space so players can fly up to it and
        // inspect the event-horizon silhouette + accretion disc + lensing cue.
        this.drawBlackHoleMark(180000, -140000, 2600);
        universe.constraints.forEach(it => {
            if (it instanceof Landing) {
                this.drawLanding(it);
            } else if (it instanceof Container) {
                this.drawContainer(it);
            }
        });
        this.drawStar(universe.star);
        universe.entities.forEach(it => {
            if (it === universe.star) return; // don't draw the star as a planet
            if (it instanceof Spark) {
                this.drawSpark(it);
            } else if (it instanceof Asteroid) {
                this.drawAsteroid(it);
            } else if (it instanceof Planet) {
                this.drawPlanet(it);
            }
        });
        const ship = universe.ship as Spacecraft15;
        const autopilot = ship.autopilot;
        if (autopilot !== null && autopilot.enabled) {
            this.drawAutopilot(autopilot);
        }
        this.drawSpacecraft(ship);
    }
    /**
     * Asteroids (user 2026-11-08): irregular seeded polygon, crater shading,
     * slow spin from the physics body angle. Never a disc, never a palette
     * clone — the seed drives both silhouette and crater layout.
     */
    drawAsteroid(a: Asteroid) {
        const context = this.context;
        const helper = this.helper;
        if (!helper.width) return;
        const left = helper.x;
        const top = helper.y;
        const right = left + helper.width;
        const bottom = top + helper.height;
        if (a.pos.x + a.radius * 2 < left || a.pos.x - a.radius * 2 > right
            || a.pos.y + a.radius * 2 < top || a.pos.y - a.radius * 2 > bottom) return;
        const seed = a.seed;
        context.save();
        context.translate(a.pos.x, a.pos.y);
        context.rotate(a.angle);
        // irregular silhouette: 9 vertices, radii from the shared physics array
        context.beginPath();
        const verts = a.radii.length;
        for (let i = 0; i < verts; i++) {
            const ang = (i / verts) * PI * 2;
            const rr = a.radius * a.radii[i];
            const px = Math.cos(ang) * rr;
            const py = Math.sin(ang) * rr * 0.85;
            if (i === 0) context.moveTo(px, py);
            else context.lineTo(px, py);
        }
        context.closePath();
        context.fillStyle = "#6B5B4D";
        context.fill();
        context.strokeStyle = "rgba(220,205,185,0.55)";
        context.lineWidth = 2 / this.zoom;
        context.stroke();
        // craters: 3 seeded dips
        context.fillStyle = "rgba(0,0,0,0.28)";
        for (let i = 0; i < 3; i++) {
            const ang = (seed * 13.7 + i * 2.4) * PI;
            const d = a.radius * 0.34 * (((seed + i * 0.41) % 1 + 1) % 1);
            const cr = a.radius * (0.12 + (i % 2) * 0.05);
            context.beginPath();
            context.arc(Math.cos(ang) * d, Math.sin(ang) * d, cr, 0, PI * 2);
            context.fill();
        }
        context.restore();
    }
    drawNebula() {
        const context = this.context;
        const helper = this.helper;
        if (!helper.width) return;
        const left = helper.x;
        const top = helper.y;
        const right = left + helper.width;
        const bottom = top + helper.height;
        const dpr = window.devicePixelRatio || 1;
        for (const blob of this.nebulaBlobs) {
            // cull blobs far outside the visible world rect
            if (blob.x + blob.r < left || blob.x - blob.r > right
                || blob.y + blob.r < top || blob.y - blob.r > bottom) continue;
            context.save();
            context.translate(blob.x, blob.y);
            context.rotate(blob.rot);
            // Soft-edged nebula (user 2026-11-08): a shadow-blur halo under
            // a low-alpha core replaces the hard polygon fill. Canvas
            // shadows ignore the world transform, so the blur is set in
            // device px and stays proportional on screen at every zoom.
            const blurPx = clamp(blob.r * this.zoom * dpr * 0.12, 12, 140);
            const steps = blob.rr.length;
            const tracePath = () => {
                context.beginPath();
                for (let i = 0; i <= steps; i++) {
                    const a = (i / steps) * PI * 2;
                    const rr = blob.r * blob.rr[i % steps];
                    const px = Math.cos(a) * rr;
                    const py = Math.sin(a) * rr * 0.72; // squash → filament feel
                    if (i === 0) context.moveTo(px, py);
                    else context.lineTo(px, py);
                }
                context.closePath();
            };
            context.shadowColor = blob.color;
            context.shadowBlur = blurPx;
            context.fillStyle = blob.color;
            context.globalAlpha = blob.alpha * 0.7;
            tracePath();
            context.fill(); // halo pass (blurred)
            context.shadowBlur = 0;
            context.globalAlpha = blob.alpha * 0.55;
            tracePath();
            context.fill(); // core pass (crisp, translucent)
            context.restore();
        }
        context.globalAlpha = 1;
    }
    /**
     * Black-hole landmark (P07-T04): pure black shadow disc + an orange
     * accretion ring + a soft lensing halo. Art-directed 2D approximation —
     * NOT real gravitational lensing (no ray tracing; Phase 08 scope).
     */
    drawBlackHoleMark(bx: number, by: number, br: number) {
        const context = this.context;
        const helper = this.helper;
        if (!helper.width) return;
        const left = helper.x;
        const top = helper.y;
        const right = left + helper.width;
        const bottom = top + helper.height;
        if (bx + br * 3 < left || bx - br * 3 > right || by + br * 3 < top || by - br * 3 > bottom) return;
        // lensing glow (soft halo)
        context.fillStyle = "rgba(255,180,90,0.10)";
        context.beginPath();
        context.arc(bx, by, br * 1.55, 0, PI * 2);
        context.fill();
        context.fillStyle = "rgba(255,150,60,0.10)";
        context.beginPath();
        context.arc(bx, by, br * 1.28, 0, PI * 2);
        context.fill();
        // accretion disc (squashed ring crossing in front)
        context.save();
        context.translate(bx, by);
        context.scale(1, 0.34);
        context.strokeStyle = "rgba(255,190,110,0.85)";
        context.lineWidth = 90 / this.zoom;
        context.beginPath();
        context.arc(0, 0, br * 1.35, 0, PI * 2);
        context.stroke();
        context.restore();
        // event-horizon shadow
        context.fillStyle = "#000000";
        context.beginPath();
        context.arc(bx, by, br, 0, PI * 2);
        context.fill();
        // photon rim
        context.strokeStyle = "rgba(255,240,220,0.9)";
        context.lineWidth = 3 / this.zoom;
        context.beginPath();
        context.arc(bx, by, br, 0, PI * 2);
        context.stroke();
    }
    drawSpacecraft(ship: Spacecraft) {
        const context = this.context;
        const helper = this.helper;
        const thrustMag = ship.thrust.mag();
        const powered = thrustMag > 1e-6; // thrust vector magnitude (0..1), from the stick
        const shipSpeed = ship.velocity.mag();
        const boostOn = ship.boost === true; // afterburner look (user 2026-11-08)
        const oldHelperX = helper.x;
        const oldHelperY = helper.y;
        helper.x -= ship.pos.x;
        helper.y -= ship.pos.y;
        context.save();
        context.translate(ship.pos.x, ship.pos.y);
        context.rotate(ship.angle);
        // new in V: little landing legs
        if (ship.landing !== null) {
            context.strokeStyle = "#CCCCCC";
            context.lineWidth = 2 / this.zoom;
            context.stroke(this.spaceshipLegs);
        }
        // draw the ship
        context.fillStyle = Colors.Eigengrau;
        context.fill(this.spaceshipPath); // fauxpaque
        // Zoomed-out readability (user 2026-11-08): the hairline outline is
        // constant in screen px, which in world meters balloons as the camera
        // zooms out — it eventually drowns the dark hull fill and the ship
        // reads as an excessively bright dot. Cap the outline in world units
        // and add a faint halo when the hull goes sub-pixel, so the ship
        // stays findable without becoming a beacon.
        context.strokeStyle = ship.transit ? Colors.Black : Colors.White;
        context.lineWidth = Math.min(1.3 / this.zoom, 2.4); // user 2026-11-08: 1.5x thinner hull outline
        if (this.zoom < 0.5) {
            context.fillStyle = "rgba(183,183,255,0.16)";
            context.beginPath();
            context.arc(0, 0, ship.radius * 2.2, 0, PI * 2);
            context.fill();
        }
        context.stroke(this.spaceshipPath);
        // Dynamic exhaust flame (user request 2026-11-07, refined "beautiful
        // and alive"): a multi-layer procedural flame — turbulent teardrop with
        // sin-notched edges, layered white→orange→red bands, 3 flickering
        // licking tongues, drifting ember particles, and a long translucent
        // smoke tail at high throttle. Scales with stick deflection (thrust
        // magnitude) and speed; no longer a tiny outline.
        if (powered) {
            const exhaustLap = Math.min(1, Math.max(0, (thrustMag + shipSpeed / 5000) / 2));
            const t = performance.now() / 1000;
            const flick = 1 + 0.30 * Math.sin(t * 21) + 0.12 * Math.sin(t * 47 + 1.3);
            const baseLen = (8 + thrustMag * 30 + shipSpeed / 5000 * 22) * flick * (boostOn ? 1.35 : 1) * 1.35;
            const baseHalf = 2.6 + thrustMag * 4.2;

            // Boost burner palette (user 2026-11-08, refined): the afterburner
            // is a piercing white-cyan beam, CHIEF/Different from the warm
            // engine flame — longer core spike, electric-blue surround, plus
            // twin edge rings. Reads instantly as "afterburner".
            const outerCol = boostOn ? "rgba(80,180,255," : "rgba(255,140,40,";
            const midCol = boostOn ? "rgba(170,225,255," : "rgba(255,210,150,";
            const coreCol = boostOn ? "rgba(245,252,255," : "rgba(255,250,240,";

            const band = (len: number, half: number, colPrefix: string, alpha: number, notch: number, seed: number) => {
                context.fillStyle = colPrefix + alpha + ")";
                context.beginPath();
                context.moveTo(-3, -half);
                const steps = 24;
                for (let i = 0; i <= steps; i++) {
                    const u = i / steps;
                    const envelope = Math.sin(u * Math.PI * 0.92) * (1 - u * 0.85);
                    const notchWave = 1 + notch * (Math.sin(u * 17 + seed + t * 19) * 0.5 + Math.sin(u * 7 - seed + t * 11) * 0.5);
                    const w = half * envelope * notchWave;
                    const x = -3 - len * u;
                    const y = -w;
                    if (i === 0) context.lineTo(x, y);
                    else context.lineTo(x, y);
                }
                for (let i = steps; i >= 0; i--) {
                    const u = i / steps;
                    const envelope = Math.sin(u * Math.PI * 0.92) * (1 - u * 0.85);
                    const notchWave = 1 + notch * (Math.sin(u * 19 - seed + t * 23) * 0.5 + Math.sin(u * 9 + seed - t * 13) * 0.5);
                    const w = half * envelope * notchWave;
                    const x = -3 - len * u;
                    const y = w;
                    context.lineTo(x, y);
                }
                context.closePath();
                context.fill();
            };

            const tongues = 3;
            for (let kind = 1; kind >= 0; kind--) {
                const k = kind; // 0 outer, 1 mid — drawn last to front
                const len = baseLen * (kind === 0 ? 1 : 0.62);
                const half = baseHalf * (kind === 0 ? 1 : (boostOn ? 0.5 : 0.6));
                band(len, half, kind === 0 ? outerCol : midCol, (kind === 0 ? 0.20 : 0.30) + exhaustLap * 0.35, 0.28 + k * 0.1, k * 3.7);
            }

            // inner core (bright, short)
            band(baseLen * 0.55, baseHalf * (boostOn ? 0.42 : 0.5), coreCol, 0.55 + exhaustLap * 0.4, 0.2, 99);

            // afterburner spike (boost only): a long thin needle that flickers
            // hard — the visual signature of the burner.
            if (boostOn) {
                const spikeLen = baseLen * (1.5 + 0.3 * Math.sin(t * 33));
                context.fillStyle = "rgba(255,255,255," + (0.35 + exhaustLap * 0.5) + ")";
                context.beginPath();
                context.moveTo(-4, -baseHalf * 0.22);
                context.lineTo(-4 - spikeLen, 0);
                context.lineTo(-4, baseHalf * 0.22);
                context.closePath();
                context.fill();
                // twin edge rings around the core
                for (let i = 0; i < 2; i++) {
                    const offRing = (t * 60 + i * 55 + 20) % 120;
                    context.strokeStyle = "rgba(150,210,255," + (0.5 * (1 - offRing / 120)) + ")";
                    context.lineWidth = 1.2 / this.zoom;
                    context.beginPath();
                    context.ellipse(-8 - offRing, 0, 3 + offRing * 0.08, 1.6 + offRing * 0.05, 0, 0, PI * 2);
                    context.stroke();
                }
            }

            // licking tongues that pop on/off
            for (let i = 0; i < tongues; i++) {
                const phase = Math.sin(t * 7 + i * 2.1 + exhaustLap * 4);
                if (phase < 0.05) continue;
                const tongueLen = baseLen * (0.35 + 0.5 * phase) * (0.55 + thrustMag * 0.6);
                const tongueOff = (i - 1) * (baseHalf * 0.34);
                context.save();
                context.translate(0, tongueOff);
                band(tongueLen, baseHalf * (0.30 + 0.18 * phase), midCol, (0.25 + exhaustLap * 0.3), 0.45, i * 17.3);
                context.restore();
            }

            // ember particles drifting behind, fading with age (drift in world
            // meters so they never outrun the camera at any speed — user report)
            context.lineCap = "round";
            const embers = 10;
            for (let i = 0; i < embers; i++) {
                const age = (t * (1.6 + i * 0.11) + i * 0.37) % 1;
                const driftDist = age * 140; // meters, NOT speed-scaled
                const driftSide = Math.sin(i * 12.9898 + age * 6) * (baseHalf * 0.45 + age * 3);
                const blink = Math.abs(Math.sin(t * 9 + i * 7.7));
                const alpha = (1 - age) * (0.25 + 0.55 * exhaustLap) * (0.4 + 0.6 * blink);
                if (alpha < 0.03) continue;
                context.strokeStyle = (i % 3 === 0 ? coreCol : midCol) + alpha + ")";
                context.lineWidth = (1.6 - age * 0.9) / this.zoom;
                context.beginPath();
                context.moveTo(-4 - driftDist * 0.72, driftSide * 0.4);
                context.lineTo(-4 - driftDist, driftSide);
                context.stroke();
            }
            context.lineCap = "butt";
        }
        context.restore();
        helper.x = oldHelperX;
        helper.y = oldHelperY;
        this.drawTrack(ship.track);
    }
    drawLanding(landing: Landing) {
        if (drawFlag) {
            const context = this.context;
            const v = Vec2_makeWithAngleMag(Vec2.Zero(), landing.angle, landing.planet.radius).addSelf(landing.planet.pos);
            const strokeWidth = 2 / this.zoom;
            const height = 80;
            context.save();
            context.translate(v.x, v.y);
            context.rotate(landing.angle);
            context.strokeStyle = Colors.Flag;
            context.lineWidth = strokeWidth;
            context.beginPath();
            context.moveTo(0, 0);
            context.lineTo(height, 0);
            context.lineTo(height * 0.875, height * 0.25);
            context.lineTo(height * 0.75, 0);
            context.stroke();
            context.restore();
        }
    }
    drawAutopilot(autopilot: Autopilot15) {
        if (autopilot.target !== null) {
            const target = autopilot.target;
            const color = Colors.AutopilotTranslucent;
            const context = this.context;
            const helper = this.helper;
            const zoom = this.zoom;
            const oldHelperX = helper.x;
            const oldHelperY = helper.y;
            helper.x -= target.pos.x;
            helper.y -= target.pos.y;
            context.save();
            context.translate(target.pos.x, target.pos.y);
            context.rotate(autopilot.universe.now * 2 * PI / 10);
            context.strokeStyle = color;
            context.lineWidth = 1 / zoom;
            drawPolygon(
                context,
                target.radius + autopilot.brakingDistance,
                15 // Autopilot introduced in Android 15
            );
            context.globalAlpha = 0.25;
            helper.drawCircle(
                color,
                autopilot.landingAltitude,
                0,
                0,
                target.radius + autopilot.landingAltitude / 2
            );
            context.globalAlpha = 1;
            context.restore();
            helper.x = oldHelperX;
            helper.y = oldHelperY;
            helper.drawLine(
                color,
                1 / zoom,
                autopilot.ship.pos.x,
                autopilot.ship.pos.y,
                autopilot.leadingPos.x,
                autopilot.leadingPos.y
            );
            helper.drawCircle(
                color,
                1 / zoom,
                autopilot.leadingPos.x,
                autopilot.leadingPos.y,
                5 / zoom
            );
        }
    }
}

export class VisibleUniverse15 extends VisibleUniverse {
    initTest() {
        const systemName = "TEST SYSTEM"
        this.star =
            new Star(
                StarClass.A,
                UniverseConst.STAR_RADIUS_RANGE_MAX,
            );
        this.star.name = "TEST SYSTEM";

        for (let it = 0; it < UniverseConst.NUM_PLANETS_RANGE_MAX; it++) {
            const thisPlanetFrac = it / (UniverseConst.NUM_PLANETS_RANGE_MAX - 1);
            const radius =
                lerp(UniverseConst.PLANET_RADIUS_RANGE_MIN, UniverseConst.PLANET_RADIUS_RANGE_MAX, thisPlanetFrac);
            const orbitRadius =
                lerp(UniverseConst.PLANET_ORBIT_RANGE_MIN, UniverseConst.PLANET_ORBIT_RANGE_MAX, thisPlanetFrac);

            // Kepler's third law
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

        this.ship = new Spacecraft15();

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
            p.description = this.namer.describePlanet(this.rngForInit);
            p.atmosphere = this.namer.describeAtmo(this.rngForInit);
            p.flora = this.namer.describeLife(this.rngForInit);
            p.fauna = this.namer.describeLife(this.rngForInit);
            p.visualSeed = this.rngForInit.float(); // deterministic patch seed
            this.planets.push(p);
            this.addEntity(p);
        }
        this.spawnAsteroids(120);
        this.planets.sort((a, b) => a.pos.distance(this.star.pos) - b.pos.distance(this.star.pos));
        this.planets.forEach((planet, idx) => planet.name = (systemName + " " + (idx + 1)));
        this.addEntity(this.star);

        this.ship = new Spacecraft15();

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

    /**
     * Stellar hazard (user 2026-11-08): advance the ship's heat against the
     * system star. Danger zones scale with the star radius (StarHeat.ts);
     * destruction at critical heating or inside the inner boundary.
     */
    updateStarHazard(dt: number) {
        const ship = this.ship;
        const dist = ship.pos.distance(this.star.pos);
        const res = starHeatStep(ship.heat, dist, this.star.radius, dt, ship.profile.heatTolerance, ship.profile.coolRate);
        ship.heat = res.heat;
        if (res.destroy) this.destroyShip();
    }

    /**
     * Ship destruction (user 2026-11-08): flash + particles + debris at the
     * death site, then a respawn equivalent to the initial spawn. The
     * universe, sim time and explored planets are untouched. Works through
     * the ship profile contract, not the placeholder hull model, so future
     * ships reuse it as-is (profile.destructionScale, profile.heatTolerance).
     */
    destroyShip() {
        const ship = this.ship as Spacecraft15;
        const scale = ship.profile.destructionScale;

        // drop any landing constraint before teleporting
        if (ship.landing !== null) {
            this.removeConstraint(ship.landing);
            ship.landing.ship = null;
            ship.landing = null;
        }

        // flash: three expanding-brightness white rings at the death site
        for (let i = 0; i < 3; i++) {
            const flash = new Spark(
                0.5 + i * 0.3,
                false,
                0,
                SparkStyle.RING,
                "rgba(255,255,255," + (0.85 - i * 0.22) + ")",
                24 + i * 56
            );
            Vec2_copy(flash.pos, ship.pos);
            Vec2_copy(flash.opos, ship.pos);
            this.addEntity(flash);
        }

        // hot particles: blast outward, inherit part of the ship's momentum
        const particles = Math.round(36 * scale);
        const palette = ["#FFFFFF", "#FFD080", "#FF9040", "#FF5533"];
        for (let i = 0; i < particles; i++) {
            const spark = new Spark(
                this.rng.minmax(0.6, 2.2),
                false,
                0,
                SparkStyle.DOT,
                palette[i % palette.length],
                this.rng.minmax(1.5, 4.5)
            );
            Vec2_copy(spark.pos, ship.pos);
            Vec2_copy(spark.opos, ship.pos);
            Vec2_makeWithAngleMag(
                spark.velocity,
                this.rng.minmax(0, 2 * PI),
                this.rng.minmax(40, 750)
            );
            spark.velocity.x += ship.velocity.x * 0.4;
            spark.velocity.y += ship.velocity.y * 0.4;
            this.addEntity(spark);
        }

        // debris chunks: slower, darker, longer-lived tumbling hull fragments
        const chunks = Math.round(10 * scale);
        for (let i = 0; i < chunks; i++) {
            const spark = new Spark(
                this.rng.minmax(1.5, 3.5),
                false,
                0,
                SparkStyle.LINE,
                "#8A7D72",
                3
            );
            Vec2_copy(spark.pos, ship.pos);
            Vec2_makeWithAngleMag(
                spark.opos,
                this.rng.minmax(0, 2 * PI),
                this.rng.minmax(4, 14)
            ).addSelf(spark.pos);
            Vec2_makeWithAngleMag(
                spark.velocity,
                this.rng.minmax(0, 2 * PI),
                this.rng.minmax(30, 300)
            );
            spark.velocity.x += ship.velocity.x * 0.3;
            spark.velocity.y += ship.velocity.y * 0.3;
            this.addEntity(spark);
        }

        // respawn: equivalent to the initial spawn (same rng stream, same
        // orbit band and random heading). Explored planets, sim time and the
        // universe state persist; only the ship starts over.
        Vec2_makeWithAngleMag(
            ship.pos,
            this.rng.float() * PI * 2,
            this.rng.minmax(UniverseConst.PLANET_ORBIT_RANGE_MIN, UniverseConst.PLANET_ORBIT_RANGE_MAX)
        ).addSelf(this.star.pos);
        // position-based dynamics: velocity is re-derived from (pos − opos)/dt
        // each step, so the teleport must sync opos or the ship would gain a
        // phantom megameter-per-second velocity on the respawn frame
        Vec2_copy(ship.opos, ship.pos);
        ship.angle = this.rng.float() * PI * 2;
        ship.velocity.x = 0;
        ship.velocity.y = 0;
        ship.thrust.x = 0;
        ship.thrust.y = 0;
        ship.boost = false;
        ship.thrustMultiplier = 1;
        ship.heat = 0;
        ship.launchClock = 0;
        ship.transit = false;
        ship.track = new Track();
    }

    solveAll(dt: number, constraints: Set<Constraint>) {
        // Stellar hazard (user 2026-11-08): corona heating, destruction and
        // respawn run before any collision logic each step.
        this.updateStarHazard(dt);

        if (this.ship.landing === null) {
            const planet = this.closestPlanet();

            if (planet.collides) {
                const d = (this.ship.pos.distance(planet.pos)) - this.ship.radius - planet.radius;
                const a = Vec2_angle(this.ship.pos, planet.pos);

                if (d < 0) {
                    // landing, or impact?

                    // 1. relative speed
                    // const vDiff = (this.ship.velocity.distance(planet.velocity));
                    // 2. landing angle
                    const aDiff = abs(this.ship.angle - a);

                    // landing criteria
                    if (aDiff < PI / 4
                        //                        &&
                        //                        vDiff < 100f
                    ) {
                        const landing = new Landing15(this.ship, planet, a, (this.namer as Namer15).describeActivity(this.rng, planet));
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

        // Asteroid collision (user 2026-11-08): same landing-or-impact logic
        // as planets, with the asteroid as the landing target (treated as a
        // Planet for the Landing constraint — same pos/radius interface).
        // Surface distance follows the irregular polygon (not a circle): the
        // ship rests on the rock face, never hovering over "air".
        if (this.ship.landing === null) {
            let closestAsteroid: Asteroid | null = null;
            let closestDist = Infinity;
            for (const a of this.asteroids) {
                if (!a.collides) continue;
                const d = this.ship.pos.distance(a.pos);
                if (d < closestDist) {
                    closestDist = d;
                    closestAsteroid = a;
                }
            }
            if (closestAsteroid !== null) {
                const asteroid = closestAsteroid;
                const a = Vec2_angle(this.ship.pos, asteroid.pos);
                const surfaceDist = asteroid.surfaceDistance(a);
                const d = this.ship.pos.distance(asteroid.pos) - this.ship.radius - surfaceDist;
                if (d < 0) {
                    // landing, or impact? collision follows the polygon
                    // surface, so the ship rests ON the rock face (user
                    // 2026-11-08: circle collision left it hovering over air).
                    const aDiff = abs(this.ship.angle - a);
                    if (aDiff < PI / 4) {
                        const landing = new Landing15(
                            this.ship,
                            asteroid as unknown as Planet,
                            a,
                            (this.namer as Namer15).describeActivity(this.rng, asteroid as unknown as Planet),
                        );
                        this.ship.landing = landing;
                        Vec2_copy(this.ship.velocity, asteroid.velocity);
                        this.addConstraint(landing);
                    } else {
                        const impact = Vec2_makeWithAngleMag(Vec2.Zero(), a, surfaceDist).addSelf(asteroid.pos);
                        Vec2_makeWithAngleMag(this.ship.pos, a, surfaceDist + this.ship.radius - d).addSelf(asteroid.pos);
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

        solveSimulator.call(this, dt, constraints);
    }
}
