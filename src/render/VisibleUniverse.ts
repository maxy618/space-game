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

import { CanvasHelper } from "../core/CanvasHelper";
import { Colors } from "../core/Colors";
import { LOG } from "../core/Debug";
import { lerp } from "../core/MathHelpers";
import { clamp } from "../core/Maths";
import { Namer } from "../core/Namer";
import { createPolygon, createStar, parseSvgPathData } from "../core/PathTools";
import { Container } from "../core/Physics";
import { Landing, Planet, Spacecraft, Spark, SparkStyle, Star, Track, Universe, UniverseConst } from "../universe/Universe";
import { Vec2, Vec2_makeWithAngleMag } from "../core/Vec2";

const DRAW_ORBITS = true;
const DRAW_GRAVITATIONAL_FIELDS = true;
const DRAW_STAR_GRAVITATIONAL_FIELDS = true;
const SIMPLE_TRACK_DRAWING = true

const enum VisibleUniverseConst {
    STAR_POINTS = 31,
    MIN_REFRESH_MILLIS = 24
}

const PI = Math.PI;
const ceil = Math.ceil;
const max = Math.max;
const sqrt = Math.sqrt;

/**
 * A zoomedDrawScope is one that is scaled, but remembers its zoom level, so you can correct for it
 * if you want to draw single-pixel lines. Which we do.
 */
export class ZoomedDrawScope {
    /** Zoom scale; assigned externally per frame. */
    zoom!: number;
    context!: CanvasRenderingContext2D;
    helper!: CanvasHelper;
    containerDash: Array<number> = [0, 0];

    readonly spaceshipPath = parseSvgPathData("\nM11.853 0\nC11.853 -4.418 8.374 -8 4.083 -8\nL-5.5 -8\nC-6.328 -8 -7 -7.328 -7 -6.5\nC-7 -5.672 -6.328 -5 -5.5 -5\nL-2.917 -5\nC-1.26 -5 0.083 -3.657 0.083 -2\nL0.083 2\nC0.083 3.657 -1.26 5 -2.917 5\nL-5.5 5\nC-6.328 5 -7 5.672 -7 6.5\nC-7 7.328 -6.328 8 -5.5 8\nL4.083 8\nC8.374 8 11.853 4.418 11.853 0\nZ\n");

    readonly thrustPath = createPolygon(-3, 3, -4, 0);

    drawUniverse(universe: VisibleUniverse) {
        // triggerDraw.value // Please recompose when this value changes.

        //        star.drawZoomed(ds, zoom)
        //        planets.forEach { p ->
        //            p.drawZoomed(ds, zoom)
        //            if (p == follow) {
        //                drawCircle(Color.Red, 20f / zoom, p.pos)
        //            }
        //        }
        //
        //        ship.drawZoomed(ds, zoom)

        universe.constraints.forEach(it => {
            if (it instanceof Landing) {
                this.drawLanding(it);
            } else if (it instanceof Container) {
                this.drawContainer(it);
            }
        });
        this.drawStar(universe.star);
        universe.entities.forEach(it => {
            if (it === universe.ship || it === universe.star) return; // draw the ship last
            if (it instanceof Spacecraft) {
                this.drawSpacecraft(it);
            } else if (it instanceof Spark) {
                this.drawSpark(it);
            } else if (it instanceof Planet) {
                this.drawPlanet(it);
            }
        });
        this.drawSpacecraft(universe.ship);
    }

    drawContainer(container: Container) {
        const context = this.context;
        const helper = this.helper;
        const dash = this.containerDash;
        dash[0] = dash[1] = 8 / this.zoom;
        context.setLineDash(dash);
        // SYSTEM BORDER (user 2026-11-09, FPS fix): the old code stroked one
        // arc with radius UNIVERSE_RANGE (200 km) EVERY frame — on mobile
        // GPUs that giant curve tessellation killed the frame rate whenever
        // the border was on screen. Now only the VISIBLE angular window is
        // drawn, as ≤64 short chords (radius ~200 km: at most ~100° shows).
        const R = container.radius;
        const hw = helper.x + helper.width / 2;
        const hh = helper.y + helper.height / 2;
        const cx = hw;
        const cy = hh;
        const screenR = Math.hypot(helper.width / 2, helper.height / 2);
        if (Math.hypot(cx, cy) - screenR > R) { helper.clearLineDash(); return; } // off-screen entirely
        const maxAng = Math.asin(Math.min(1, screenR / R));
        let a0 = Math.atan2(cy, cx) - maxAng;
        let a1 = Math.atan2(cy, cx) + maxAng;
        if (a1 - a0 > PI * 2) { a0 = 0; a1 = PI * 2; }
        const segs = 64;
        context.strokeStyle = "#800000";
        context.lineWidth = 1 / this.zoom;
        context.beginPath();
        for (let i = 0; i <= segs; i++) {
            const a = a0 + (a1 - a0) * (i / segs);
            const px = cx + Math.cos(a) * R;
            const py = cy + Math.sin(a) * R;
            if (i === 0) context.moveTo(px, py);
            else context.lineTo(px, py);
        }
        context.stroke();
        helper.clearLineDash();
    }

    drawGravitationalField(planet: Planet) {
        const helper = this.helper;
        const rings = 8;
        for (let i = 0; i < rings; i++) {
            const force = lerp(
                200,
                0.01,
                i / rings
            ); // first rings at force = 1N, dropping off after that
            const r = sqrt(UniverseConst.GRAVITATION * planet.mass * UniverseConst.SPACECRAFT_MASS / force);
            helper.drawCircle("rgba(255,0,0," + lerp(0.5, 0.1, i / rings) + ")", 2 / this.zoom, planet.pos.x, planet.pos.y, r);
        }
    }

    drawPlanet(planet: Planet) {
        const context = this.context;
        const helper = this.helper;
        if (DRAW_ORBITS) {
            helper.drawCircle("rgba(0,255,255,0.5)", 1 / this.zoom, planet.orbitCenter.x, planet.orbitCenter.y, planet.pos.distance(planet.orbitCenter));
        }

        if (DRAW_GRAVITATIONAL_FIELDS) {
            this.drawGravitationalField(planet);
        }

        // Layered disc (P07-T02): base fill → deterministic regional patches →
        // limb stroke. Patches break the disc silhouette differently per planet
        // (tied to its visualSeed), never a palette-swap clone.
        const px = planet.pos.x;
        const py = planet.pos.y;
        const r = planet.radius;
        // vacuum gradient (limb darker): layered alpha circles, outermost first
        context.fillStyle = planet.color;
        context.globalAlpha = 0.24;
        context.beginPath();
        context.arc(px, py, r * 1.18, 0, PI * 2);
        context.fill();
        context.globalAlpha = 0.45;
        context.beginPath();
        context.arc(px, py, r * 1.09, 0, PI * 2);
        context.fill();
        context.globalAlpha = 1;

        helper.fillCircle(Colors.Eigengrau, px, py, r);

        // regional patches: seeded pseudo-random blotches inside the disc
        const seed = planet.visualSeed;
        const patchCount = 3 + Math.floor(seed * 3); // 3..5 patches
        for (let i = 0; i < patchCount; i++) {
            const a = seed * 6.283 + i * 2.39996; // golden-angle spread
            const rr = r * 0.3 * ((seed * (i + 1)) % 1 + 0.4);
            const d = r * 0.45 * ((seed + i * 0.37) % 1);
            context.fillStyle = planet.color;
            context.globalAlpha = 0.12 + (i % 2) * 0.06;
            context.beginPath();
            context.arc(px + Math.cos(a) * d, py + Math.sin(a) * d, Math.max(rr, r * 0.06), 0, PI * 2);
            context.fill();
        }
        context.globalAlpha = 1;

        // terminator: a soft shadow crescent on the night side
        context.fillStyle = "rgba(0,0,0,0.22)";
        context.beginPath();
        context.arc(px - r * 0.18, py, r * 0.86, 0, PI * 2);
        context.fill();

        helper.drawCircle(planet.color, 2 / this.zoom, px, py, r);
    }

    drawStar(star: Star) {
        const context = this.context;
        const helper = this.helper;
        const oldHelperX = helper.x;
        const oldHelperY = helper.y;
        helper.x -= star.pos.x;
        helper.y -= star.pos.y;
        context.save();
        context.translate(star.pos.x, star.pos.y);

        helper.fillCircle(star.color, 0, 0, star.radius);

        if (DRAW_STAR_GRAVITATIONAL_FIELDS) this.drawGravitationalField(star);

        context.save();
        context.rotate(star.anim / 23 * PI * 2);
        context.strokeStyle = star.color;
        context.lineWidth = 3 / this.zoom;
        context.lineJoin = "round";
        context.stroke(createStar(
            star.radius + 80,
            star.radius + 250,
            VisibleUniverseConst.STAR_POINTS
        ));
        context.restore();
        context.rotate(star.anim / -19 * PI * 2);
        context.strokeStyle = star.color;
        context.lineWidth = 3 / this.zoom;
        context.lineJoin = "round";
        context.stroke(createStar(
            star.radius + 20,
            star.radius + 200,
            VisibleUniverseConst.STAR_POINTS + 1
        ));
        context.restore();
        helper.x = oldHelperX;
        helper.y = oldHelperY;
    }
    drawSpacecraft(ship: Spacecraft) {
        const context = this.context;
        const helper = this.helper;
        const oldHelperX = helper.x;
        const oldHelperY = helper.y;
        helper.x -= ship.pos.x;
        helper.y -= ship.pos.y;
        context.save();
        context.translate(ship.pos.x, ship.pos.y);
        context.rotate(ship.angle);
        //                drawPath(
        //                    path = createStar(200f, 100f, 3),
        //                    color = Color.White,
        //                    style = Stroke(width = 2f / zoom)
        //                )
        context.fillStyle = Colors.Eigengrau;
        context.fill(this.spaceshipPath); // fauxpaque
        context.strokeStyle = ship.transit ? Colors.Black : Colors.White;
        context.lineWidth = 2 / this.zoom;
        context.stroke(this.spaceshipPath);
        if (ship.thrust.x !== 0 || ship.thrust.y !== 0) {
            context.strokeStyle = "#FF8800";
            context.lineJoin = "round";
            context.lineWidth = 2 / this.zoom;
            context.stroke(this.thrustPath);
        }
        //                drawRect(
        //                    topLeft = Offset(-1f, -1f),
        //                    size = Size(2f, 2f),
        //                    color = Color.Cyan,
        //                    style = Stroke(width = 2f / zoom)
        //                )
        //                drawLine(
        //                    start = Vec2.Zero,
        //                    end = Vec2(20f, 0f),
        //                    color = Color.Cyan,
        //                    strokeWidth = 2f / zoom
        //                )
        //        // DEBUG: draw velocity vector
        //        drawLine(
        //            start = pos,
        //            end = pos + velocity,
        //            color = Color.Red,
        //            strokeWidth = 3f / zoom
        //        )
        context.restore();
        helper.x = oldHelperX;
        helper.y = oldHelperY;
        this.drawTrack(ship.track);
    }
    drawLanding(landing: Landing) {
        const context = this.context;
        const v = Vec2_makeWithAngleMag(Vec2.Zero(), landing.angle, landing.planet.radius).addSelf(landing.planet.pos);
        context.strokeStyle = Colors.Red;
        context.lineWidth = 1 / this.zoom;
        context.beginPath();
        context.moveTo(v.x - 5, v.y - 5);
        context.lineTo(v.x + 5, v.y + 5);
        context.stroke();
        context.beginPath();
        context.moveTo(v.x + 5, v.y - 5);
        context.lineTo(v.x - 5, v.y + 5);
        context.stroke();
    }
    drawSpark(spark: Spark) {
        if (spark.lifetime < 0) return;
        const context = this.context;
        switch (spark.style) {
            case SparkStyle.LINE:
                if (spark.opos.x !== 0 || spark.opos.y !== 0) {
                    context.strokeStyle = spark.color;
                    // screen-px floor (user 2026-11-09): a world-unit line
                    // width vanishes when zoomed out — debris must stay legible
                    context.lineWidth = Math.max(spark.size, 1 / this.zoom);
                    context.beginPath();
                    context.moveTo(spark.opos.x, spark.opos.y);
                    context.lineTo(spark.pos.x, spark.pos.y);
                    context.stroke();
                }
                break;
            case SparkStyle.LINE_ABSOLUTE:
                if (spark.opos.x !== 0 || spark.opos.y !== 0) {
                    context.strokeStyle = spark.color;
                    context.lineWidth = spark.size / this.zoom;
                    context.beginPath();
                    context.moveTo(spark.opos.x, spark.opos.y);
                    context.lineTo(spark.pos.x, spark.pos.y);
                    context.stroke();
                }
                break;
            case SparkStyle.DOT:
                context.fillStyle = spark.color;
                context.beginPath();
                // screen-px floor (user 2026-11-09): world-unit dots vanish
                // at flight zoom — impact sparks were literally invisible
                context.arc(spark.pos.x, spark.pos.y, Math.max(spark.size, 1.6 / this.zoom), 0, PI * 2);
                context.fill();
                break;
            case SparkStyle.DOT_ABSOLUTE:
                context.fillStyle = spark.color;
                context.beginPath();
                context.arc(spark.pos.x / this.zoom, spark.pos.y / this.zoom, spark.size, 0, PI * 2);
                context.fill();
                break;
            case SparkStyle.RING:
                context.strokeStyle = spark.color;
                context.lineWidth = 1 / this.zoom;
                context.beginPath();
                context.arc(spark.pos.x, spark.pos.y, spark.size, 0, PI * 2);
                context.stroke();
                break;
            //                drawPoints(listOf(pos), PointMode.Points, color, strokeWidth = 2f/zoom)
            //            drawCircle(color, 2f/zoom, pos)
        }
        //        drawCircle(Color.Gray, center = pos, radius = 1.5f / zoom)
    }
    drawTrack(track: Track) {
        const context = this.context;
        if (SIMPLE_TRACK_DRAWING) {
            // Grey dashes (user 2026-11-09): simply enough for a new player to
            // see the ship moves — bolder than v1 after "вообще не видна"
            // feedback, still restrained. Wish 44 (user 2026-11-09): the ship
            // trail is now STRONGLY WIDER than before (2.5/zoom ≈ half of the
            // old 5px route line, ~1.5× the old 1.7px trail) and SPARSER
            // ([4,9] dashes instead of [5,5]), same restrained transparency.
            // Points expire by age — the tail vanishes far behind the camera
            // while flying.
            const total = track.size();
            if (total < 2) return;
            context.strokeStyle = "rgba(168, 168, 180, 0.3)";
            context.lineWidth = 3.1 / this.zoom;
            context.setLineDash([4 / this.zoom, 9 / this.zoom]);
            context.beginPath();
            let first = true;
            track.forEachPoint((x, y) => {
                if (first) { context.moveTo(x, y); first = false; }
                else context.lineTo(x, y);
            });
            context.stroke();
            context.setLineDash([]);
        } else {
            if (track.positions.size() < 2) return;
            let prev: Vec2 | null = null;
            let a = 0.5;
            context.lineWidth = max(1, 1 / this.zoom);
            track.positions.forEachReversed(pos => {
                if (prev !== null) {
                    context.strokeStyle = "rgba(0,1,0," + a + ")";
                    context.beginPath();
                    context.moveTo(prev.x, prev.y);
                    context.lineTo(pos.x, pos.y);
                    context.stroke();
                }
                prev = pos;
                a = clamp((a - 1 / UniverseConst.TRACK_LENGTH), 0, 1);
            });
        }
    }
}

export class VisibleUniverse extends Universe {
    triggerDraw: number;
    realDt: number;

    constructor(namer: Namer, randomSeed: bigint) {
        super(namer, randomSeed);
        this.triggerDraw = Infinity;
        this.realDt = Infinity;
        LOG && console.log("VisibleUniverse Random Seed:", randomSeed);
    }

    simulateFrame(millis: number) {
        const lastDraw = this.triggerDraw;
        const dt = millis - lastDraw;
        if (dt === 0) return;
        this.triggerDraw = millis;
        this.realDt = dt;
        if (dt > VisibleUniverseConst.MIN_REFRESH_MILLIS) {
            const count = ceil(dt / VisibleUniverseConst.MIN_REFRESH_MILLIS);
            for (let i = 1; i <= count; i++) {
                this.step(lastDraw + dt / count * i);
            }
        } else {
            this.step(millis);
        }
    }
}
