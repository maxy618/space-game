---
name: gameplay-integration
description: Integrate travel, discoveries, environments, landing, rover, ecosystems, ships and upgrades into one persistent loop.
---

# Gameplay Integration

1. Map actual player journeys and dependencies.
2. Define stable event contracts/IDs to avoid circular dependencies.
3. Ensure wallet/discovery/purchase state updates exactly once.
4. Let ship modules affect play and world conditions affect flight/rover/landing.
5. Play end-to-end routes across systems, planet, atmosphere, surface, rover, discoveries and upgrades.
6. Test save/reload and repeated transitions.
7. Remove controls that look interactive but do nothing.

Avoid isolated demos, duplicate rewards, UI-only state or postponing integration to the end.
