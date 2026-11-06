---
name: mobile-controls-accessibility
description: Design/test touch controls, safe areas, multitouch, lifecycle, settings and reduced motion.
---

# Mobile Controls Accessibility

1. Test small/large phone and tablet aspect ratios; reserve thumb zones and safe areas.
2. Keep controls minimal: movement zone plus contextual actions.
3. Handle pointer capture/cancel, multitouch, resize/orientation, browser gestures, app background/resume.
4. Route devices through shared input mapping, not mechanics-specific DOM handlers.
5. Persist pause, sensitivity, quality, reduced motion and volume settings.
6. Test Playwright touch emulation; separately test Android emulator/physical device if available.
7. Verify no stuck input after blur/background/rotation.

Avoid tiny targets, single-touch assumptions or claiming emulation is real-device testing.
