---
name: atmospheric-flight-model
description: Research, implement and tune a playable 2D planetary flight model with environmental and ship-specific handling.
---

# Atmospheric Flight Model

1. Compare real flight principles and simplified game models; cite sources and units.
2. Evaluate gravity, density, thrust, lift/drag inspiration, wind, turbulence, hover/VTOL, stabilization and braking.
3. Select for clarity, responsiveness, performance and extensibility; separate physical inspiration from abstraction.
4. Implement deterministic frame-rate-independent update and named central parameters.
5. Let climate and visible modules affect flight while keeping recovery accessible.
6. Test thin/thick atmosphere, wind/gravity, ship types, modules, hover and emergency recovery.
7. Actively fly with Playwright; state checks alone do not pass.

Avoid unresearched formulas, identical handling everywhere, silent control changes or frame-dependent behavior.
