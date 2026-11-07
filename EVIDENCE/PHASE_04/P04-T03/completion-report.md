# P04-T03 — Touch controls — Completion Report

**Date:** 2026-11-07 · **Status:** VERIFIED

## What was implemented

Touch layout auditor (phone 412×915 touch emulation):
- **Bespoke joystick**: canvas-drawn green ring + direction line (no icon
  fonts), pressed state = solid ring with radius-following deflection;
  small deflections switch to dashed ring (native dead-zone feedback).
- **Safe areas**: `#pauseButton` offset by `env(safe-area-inset-top/right)`
  via `:root` CSS vars; `keepPauseButtonClear` in main.ts reads the inset px
  value so the JS-driven anti-overlap top respects the notch; menu buttons
  are inset by the same safe-area pattern.
- **Multitouch**: a second finger does not steal the stick (`FlightStick`
  ignores the extra `pointerdown` while held; the legacy two-finger
  `touchstart` handler clears and releases the stick). Verified: while
  thrusting, a 2nd touch left capture unaffected (THR stayed 100%).
- **Release pathways**: `pointerup` (free), `pointercancel` (zeroed
  immediately), `contextmenu`, `dblclick`, and **resize** (ResizeObserver
  rebuilds the canvas backing store without corrupting state) — all
  produced clean THR→0% transitions with momentum preserved.
- **Thumb reach**: joystick origin is dynamic (wherever the thumb lands),
  so reach is inherently thumb-centered; pause is reachable in the top-right
  with the same hand on narrow phones.

## Player test
Desktop-twin + phone routes, seed 123456789, Chromium Playwright:
- Phone 412×915: rest → touch thrust `THR: 100% VEL: 3552` (t03-b shows
  joystick ring + direction line + ship + track, all readable).
- Second-finger multitouch during thrust: no steal, no stuck input.
- Resize during input: still responsive, THR consistent, 0 errors.
- **0 console errors throughout.**

## Robots-a-glance
File changes: `index.html` (safe-area CSS vars + `#pauseButton` calc()),
`src/main.ts` (safe-area inset reader in the keep-clear path).

## Verification
- `npm run build`: clean. `npm test`: 51/51.

## Evidence
- t03-a-phone-rest.png, t03-b-joystick-pressed.png, t03-c-multitouch.png

## Limitations
- Manual two-finger zoom is debug-only (#zoom=manual); pinch is not a
  player feature per project policy.
- No physical-phone testing (BROWSER_TOUCH_EMULATION only) — safe-area CSS
  is standard `env()` API; notch behavior on real devices follows browser
  spec.
