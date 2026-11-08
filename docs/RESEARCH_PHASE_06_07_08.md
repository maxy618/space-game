# Research — Phases 06–08 (art direction, celestial visuals, optics/postFX)

**Date:** 2026-11-09. **Author:** lead agent. **Method:** web research + repo audit + live Playwright audit.
All URLs retrieved 2026-11-09. Confidence: **confirmed** = authoritative/doc/official or repo-observed;
**inference** = engineering judgment from confirmed facts; **fiction/game abstraction** = art-directed approximation, never presented as measurement.

## 0. Installed renderer — constraint (confirmed from repo)

- `package.json`: no PixiJS, no Three.js, no WebGL lib. Renderer is **Canvas 2D** (`main.ts`: `canvas.getContext("2d")`, `VisibleUniverse.drawUniverse`).
- Consequence: there is **no hardware ray-tracing / path-tracing pipeline** in WebGL2, and none can be added without a full renderer rewrite. Anything called “ray tracing” here would be false. What *is* possible:
  1. Pre-rendered 2D sprites with baked FBM (CPU, once) — star/planet/nebula textures.
  2. Per-frame 2D canvas composition with `globalCompositeOperation="lighter"` additive glows.
  3. A **WebGL2 postFX compositor** over the 2D frame: the 2D canvas is uploaded as a texture, then a fullscreen shader applies screen-space lensing/refraction, bloom (bright-pass + separable blur), ACES-approx tone mapping, CA, vignette, heat shimmer. This is screen-space approximation, **not** ray marching and **not** hardware RT — and will be labelled exactly that in UI/docs.
- Upload cost (confirmed by semisignal bench + MDN WebGL best-practices, see §7): Canvas→WebGL texture upload is a software read-back on some stacks; measured first-frame cost is high but steady-state fullscreen textured quads are GPU-cheap. Mitigation: postFX runs at **half resolution** on medium/low tiers, upload every frame only when an effect is active; otherwise direct 2D blit (current path).

## 1. Art direction & render graph (Phase 06)

- **Layered authored 2D, silhouette first** — already in `docs/ART_DIRECTION.md` and `src/camera/Layers.ts` (7 layers). Audit: the graph is *documented* but not *enforced* — `drawUniverse` draws everything in one pass; no independent layer toggles, no postFX layer. **Gap to close:** add `postFX` + `emissive` layers to `Layers.ts`, extend `validateGraph()` tests, and make the postFX pass a real, independently controllable layer (quality-tier gated).
- **LOD by projected size** — `src/camera/Lod.ts` defines macro/regional/fine/micro in CSS px (8/64/480). Audit: thresholds exist but `drawStar/drawPlanet` ignore them (always full detail). **Gap:** wire `lodFor()` into the celestial draws (far = glow disc, near = sprite + fine detail) and add a test.
- **Icon grammar** — verified live: all buttons are bespoke SVG (`index.html`), no emoji/packs. No change needed; regression-test it stays that way.
- **Live audit (seed 42, `__game`):** star at (0,0) r≈7763; ship spawns at (85668,81716) — ~118 km from star. At rest zoom the visible span is ~450 m, so **the player spawns in empty void seeing nothing**. This is the single biggest immersion killer (user screenshot: tiny ship, black void). It is a *spawn/camera* issue, out of Phase 06–08 scope, but the visual upgrade must still make distant bodies legible (star glare, planet dots with glow) so the void is never blank. Recorded as R-006.

## 2. Stars (P07-T01)

Confirmed physics (NASA SWS / Britannica “limb darkening”; Godot 2D sun shader):
- **Limb darkening:** centre brighter, limb darker (hotter deeper layers seen at centre). Up to ~90% drop in blue. → bake `pow(nz,0.55)`-style falloff into the sprite; cheap radial gradient is the LOD-macro version.
- **Granulation:** bright cells ~1100 km with dark lanes, lifetime ~10 min; in game terms: two-scale FBM (large cells + fine flicker-modulated). → bake 2-octave FBM, animate only via slow sprite rotation (no per-pixel CPU cost).
- **Sunspots/faculae:** thresholded slow FBM, umbra/penumbra darkening. → bake as darker blotches with soft edge.
- **Corona:** optically-thin exponential falloff `I0·exp(−k·(r−R))` (salinity GLSL article, confirmed formula). Fast decay near limb + long faint tail. → per-frame additive radial gradients (2–3 rings) + baked outer glow in sprite; **this is what bloom will catch** in P08.
- **Spectral classes O/B/A/F/G/K/M:** different core/hot colours (`Universe.starColor` already maps them). Each class gets its own palette in the baker, not just a hue-shifted gradient: O/B = blue-white, compact, tight corona; G/K = warm, spotty; M = deep orange-red, large spots, puffy corona. Silhouette differences: corona spike length/softness per class.

## 3. Planets, moons, rings (P07-T02)

Confirmed (Kopernicus RimAerial / Terragen atmosphere / Godot planet shaders):
- **Terminator, not a black crescent:** day/night divider is soft; a hard black offset circle reads as “flat”. → per-frame overlay: radial gradient dark side offset *away* from the star, with a warm sunset band at the divider.
- **Atmosphere rim:** view-angle rim `rimFalloff=(1−N·V)^rimPower`, colour ramped by day/night (blue dayside → dim nightside). In 2D: an outer glow ring whose brightness/colour follows the star direction. Airless bodies (seed flag) get **no** rim — silhouette difference, not palette swap.
- **Regional structure:** FBM continents + domain warp, ice caps at poles, cloud bands offset from surface. Ringed planets: elliptical ring with radial gaps + shadow on night side. → bake continents/caps into sprite; clouds as second sprite drawn with slow rotation + alpha; rings drawn as ellipse with `destination-out` gaps.
- **Specular ocean glint:** small bright spot at sub-solar specular point when ocean present (seed flag). → additive dot, only when projected size > fine LOD.

## 4. Nebulae, dust, debris, comets (P07-T03)

Confirmed (Godot 2D nebula shader — CC0; Cosmos galaxy shader):
- **FBM stacking** (5–12 octaves, `p*=2, a*=0.5`) + soft circular falloff gives coherent clouds without hard edges. Domain-warped FBM gives filaments.
- Current impl: 18 seeded blobs, sprites 512px baked once, per-frame 1 blit — architecture is right, **detail is low** (single squash polygon + shadowBlur halo reads as a coloured blob at gameplay size). Upgrade: 2-layer sprite (base FBM value-noise painted via `ImageData`, not `shadowBlur`), brighter filament threads + dark dust lanes (`destination-out`), embedded stars. Per-frame cost stays 1 blit.
- Dust/debris parallax already exists (starfield/dust/debris in `MainActivity15.Spaaaace`). Comets: not present — add 2–3 deterministic comet sprites with tails on fixed orbits (P07 scope creep: include only if cheap; otherwise record as deferred).

## 5. Black hole (P07-T04)

Confirmed (Godot `gravitational_lens.gdshader` screen-space; GARGANTUA-SIMULATION geodesic; James et al. 2015 DNGR paper):
- **Two honest levels:**
  1. *Screen-space approximation* (what a 2D game can do): deflect sample UVs toward the hole with `offset ∝ rShadow² / dist²`, clamp; add secondary Einstein-ring blend; photon ring as bright thin circle; shadow disc pure black. This is **art-directed, not GR** — the Godot shader and our postFX will be labelled “screen-space lensing-inspired approximation”.
  2. *True geodesic ray-marching* (per-pixel null-geodesic integration, Schwarzschild `a=−1.5h²r⃗/r⁵`, photon sphere at 1.5 r_s, ISCO at 3 r_s): real-time in browser (GARGANTUA demo) but full-screen per-pixel cost is mobile-hostile and pointless for a 2D game that only approaches the hole occasionally. **Decision: screen-space only**, with correct silhouette proportions (shadow r_s, photon ring ≈2.6 r_s visual, disc inner edge ≈3 r_s) borrowed from the physics.
- **Accretion disc:** thin annulus, Keplerian differential rotation (inner faster), Doppler beaming (approaching side brighter/bluer), gravitational redshift dimming inner edge. In 2D: ellipse with radial temperature gradient (white-hot inner → orange → dark outer), brightness ramp stronger on one side, slowly rotating texture offset. Current impl: flat orange ring — upgrade to textured disc sprite with Doppler ramp.
- **Jets:** collimated polar beams — add faint cones along rotation axis, subtle, only when hole is on screen.

## 6. PostFX / optics (Phase 08)

### 6.1 What is *not* on the table (confirmed)
- No hardware RT/PT in WebGL2/Canvas2D. No cubemaps, no compute shaders in WebGL2 (GLSL ES 3.00 has compute only via WebGL2 extension in some stacks — not portable; avoid).
- Per-pixel FBM ray-marching full-screen at 60 fps on mid phones is infeasible (Volumeshader blog: 64-step march, adaptive steps, half res on mobile; gyroid demo: 60 fps on RTX 3050 desktop only). **Therefore: no full-screen ray-marched scene.** Ray-marching is used only as *research reference* for the BH in §5 (rejected, with reason).

### 6.2 PostFX compositor design (P08-T02)
- **Graph:** `source(2D canvas) → [optional] bright-pass → [optional] blur H/V at ¼ res → composite → display(WebGL canvas)`. Explicit pass list in code, each pass independently enabled, FBOs created once, deleted on resize/dispose (no leak).
- **Passes:** 
  1. `bright` — threshold at ~0.85, soft knee.
  2. `blurH/blurV` — 9-tap Gaussian, 2 iterations (¼ res).
  3. `composite` — source + bloom·gain, ACES-approx (`x(2.51x+0.03)/(x(2.43x+0.59)+0.14)`), exposure, CA (radial, ∝dist²), vignette, film grain (very subtle, reduced-motion off), plus *distortion* applied to UV before sampling (barrel warp, BH lensing, heat shimmer).
- **Distortion UV math:** `uv' = centre + (uv−centre)·(1 + k·r²)` for barrel; BH: `uv' = uv − dir·(strength·rShadow²/dist²)` clamped; heat shimmer: `uv' += sin(uv.y·freq + time·speed)·amp·mask` where mask is radial from star screen pos / whole-screen for hot zone.
- **Profiles (P08-T04), each with blend-in/out (smoothstep over ~0.4 s) and exit condition that restores exactly:**
  - `warp` — speed > cap (reuses `fisheyeTargetForSpeed`), barrel + CA + slight desat.
  - `blackHole` — hole on screen & within ~5× shadow: lensing + photon-ring highlight, strength ∝ `1/dist`.
  - `starHeat` — star proximity > 0.3: glare wash (additive radial), shimmer, exposure up.
  - `nebula` — inside nebula blob radius: gentle tint + soft contrast (very subtle).
  - `landingImpact` — brief 0.25 s flash + vignette punch + tiny radial shake (decays to exact 0).
  - `scan` — subtle ring pulse? Deferred (scan already has 2D wave); profile kept but gain 0.
- **Quality tiers:** `high` (bloom+all distortion, full res), `medium` (bloom at ½, distortion, no grain), `low` (tonemap+vignette only, no bloom, no distortion), `off` (direct blit). Auto-select from DPR + `hardwareConcurrency`? Explicit: default `high` on desktop DPR≤2, `medium` on mobile DPR>2, overridable. Measured FPS logged (P08-T05).
- **Reduced motion:** all distortion/shimmer/shake/grain disabled; bloom/tonemap/vignette remain (static). CSS pulses already gated; JS must gate too.

### 6.3 Proof/benchmark (P08-T01)
- Before shipping the compositor, measure in Playwright: (a) 2D-only FPS baseline, (b) WebGL composite FPS at full/half res, (c) texture-upload cost with/without effects. Record numbers in `EVIDENCE/PHASE_08/P08-T01/`. If composite drops below 50 fps on desktop test machine, default tier drops to `medium`.

## 7. Sources
- Godot Shaders — 2D Nebula Shader (CC0), 2D Sun with Bloom + Coronal Flares, Planet Coffee, Ray-marching Ocean+Atmosphere: `godotshaders.com`
- JoppeJoppinger/blackhole-godot `gravitational_lens.gdshader` (screen-space lensing): GitHub
- denhanglim/GARGANTUA-SIMULATION (geodesic BH, MIT): GitHub
- James, von Tunzelmann, Franklin, Thorne (2015) “Gravitational lensing by spinning black holes” (DNGR, Interstellar): IOP / arXiv:1502.03808
- salivity.github.io — Solar Corona Limb Brightening via GLSL Radial Decay (exponential corona): salinity blog
- NASA SWS “The Solar Photosphere”, Britannica “Limb darkening”, solar.physics.montana.edu lecture 15–16 (photosphere/chromosphere/corona, granulation, sunspots): authoritative
- Kopernicus Wiki — Atmospheric/RimAerial material docs (rim falloff, day/night ramp): kopernicuswiki.org
- Unreal Engine docs — Color Grading + Filmic (ACES) Tonemapper, Bloom, Post Process Effects: docs.unrealengine.com
- Filament `ToneMapper.h` (ACES/AgX operators, linear→display): GitHub google/filament
- Volumeshader — Understanding WebGL 2.0 Raymarching Rendering (perf optimisations): volumeshadertest.com
- Smirnov — “A lattice with no mesh: sphere-tracing a signed distance field in raw WebGL2” (post chain: bright-pass, 2-level blur, ACES, CA, vignette, grain; 7 draw calls/frame, 60 fps RTX 3050): DEV Community
- semisignal — A look at 2D vs WebGL canvas performance (upload cost): semisignal.com
- MDN — WebGL best practices, gl.getError handling: developer.mozilla.org
- CosmosMuseum/cosmos-museum-galaxy (FBM galaxy, Frank Hugenroth Pegasus shader): GitHub

## 8. Implementation impact (what changes, in order)
1. `src/render/CelestialArt.ts` (new): seeded value-noise FBM, star/planet/BH sprite bakers, sun-direction lighting helpers. Pure TS, no DOM except `document.createElement` for sprites; unit-tested for determinism.
2. `src/camera/Layers.ts` + `Lod.ts`: add `postFX`/`emissive` layers, extend `QUALITY_FEATURES` tiers, keep `validateGraph()` green.
3. `src/render/PostFX.ts` (new): WebGL2 compositor, profiles, tiers, reduced-motion, resize/dispose, FPS probe. P08 core.
4. `src/render/VisibleUniverse.ts` + `VisibleUniverse15.ts`: use sprites + LOD + sun lighting; BH textured disc; keep per-frame cost ~1 blit/body + 2 glows.
5. `src/app/MainActivity15.ts` + `src/main.ts` + `index.html`: wire postFX canvas, params from sim state (warp speed, BH screen pos, star proximity/heat, nebula presence, impact timer), quality-tier selector in pause Settings (player-facing, no debug), reduced-motion respect.
6. Tests: `tests/celestial-art.test.ts`, `tests/postfx-profiles.test.ts`, extended `tests/layers-lod.test.ts` (or current equivalents).
7. Evidence: `EVIDENCE/PHASE_08/*` + re-audit of P06/P07 (normal + close-up screenshots, console check, FPS numbers).

## 9. Uncertainties
- Exact mobile GPU budget for WebGL upload+composite: not measurable here (no physical device, R-003). Mitigation: tiers + FPS probe; claim only desktop-measured numbers.
- Whether ACES-approx on LDR Canvas2D source (already tone-mapped by 2D pipeline) is a net visual win vs double-tonemapping: mitigate by keeping source in linear-ish range (no 2D tonemap currently — source is raw LDR, so postFX tonemap is single).
- Comet family: deferred unless sprite system makes it trivial.
