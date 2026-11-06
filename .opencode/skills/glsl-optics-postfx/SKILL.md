---
name: glsl-optics-postfx
description: Research and implement GLSL/WebGL optical effects, ray-marching approximations and contextual postFX with honest claims and measured fallbacks.
---

# Glsl Optics Postfx

1. Verify WebGL/GLSL/Pixi APIs and device capabilities. Distinguish hardware RT/path tracing from ray marching, SDF, screen-space effects, analytic shading and artistic lensing.
2. Specify purpose, mask, coordinate space, inputs, temporal behavior, sample cost and fallback for each effect.
3. Prototype/benchmark isolated effects before integrating.
4. Use bounded loops/samples and stable noise.
5. Composite emissive/bloom selectively; preserve dark space and readable silhouettes.
6. Use an explicit event-driven graph with pass order, masks, blend-in/out and cleanup.
7. Create context profiles for warp, black hole, atmosphere entry, heat shimmer, sandstorm, blizzard, lightning, ocean response and landing.
8. Test resize/repeat/reduced-motion/low-tier/context-loss/Android.

Avoid false hardware-RT claims, permanent chromatic aberration, bloom everywhere and unmeasured full-screen cost.
