---
name: atmospheric-entry-continuity
description: Design and test cinematic atmospheric entry preserving ship, region, trajectory, momentum, orientation and player control.
---

# Atmospheric Entry Continuity

1. Inspect camera, coordinates, ship state, planet identity, streaming and input path.
2. Define explicit states for approach, entry, upper atmosphere, local flight, abort/pull-up, exit, no-atmosphere and failure.
3. Research references/dynamics and label game simplifications.
4. Map position, velocity, heading and local region into side-view coordinates; same ship and approach continue. Never respawn generic ship.
5. Preload terrain; animate camera scale, horizon, haze, cloud, parallax, light and contextual distortion.
6. Keep steering active during/after entry.
7. Test varied angles/speeds, abort, resize, pause/resume and repeat entry/exit.
8. Capture video and inspect frame-by-frame.

Reject teleport, generic spawn, black fade to hide loading, lost velocity, input lock or terrain popping.
