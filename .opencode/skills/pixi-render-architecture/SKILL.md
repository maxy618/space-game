---
name: pixi-render-architecture
description: Build a layered PixiJS rendering pipeline with clear coordinate spaces, LOD, resource ownership and mobile-safe compositing.
---

# Pixi Render Architecture

1. Verify installed PixiJS version and current official docs/Context7 APIs; do not code from a different major version.
2. Document world/local/camera/screen/UI coordinate spaces; separate simulation from DisplayObjects.
3. Define render graph: backdrop, parallax, celestial, surface, ship/life/vehicle, foreground, emissive, postFX, UI.
4. Every layer declares order, blend, coordinate space, resolution, LOD and cleanup owner.
5. LOD follows projected screen size; preserve silhouette at low tier.
6. Manage textures, render targets, filters and listeners; handle resize/context loss/destroy.
7. Profile representative real gameplay scenes.

Avoid giant containers, per-frame allocations, unbounded filter nesting, UI in world coordinates and desktop-only performance assumptions.
