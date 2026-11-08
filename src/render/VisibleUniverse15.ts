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
import { Asteroid, CargoShip, Landing, Planet, Spacecraft, Spark, SparkStyle, Star, StarClass, StarClasses, Track, UniverseConst } from "../universe/Universe";
import { starHeatStep, STAR_CORONA_FACTOR } from "../universe/StarHeat";
import { createScanState, triggerScan, stepScan, scanWaveRadius, SCAN_WAVE_SECONDS, SCAN_RADIUS, type ScannableBody } from "../universe/Scanner";
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
        const colors = [
            "#7A6AA0", "#4A7A8A", "#8A6A9A", "#5A8AAA", "#9A6A8A", "#5A8A9A",
            "#A07A5A", "#6A8A6A", "#8A4A6A", "#4A6A8A", "#7A8A4A", "#9A5A7A",
        ];
        const blobs = colors.map((color, i) => ({
            x: (next() - 0.5) * 60000,
            y: (next() - 0.5) * 60000,
            r: 22000 + next() * 30000,
            rot: next() * PI * 2,
            color,
            // visible but restrained (user 2026-11-09 "красивые, максимально")
            alpha: 0.2 + 0.07 * (i % 2) + next() * 0.08,
            rr: Array.from({ length: 12 }, () => 0.65 + next() * 0.6),
        }));
        // GREAT nebula sheets (user 2026-11-09): 3 enormous clouds far from the
        // core — encountered occasionally while traveling, each a different
        // scale and hue. Never tiled, never noisy.
        const sheets = [
            { x: -190000, y: 150000, r: 110000, color: "#3A5E7E", alpha: 0.14 },
            { x: 220000, y: -120000, r: 80000, color: "#6E4E86", alpha: 0.13 },
            { x: 60000, y: 240000, r: 95000, color: "#3E7E6E", alpha: 0.14 },
        ];
        for (const sh of sheets) {
            blobs.push({
                ...sh,
                rot: next() * PI * 2,
                rr: Array.from({ length: 14 }, () => 0.6 + next() * 0.7),
            });
        }
        // SHOWCASE giants (user 2026-11-09): big, beautiful, inclined, rare —
        // few of them, so they read as accents, not wallpaper.
        const giants = [
            { x: -260000, y: -90000, r: 85000, color: "#8A5E9A", alpha: 0.26 },
            { x: 150000, y: 260000, r: 70000, color: "#4E7E9A", alpha: 0.24 },
            { x: 260000, y: 120000, r: 64000, color: "#9A5A8A", alpha: 0.22 },
        ];
        for (const g of giants) {
            blobs.push({
                ...g,
                rot: next() * PI * 2,
                rr: Array.from({ length: 16 }, () => 0.55 + next() * 0.75),
            });
        }
        return blobs;
    })();

    /**
     * Scanner reveal wave (user 2026-11-09 v2): PRETTIER sweep — bright
     * thin leading edge + soft trailing halo + a slower inner echo ring —
     * expanding to the FULL scan radius (the camera pulls out with it).
     * While the wave runs, a soft dark vignette ring marks the scanner's
     * reachable area: everything a scan CANNOT reach fades into the dark
     * (the world-cull below removes far bodies; the deep sky above stays).
     */
    drawScanWave(universe: VisibleUniverse15) {
        const s = universe.scan;
        const context = this.context;
        const ship = universe.ship.pos;
        const R = SCAN_RADIUS;
        if (s.waveAge >= 0) {
            const WAVE = 4; // seconds — long enough to be seen, not just missed
            const t = s.waveAge / WAVE;
            if (t <= 1) {
                const alpha = t < 0.6 ? 1 - t / 0.6 : (1 - t) / 0.4;
                // ease-out sweep to the full scan radius
                const r = R * (1 - (1 - Math.min(1, t)) * (1 - Math.min(1, t)));
                context.save();
                // trailing halo (wide, soft)
                context.strokeStyle = "rgba(167, 167, 202," + (0.22 * alpha) + ")";
                context.lineWidth = 26 / this.zoom;
                context.beginPath();
                context.arc(ship.x, ship.y, Math.max(1, r * 0.94), 0, PI * 2);
                context.stroke();
                // leading edge (thin, bright)
                context.strokeStyle = "rgba(198, 198, 232," + (0.9 * alpha) + ")";
                context.lineWidth = 3.5 / this.zoom;
                context.beginPath();
                context.arc(ship.x, ship.y, Math.max(1, r), 0, PI * 2);
                context.stroke();
                // inner echo ring (slower, faint)
                const re = R * (1 - (1 - Math.min(1, t / 1.5)) * (1 - Math.min(1, t / 1.5)));
                context.strokeStyle = "rgba(167, 167, 202," + (0.16 * alpha) + ")";
                context.lineWidth = 8 / this.zoom;
                context.beginPath();
                context.arc(ship.x, ship.y, Math.max(1, re * 0.62), 0, PI * 2);
                context.stroke();
                context.restore();
            }
        }
        // scan-area vignette (user 2026-11-09): DARKNESS AT THE LIMIT — but
        // only over the near world (deep sky keeps showing beyond); bodies
        // past the ring are culled, so the far dark reads as empty space.
        if (s.waveAge >= 0 && s.waveAge <= ZoomedDrawScope15.WAVE_SECONDS + 1.5) {
            const helper = this.helper;
            if (helper.width) {
                const grad = context.createRadialGradient(ship.x, ship.y, 0, ship.x, ship.y, R * 1.25);
                grad.addColorStop(0, "rgba(5,6,10,0)");
                grad.addColorStop(0.68, "rgba(5,6,10,0)");          // 0.85 R
                grad.addColorStop(0.78, "rgba(5,6,10,0.30)");       // ~0.98 R
                grad.addColorStop(0.9, "rgba(5,6,10,0.86)");
                grad.addColorStop(1, "rgba(4,5,8,0.97)");
                context.save();
                context.fillStyle = grad;
                context.fillRect(helper.x, helper.y, helper.width, helper.height);
                context.restore();
            }
        }
    }
    /** Non-null while the scan wave runs — used by body culling below. */
    private static WAVE_SECONDS = 5.5;

    /**
     * Alpha multiplier for world bodies during a scan: 1 inside the scan
     * area, fading between 0.85R…1.12R, fully invisible past that.
     * Returns 1 (fast path) when no scan runs.
     */
    private scanFadeMul(universe: VisibleUniverse15, pos: Vec2): number {
        const s = universe.scan;
        if (s.waveAge < 0 || s.waveAge > ZoomedDrawScope15.WAVE_SECONDS + 1.5) return 1;
        const d = pos.distance(universe.ship.pos);
        const R = SCAN_RADIUS;
        if (d <= R * 0.85) return 1;
        if (d >= R * 1.12) return 0;
        return clamp((R * 1.12 - d) / (R * 0.27), 0, 1);
    }

    /**
     * Route autopilot line (user 2026-11-09 v2): dashed chain from the ship
     * through EVERY route node. GREEN while the pilot flies, RED while
     * stopped on a threat (waiting for the player to steer back on course).
     * Unreached nodes carry small ring markers.
     */
    drawRouteLine(universe: VisibleUniverse15) {
        const nodes = universe.routeNodes;
        if (nodes.length === 0) return;
        const helper = this.helper;
        if (!helper.width) return;
        const context = this.context;
        const stopped = universe.routePhase === "stopped";
        const col = stopped ? "232,72,56" : "110,200,130";
        const ship = universe.ship.pos;
        context.save();
        context.strokeStyle = "rgba(" + col + ",0.42)";
        // Wish 44 (user 2026-11-09): route dash is THINNER and MORE FREQUENT
        // than the previous 5px / [18,14] dash — a fine chain, not a rope.
        context.lineWidth = 3.2 / this.zoom;
        context.setLineDash([7 / this.zoom, 5 / this.zoom]);
        context.beginPath();
        context.moveTo(ship.x, ship.y);
        for (let i = universe.routeNodeIdx; i < nodes.length; i++) {
            context.lineTo(nodes[i].x, nodes[i].y);
        }
        context.stroke();
        context.setLineDash([]);
        // node markers: solid for the current target, hollow for the rest
        for (let i = universe.routeNodeIdx; i < nodes.length; i++) {
            const n = nodes[i];
            context.beginPath();
            context.arc(n.x, n.y, (n.radius > 0 ? n.radius * 1.12 : 240) + 10 / this.zoom, 0, PI * 2);
            if (i === universe.routeNodeIdx) {
                context.strokeStyle = "rgba(" + col + ",0.75)";
                context.lineWidth = 2.4 / this.zoom;
            } else {
                context.strokeStyle = "rgba(" + col + ",0.4)";
                context.lineWidth = 1.6 / this.zoom;
            }
            context.stroke();
        }
        context.restore();
    }

    /**
     * Impact-ring marker around the threatened body (user 2026-11-08).
     * Reads the threat from the sim universe (set by the app layer at 10 Hz).
     * Restrained HUD styling: dashed ring + soft opacity breathing — no glow
     * effects, the alert must read as instrument, not decoration.
     */
    drawImpactThreat(universe: VisibleUniverse15) {
        const t = universe.impactThreat;
        if (t === null) return;
        const context = this.context;
        const helper = this.helper;
        if (!helper.width) return;
        // on-screen cull
        if (t.x + t.radius * 2 < helper.x || t.x - t.radius * 2 > helper.x + helper.width
            || t.y + t.radius * 2 < helper.y || t.y - t.radius * 2 > helper.y + helper.height) return;
        const now = performance.now() / 1000;
        const col = t.level === "critical" ? "232,72,56" : "214,164,66";
        const breathe = 0.5 + 0.5 * Math.sin(now * (t.level === "critical" ? 7 : 3.2));
        context.save();
        // dashed ring just outside the body silhouette
        context.strokeStyle = "rgba(" + col + "," + (0.5 + 0.3 * breathe) + ")";
        context.lineWidth = 2 / this.zoom;
        context.setLineDash([9 / this.zoom, 7 / this.zoom]);
        context.beginPath();
        context.arc(t.x, t.y, t.radius * 1.18 + (2 + 3 * breathe) / this.zoom, 0, PI * 2);
        context.stroke();
        context.setLineDash([]);
        context.restore();
    }

    drawUniverse(universe: VisibleUniverse) {
        // Deepest background: parallax starfield art is drawn by the app
        // layer (space()); world-fixed nebula blobs sit ABOVE it, under all
        // bodies (user 2026-11-09): sparse, big, beautiful — never a grid.
        this.drawNebula();
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
        const u15 = universe as VisibleUniverse15;
        const context = this.context;
        universe.entities.forEach(it => {
            if (it === universe.star) return; // don't draw the star as a planet
            if (it instanceof Spark) {
                this.drawSpark(it);
            } else if (it instanceof Asteroid) {
                if (this.scanFadeMul(u15, it.pos) <= 0) return;
                context.globalAlpha = this.scanFadeMul(u15, it.pos);
                this.drawAsteroid(it);
                context.globalAlpha = 1;
            } else if (it instanceof CargoShip) {
                if (this.scanFadeMul(u15, it.pos) <= 0) return;
                context.globalAlpha = this.scanFadeMul(u15, it.pos);
                this.drawCargoShip(it);
                context.globalAlpha = 1;
            } else if (it instanceof Planet) {
                if (this.scanFadeMul(u15, it.pos) <= 0) return;
                context.globalAlpha = this.scanFadeMul(u15, it.pos);
                this.drawPlanet(it);
                context.globalAlpha = 1;
            }
        });
        // runtime object is always VisibleUniverse15 (drawUniverse is
        // overridden there); the scope API keeps the base type
        this.drawImpactThreat(universe as VisibleUniverse15);
        this.drawRouteLine(universe as VisibleUniverse15);
        this.drawScanWave(universe as VisibleUniverse15);
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

    /**
     * NPC cargo ships (user 2026-11-09): long hauler silhouette with a pale
     * cargo spine, amber/blue running light, and faint engine streak.
     */
    drawCargoShip(ship: CargoShip) {
        const context = this.context;
        const helper = this.helper;
        if (!helper.width) return;
        const left = helper.x;
        const top = helper.y;
        const right = left + helper.width;
        const bottom = top + helper.height;
        if (ship.pos.x + 140 < left || ship.pos.x - 140 > right
            || ship.pos.y + 80 < top || ship.pos.y - 80 > bottom) return;
        // The camera zoom can make a 118 m hull sub-pixel. Scale geometry in
        // screen space so a hauler remains recognizable at flight range.
        const hullLengthWorld = 118;
        const hullScale = Math.max(1, 44 / (hullLengthWorld * this.zoom));
        context.save();
        context.translate(ship.pos.x, ship.pos.y);
        context.rotate(ship.angle);
        context.scale(hullScale, hullScale);
        context.fillStyle = "rgba(70,66,74,0.92)";
        context.strokeStyle = "rgba(226,204,160,0.65)";
        context.lineWidth = 1.4 / Math.max(this.zoom, 0.000001) / hullScale;
        context.beginPath();
        context.moveTo(58, 0);
        context.lineTo(26, -13);
        context.lineTo(-48, -11);
        context.lineTo(-60, 0);
        context.lineTo(-48, 11);
        context.lineTo(26, 13);
        context.closePath();
        context.fill();
        context.stroke();
        context.fillStyle = ship.hue;
        context.fillRect(-34, -4, 52, 8);
        context.fillStyle = "rgba(255,255,255,0.86)";
        context.fillRect(40, -4, 7, 8);
        context.strokeStyle = "rgba(220,190,130,0.28)";
        context.lineWidth = 2.2 / Math.max(this.zoom, 0.000001) / hullScale;
        context.beginPath();
        context.moveTo(-60, -5);
        context.lineTo(-92, -5);
        context.moveTo(-60, 5);
        context.lineTo(-92, 5);
        context.stroke();
        context.restore();
    }
    /**
     * Nebulae are DETERMINISTIC and STATIC (world-fixed), so each blob is
     * pre-rendered once into a 256×256 sprite (halo blur baked) and blitted
     * per frame — a single drawImage, no per-frame shadowBlur (which is
     * expensive for the huge great-sheets, and a mobile-killer).
     */
    private nebulaSprites: Array<HTMLCanvasElement | null> | null = null;

    private buildNebulaSprites() {
        const dpr = window.devicePixelRatio || 1;
        const SPRITE_PX = Math.round(512 * dpr);
        const sprites = this.nebulaBlobs.map(blob => {
            const canvas = document.createElement("canvas");
            canvas.width = SPRITE_PX;
            canvas.height = SPRITE_PX;
            const ctx = canvas.getContext("2d");
            if (!ctx) return null;
            // sprite spans [-1.3r, 1.3r] of the blob (halo margin included)
            const scale = SPRITE_PX / (2.6 * blob.r);
            ctx.translate(SPRITE_PX / 2, SPRITE_PX / 2);
            ctx.rotate(blob.rot);
            // halo pass (blur in sprite px: 0.12 × r in world = 0.312 × SPRITE_PX / 2.6)
            ctx.shadowColor = blob.color;
            ctx.shadowBlur = SPRITE_PX * 0.046;
            ctx.fillStyle = blob.color;
            ctx.globalAlpha = blob.alpha * 0.85;
            this.traceNebulaPath(ctx, blob, scale);
            ctx.fill();
            // core pass (crisp, translucent)
            ctx.shadowBlur = 0;
            ctx.globalAlpha = blob.alpha * 0.8;
            this.traceNebulaPath(ctx, blob, scale);
            ctx.fill();
            // DETAIL (user 2026-11-09): bright filaments, hot knots, dust —
            // baked in, zero per-frame cost.
            ctx.globalCompositeOperation = "lighter";
            for (let f = 0; f < 5; f++) {
                const fa = (f / 5) * PI * 2 + 0.7 + blob.r * 0.000013;
                const fd = blob.r * (0.12 + 0.11 * f) * scale;
                const fl = blob.r * (0.38 - f * 0.05) * scale;
                ctx.save();
                ctx.translate(Math.cos(fa) * fd, Math.sin(fa) * fd * 0.72);
                ctx.rotate(fa);
                ctx.globalAlpha = blob.alpha * (0.55 - f * 0.05);
                ctx.shadowColor = blob.color;
                ctx.shadowBlur = SPRITE_PX * 0.02;
                ctx.fillStyle = f % 2 === 0 ? "#FFF4E0" : blob.color;
                ctx.beginPath();
                ctx.ellipse(0, 0, fl, fl * 0.16, 0, 0, PI * 2);
                ctx.fill();
                ctx.restore();
            }
            ctx.shadowBlur = 0;
            ctx.globalCompositeOperation = "source-over";
            if (blob.r > 60_000) {
                // GREAT SHEETS — real-photo composition (user 2026-11-09):
                // bright inner filaments + dark dust lanes over the base,
                // all baked into the sprite (draw-time cost stays one blit).
                ctx.globalCompositeOperation = "lighter";
                ctx.shadowColor = blob.color;
                ctx.shadowBlur = SPRITE_PX * 0.03;
                ctx.fillStyle = blob.color;
                for (let f = 0; f < 3; f++) {
                    const fa = (f / 3) * PI * 2 + 0.7;
                    const fd = blob.r * (0.18 + 0.16 * f) * scale;
                    const fl = blob.r * (0.34 - f * 0.07) * scale;
                    ctx.save();
                    ctx.translate(Math.cos(fa) * fd, Math.sin(fa) * fd * 0.72);
                    ctx.rotate(fa);
                    ctx.globalAlpha = blob.alpha * 0.5;
                    ctx.beginPath();
                    ctx.ellipse(0, 0, fl, fl * 0.22, 0, 0, PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
                ctx.shadowBlur = 0;
                ctx.globalCompositeOperation = "destination-out";
                for (let f = 0; f < 2; f++) {
                    const fa = PI + (f / 2) * PI + 0.4;
                    const fd = blob.r * (0.3 + 0.14 * f) * scale;
                    ctx.save();
                    ctx.translate(Math.cos(fa) * fd, Math.sin(fa) * fd * 0.72);
                    ctx.rotate(fa + 0.5);
                    ctx.globalAlpha = 0.30;
                    ctx.fillStyle = "black";
                    ctx.beginPath();
                    ctx.ellipse(0, 0, blob.r * 0.22 * scale, blob.r * 0.07 * scale, 0, 0, PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
                ctx.globalCompositeOperation = "source-over";
            }
            return canvas;
        });
        this.nebulaSprites = sprites;
    }

    /** The irregular squashed polygon of a nebula blob, sprite-scaled. */
    private traceNebulaPath(ctx: CanvasRenderingContext2D, blob: { r: number; rr: number[] }, scale: number) {
        const steps = blob.rr.length;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
            const a = (i / steps) * PI * 2;
            const rr = blob.r * blob.rr[i % steps];
            const px = Math.cos(a) * rr * scale;
            const py = Math.sin(a) * rr * 0.72 * scale; // squash → filament feel
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    }

    drawNebula() {
        if (!this.nebulaSprites) this.buildNebulaSprites();
        const context = this.context;
        const helper = this.helper;
        if (!helper.width || !this.nebulaSprites) return;
        const left = helper.x;
        const top = helper.y;
        const right = left + helper.width;
        const bottom = top + helper.height;
        const world = helper.width / this.zoom; // visible world span
        for (let i = 0; i < this.nebulaBlobs.length; i++) {
            const blob = this.nebulaBlobs[i];
            const sprite = this.nebulaSprites[i];
            if (!sprite) continue;
            // cull blobs far outside the visible world rect
            if (blob.x + blob.r * 1.3 < left || blob.x - blob.r * 1.3 > right
                || blob.y + blob.r * 1.3 < top || blob.y - blob.r * 1.3 > bottom) continue;
            const size = Math.min(2400, blob.r * 2.6 * this.zoom); // cap blit (GPU mobile safety)
            context.save();
            context.globalAlpha = 1; // alpha baked into the sprite
            context.drawImage(sprite, blob.x - size / 2, blob.y - size / 2, size, size);
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
        // LEFT/RIGHT steering engines (stub rework, user 2026-11-09): small
        // opposed nozzles at the rear corners; they puff sideways while the
        // A/D motor spools — sign indicates the turn direction.
        {
            const motor = (ship as unknown as Spacecraft15).steerMotor ?? 0;
            const m = Math.abs(motor);
            if (m > 0.05) {
                const t = performance.now() / 1000;
                const flick = 0.85 + 0.15 * Math.sin(t * 29);
                const len = (6 + m * 16) * flick;
                // engine on the side OPPOSITE the turn blows (turn = push):
                // turning right (+motor) → left nozzle fires, and vice versa.
                const side = motor > 0 ? -1 : 1;
                const px = -5;
                const py = side * 6.5;
                context.save();
                context.translate(px, py);
                context.fillStyle = "rgba(170,225,255," + (0.25 + m * 0.55) + ")";
                context.beginPath();
                context.moveTo(0, -1.8);
                context.lineTo(-len, 0);
                context.lineTo(0, 1.8);
                context.closePath();
                context.fill();
                context.fillStyle = "rgba(255,255,255," + (0.3 + m * 0.5) + ")";
                context.beginPath();
                context.moveTo(0, -0.9);
                context.lineTo(-len * 0.55, 0);
                context.lineTo(0, 0.9);
                context.closePath();
                context.fill();
                context.restore();
            }
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
    /**
     * Current collision-warning target (user 2026-11-08), set by the app
     * layer from CollisionPredict (~10 Hz; null = no threat). Read by the
     * draw scope to render the impact ring.
     */
    impactThreat: { x: number; y: number; radius: number; tti: number; level: "warning" | "critical" } | null = null;

    /** Route autopilot (user 2026-11-09): target body + phase, for the line. */
    safetyEnabled = true;
    voidActive = false;
    voidNear = 0;
    routeTarget: Planet | null = null;
    routePhase: "chase" | "brake" | "arrived" | "stopped" | "off" = "off";
    /** Multi-waypoint route (user 2026-11-09): world-space nodes. */
    routeNodes: Array<{ x: number; y: number; radius: number }> = [];
    routeNodeIdx = 0;

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
        this.spawnAsteroids();
        this.planets.sort((a, b) => a.pos.distance(this.star.pos) - b.pos.distance(this.star.pos));
        this.planets.forEach((planet, idx) => planet.name = (systemName + " " + (idx + 1)));
        this.spawnCargoShips();
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
     * Scanner state (user 2026-11-09): cooldown + expanding reveal wave.
     * Lives on the universe so both sim step and renderer read one source.
     */
    scan = createScanState();
    /** Bodies revealed by the LAST scan (ids) — for the discovery ping. */
    scanRevealedIds: number[] = [];

    /**
     * Trigger the scanner. Returns the number of newly revealed bodies
     * (0 when on cooldown). Planets, ASTEROIDS (user 2026-11-09: big rocks
     * are scannable too), cargo traffic and the STAR (its class stays
     * unknown until scanned) are all revealed.
     */
    triggerScan(): { total: number; planets: number; asteroids: number; else_: number } {
        const started = triggerScan(this.scan);
        if (!started) return { total: 0, planets: 0, asteroids: 0, else_: 0 };
        const shipPos = this.ship.pos;
        let planets = 0;
        let asteroids = 0;
        let else_ = 0;
        for (const p of this.planets) {
            if (p.scanned) continue;
            if (p.pos.distance(shipPos) <= SCAN_RADIUS) {
                p.scanned = true;
                planets++;
            }
        }
        if (!this.star.scanned && this.star.pos.distance(shipPos) <= SCAN_RADIUS) {
            this.star.scanned = true;
            else_++;
        }
        for (const a of this.asteroids) {
            if (a.scanned) continue;
            if (a.pos.distance(shipPos) <= SCAN_RADIUS) {
                a.scanned = true;
                asteroids++;
            }
        }
        for (const ship of this.cargoShips) {
            if (ship.scanned) continue;
            if (ship.pos.distance(shipPos) <= SCAN_RADIUS) {
                ship.scanned = true;
                else_++;
            }
        }
        return { total: planets + asteroids + else_, planets, asteroids, else_ };
    }

    /**
     * Stellar hazard (user 2026-11-08): advance the ship's heat against the
     * system star. Zones scale with the star radius (StarHeat.ts); the
     * hot-zone COUNTDOWN (2026-11-09) destroys on expiry, or touching the
     * star destroys instantly. State is exposed for the warning HUD.
     */
    starProximity = 0;
    starCountdown: number | null = null;
    starHot = false;
    updateStarHazard(dt: number) {
        const ship = this.ship;
        const dist = ship.pos.distance(this.star.pos);
        const res = starHeatStep(ship.heat, dist, this.star.radius, dt, ship.profile.heatTolerance, ship.profile.coolRate, this.starCountdown);
        ship.heat = res.heat;
        this.starProximity = res.proximity;
        this.starHot = res.hot;
        this.starCountdown = res.countdown;
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

    /**
     * Impact-FX budget (user 2026-11-08): while the hull grinds against an
     * obstacle with thrust held, sparks spawn at most once per cooldown,
     * scaled by the closing speed, and subject to a global live-particle
     * cap. The old behavior fired 10 new Sparks on EVERY solve frame —
     * ~600–1200 live particles, each with its own draw call, collapsing
     * the FPS exactly when the player leaned on a rock (and the falling
     * FPS multiplied sub-steps, spawning even more — a runaway loop).
     */
    private impactFxCooldown = 0;
    /** Global live-particle budget shared by impact FX and destruction. */
    static readonly MAX_LIVE_SPARKS = 240;

    private countLiveSparks(): number {
        let n = 0;
        this.entities.forEach(e => { if (e instanceof Spark) n++; });
        return n;
    }

    /** Public read for the debug state (QA). */
    countLiveSparksPublic(): number {
        return this.countLiveSparks();
    }

    /**
     * Spawn a velocity-scaled impact burst at (x, y) — shared by planet and
     * asteroid contacts. Called only when the FX cooldown has elapsed.
     * Visibility matters (user 2026-11-09): sparks fly OUT of the surface
     * (outward cone around the surface normal) with a fraction of the
     * reflected closing velocity — the old sparks inherited 0.8 × ship
     * velocity and simply traveled WITH the ship, invisible. Warm palette,
     * bigger dots, short lifetime: readable, not noisy.
     */
    private spawnImpactSparks(impactX: number, impactY: number, closingSpeed: number, normalAngle: number, shipVx: number, shipVy: number) {
        const budget = VisibleUniverse15.MAX_LIVE_SPARKS - this.countLiveSparks();
        if (budget <= 0) return;
        const count = Math.min(
            budget,
            clamp(Math.round(3 + closingSpeed / 250), 3, 10),
        );
        const palette = ["#FFFFFF", "#FFE9C8", "#FFC46A", "#FF9A4A"];
        const cone = 2.1; // ±120° around the outward normal
        for (let it = 0; it < count; it++) {
            const spark = new Spark(
                this.rng.minmax(0.4, 1.2),
                false,
                0,
                SparkStyle.DOT,
                palette[it % palette.length],
                1.6
            );
            spark.pos.x = impactX;
            spark.pos.y = impactY;
            Vec2_copy(spark.opos, spark.pos);
            // outward ejection: cone around the surface normal, speed scales
            // with the impact energy, plus a light bounce off the hull motion
            const ejection = this.rng.minmax(60, 160 + closingSpeed * 0.25);
            Vec2_makeWithAngleMag(
                spark.velocity,
                normalAngle + this.rng.minmax(-cone / 2, cone / 2),
                ejection
            );
            spark.velocity.x += shipVx * 0.35;
            spark.velocity.y += shipVy * 0.35;
            this.addEntity(spark);
        }
    }

    solveAll(dt: number, constraints: Set<Constraint>) {
        // tick the impact-FX cooldown
        if (this.impactFxCooldown > 0) this.impactFxCooldown = Math.max(0, this.impactFxCooldown - dt);

        // Border strike (user 2026-11-09): pressing into the system
        // ringfence used to be silent (no sparks) and render-expensive. Now
        // the strike throws sparks like any impact (budgeted, same as others).
        {
            const d = this.ship.pos.mag();
            const R = this.ringfence.radius;
            if (d + this.ship.radius >= R - 20 && this.ship.pos.mag() > 0) {
                const a = Vec2_angle(this.ship.pos, Vec2.Zero()); // outward normal (center → ship)
                const n = Vec2_makeWithAngleMag(Vec2.Zero(), a, 1);
                const radialVel = this.ship.velocity.x * n.x + this.ship.velocity.y * n.y;
                if (radialVel > 40 && this.impactFxCooldown <= 0) {
                    this.impactFxCooldown = 0.12;
                    const nose = Vec2_makeWithAngleMag(Vec2.Zero(), this.ship.angle, this.ship.radius).addSelf(this.ship.pos);
                    this.spawnImpactSparks(nose.x, nose.y, radialVel, a, this.ship.velocity.x, this.ship.velocity.y);
                }
            }
        }

        // Stellar hazard (user 2026-11-08): corona heating, destruction and
        // respawn run before any collision logic each step.
        this.updateStarHazard(dt);
        stepScan(this.scan, dt);

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

                    // landing criteria: nose aligned AND slow enough to touch
                    // down (user 2026-11-09: high-speed contacts must be
                    // CRASHES, never elastic landings)
                    if (aDiff < PI / 4 && vDiff < 300) {
                        const landing = new Landing15(this.ship, planet, a, (this.namer as Namer15).describeActivity(this.rng, planet));
                        this.ship.landing = landing;
                        Vec2_copy(this.ship.velocity, planet.velocity);
                        this.addConstraint(landing);

                        // landing == scanning (user 2026-11-09): touching the
                        // body IS the scan — data is revealed on the map.
                        planet.explored = true;
                        planet.scanned = true;
                        this.latestDiscovery = planet;
                    } else {
                        const impact = Vec2_makeWithAngleMag(Vec2.Zero(), a, planet.radius).addSelf(planet.pos);
                        const relVx = this.ship.velocity.x - planet.velocity.x;
                        const relVy = this.ship.velocity.y - planet.velocity.y;
                        this.resolveHardImpact(impact.x, impact.y, a, relVx, relVy, dt, planet.velocity, planet);

                        // budgeted impact FX (user 2026-11-08): see
                        // spawnImpactSparks — once per cooldown, velocity-scaled
                        if (this.impactFxCooldown <= 0) {
                            this.impactFxCooldown = 0.12;
                            this.spawnImpactSparks(impact.x, impact.y, Math.hypot(relVx, relVy), a, relVx, relVy);
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
                    // Landing accepts nose-first approach too (user 2026-11-09):
                    // the pilot descends nose-down onto the rock; the solver
                    // then stands him upright on the face normal.
                    const aDiff = abs(this.ship.angle - a);
                    const inwardDiff = abs(abs(aDiff) - PI);
                    const aligned = aDiff < PI / 4 || inwardDiff < PI / 4;
                    const vDiff = (this.ship.velocity.distance(asteroid.velocity));
                    if (aligned && vDiff < 300) {
                        const normal = asteroid.surfaceNormal(a);
                        const landing = new Landing15(
                            this.ship,
                            asteroid as unknown as Planet,
                            a,
                            (this.namer as Namer15).describeActivity(this.rng, asteroid as unknown as Planet),
                            asteroid.surfaceDistance(a),
                            normal,
                        );
                        this.ship.landing = landing;
                        Vec2_copy(this.ship.velocity, asteroid.velocity);
                        this.addConstraint(landing);
                        // landing == scanning (user 2026-11-09)
                        asteroid.scanned = true;
                    } else {
                        const impact = Vec2_makeWithAngleMag(Vec2.Zero(), a, surfaceDist).addSelf(asteroid.pos);
                        const relVx = this.ship.velocity.x - asteroid.velocity.x;
                        const relVy = this.ship.velocity.y - asteroid.velocity.y;
                        this.resolveHardImpact(impact.x, impact.y, a, relVx, relVy, dt, asteroid.velocity, asteroid);

                        // budgeted impact FX (user 2026-11-08): see
                        // spawnImpactSparks — once per cooldown, velocity-scaled
                        if (this.impactFxCooldown <= 0) {
                            this.impactFxCooldown = 0.12;
                            this.spawnImpactSparks(impact.x, impact.y, Math.hypot(relVx, relVy), a, relVx, relVy);
                        }
                    }
                }
            }
        }

        solveSimulator.call(this, dt, constraints);
    }

    /**
     * Realistic hard impact (user 2026-11-09): no super-speed ejection.
     * The old code pushed the ship POSITION out inside solveAll, and the
     * position-based-dynamics postUpdate then derived that push as extra
     * velocity — a glancing hit could fling the ship away at 10 000 m/s.
     * Now: push out AND pin opos so the derived velocity equals the
     * explicitly reflected one; tangential speed is damped by impact
     * severity (a hard hit barely slides); extreme closing speed destroys
     * the ship outright.
     */
    private resolveHardImpact(
        impactX: number, impactY: number, normalA: number,
        relVx: number, relVy: number, dt: number,
        bodyVel: Vec2, body: { pos: Vec2, radius: number },
    ) {
        const ship = this.ship;
        // normal a points body→ship
        const nx = Math.cos(normalA);
        const ny = Math.sin(normalA);
        // 1. push out along the surface normal
        {
            const dPen = ship.pos.distance(body.pos) - body.radius - ship.radius; // ≤ 0 here
            const push = -dPen;
            ship.pos.x += nx * push;
            ship.pos.y += ny * push;
        }
        // 2. explicit reflection (never the old PBD position trick)
        const vn = relVx * nx + relVy * ny; // < 0 while moving INTO the body
        const tx = relVx - vn * nx;
        const ty = relVy - vn * ny;
        // severity: hard hits slide less and rebound less
        const hard = vn < -3000;
        const mid = vn < -700;
        const vtKeep = hard ? 0.3 : mid ? 0.55 : 0.9;
        const rebound = hard ? 0.08 : mid ? 0.18 : 0.3;
        const vnOut = Math.max(0, -vn) * rebound; // always outward
        ship.velocity.x = bodyVel.x + tx * vtKeep + nx * vnOut;
        ship.velocity.y = bodyVel.y + ty * vtKeep + ny * vnOut;
        // 3. pin opos so postUpdate derives EXACTLY this velocity
        ship.opos.x = ship.pos.x - ship.velocity.x * dt;
        ship.opos.y = ship.pos.y - ship.velocity.y * dt;
        // 4. extreme speed: the crash destroys the ship (realistic)
        const relSpeed = Math.hypot(relVx, relVy);
        if (relSpeed > 5500) this.destroyShip();
    }
}
