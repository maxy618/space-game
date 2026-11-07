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
import { Asteroid, Landing, Planet, Spacecraft, Spark, SparkStyle, Star, StarClass, StarClasses, UniverseConst } from "../universe/Universe";
import { Landing15, Spacecraft15 } from "../universe/Universe15";
import { Vec2, Vec2_angle, Vec2_copy, Vec2_makeWithAngleMag } from "../core/Vec2";
import { VisibleUniverse, ZoomedDrawScope } from "./VisibleUniverse";

const solveSimulator = Simulator.prototype.solveAll;

const PI = Math.PI;
const abs = Math.abs;
const sqrt = Math.sqrt;

/** Heat glow halo (temp_mission §6): orange radial glow, strength = heat 0..1. */
function shipHalo(context: CanvasRenderingContext2D, x: number, y: number, _zoom: number, heat: number) {
    const h = Math.min(1, Math.max(0, heat));
    const radiusM = 40 + h * 90; // world metres, grows with heat
    const grad = context.createRadialGradient(x, y, 4, x, y, radiusM);
    grad.addColorStop(0, "rgba(255,140,40," + (0.55 * h).toFixed(3) + ")");
    grad.addColorStop(0.5, "rgba(255,80,20," + (0.28 * h).toFixed(3) + ")");
    grad.addColorStop(1, "rgba(255,60,0,0)");
    context.fillStyle = grad;
    context.beginPath();
    context.arc(x, y, radiusM, 0, PI * 2);
    context.fill();
}

function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace("#", "");
    return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
}

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
            alpha: 0.05 + 0.03 * (i % 2) + next() * 0.03,
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
        // Heat shimmer shell (temp_mission §6): the hotter the ship, the
        // stronger the orange glow. Gradual, reversible, model-independent
        // (a halo around the ship position, no ship-specific geometry).
        const heat = (ship as any).heat as number;
        if (heat > 0.05 && !universe.isDestroyed) {
            shipHalo(this.context, ship.pos.x, ship.pos.y, this.zoom, heat);
        }
        const autopilot = ship.autopilot;
        if (autopilot !== null && autopilot.enabled) {
            this.drawAutopilot(autopilot);
        }
        // Destroyed husk: hidden for the respawn sequence (temp_mission §6).
        if (!universe.isDestroyed) this.drawSpacecraft(ship);
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
        for (const blob of this.nebulaBlobs) {
            // cull blobs far outside the visible world rect
            if (blob.x + blob.r < left || blob.x - blob.r > right
                || blob.y + blob.r < top || blob.y - blob.r > bottom) continue;
            context.save();
            context.translate(blob.x, blob.y);
            context.rotate(blob.rot);
            // Soft natural falloff (temp_mission §8): radial gradient (centre
            // slightly more visible, edge fully transparent) over the same
            // 12-vertex silhouette — no hard polygon edge. Palette kept, base
            // alpha raised ~1.4× so the colours read, still restrained.
            const steps = blob.rr.length;
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
            // Soft edge via radial rgba gradient (centre visible, edge 0).
            const rgb = hexToRgb(blob.color);
            const aMax = Math.min(0.19, blob.alpha * 1.5);
            const g2 = context.createRadialGradient(0, 0, blob.r * 0.05, 0, 0, blob.r * 1.05);
            g2.addColorStop(0, "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + aMax.toFixed(3) + ")");
            g2.addColorStop(0.55, "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + (aMax * 0.55).toFixed(3) + ")");
            g2.addColorStop(1, "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ",0)");
            context.fillStyle = g2;
            context.fill();
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
        // Minimum on-screen hull size (temp_mission §8): same rule as the
        // base renderer — art scales up to ≥10 CSS px when fully zoomed
        // out, outline stays ~1.3 CSS px, hitbox untouched, exhaust stays
        // at world scale (unscaled) so the flame never explodes.
        const hullDiameterM = 24;
        const minScreenPx = 10;
        const visualScale = Math.max(1, minScreenPx / (hullDiameterM * this.zoom));
        context.save();
        context.scale(visualScale, visualScale);
        // new in V: little landing legs (min-size scaled with the hull)
        if (ship.landing !== null) {
            context.strokeStyle = "#CCCCCC";
            context.lineWidth = 2 / (this.zoom * visualScale);
            context.stroke(this.spaceshipLegs);
        }
        // draw the ship
        context.fillStyle = Colors.Eigengrau;
        context.fill(this.spaceshipPath); // fauxpaque
        context.strokeStyle = ship.transit ? Colors.Black : Colors.White;
        context.lineWidth = 1.3 / (this.zoom * visualScale); // user 2026-11-08: 1.5x thinner hull outline
        context.stroke(this.spaceshipPath);
        context.restore();
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

    solveAll(dt: number, constraints: Set<Constraint>) {
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
