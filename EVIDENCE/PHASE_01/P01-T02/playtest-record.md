# P01-T02 — Reference playtest record (MANDATORY PLAYER TEST)

**Date:** 2026-11-06
**Task:** TASKS/PHASE_01/P01-T02_reference-source-and-license-audit.md
**Browser:** Chromium (Playwright-managed), viewport 1280x800, CSS scale
**Label:** BROWSER_DESKTOP (not touch emulation, not physical device)

## Route and inputs (repeatable)

1. `browser_resize` 1280x800
2. Navigate to `https://landroid.js.org/player.html` (LAndroid 14(U) Easter Egg Simulator)
3. Wait 6 s for load → snapshot: ship idle at `POS <+15781, -18479> VEL 912`, star "Aries 1355 (UDC-61006)", 144 FPS
4. Screenshot `ref-01-initial.png`
5. Press key `w` × 5 (real keyboard events via Playwright)
6. Wait 2 s → snapshot: ship moved to `POS <+20988, -27489> VEL 514`
7. Screenshot `ref-02-thrust.png`

## Result

- The reference responds to real player keyboard input; the ship position/velocity visibly changed between the two snapshots. This is genuine played evidence, not internal state mutation.
- **Console:** 0 errors, 0 warnings across the whole session.
- **Network:** 9 requests, all HTTP 200 (player.html, playerLoad.js, A36/A725 bundles, player.js, fonts). No failed requests.
- Performance: 144.0 FPS (vFPS 144.0) on desktop viewport.

## Evidence files

- `EVIDENCE/PHASE_01/P01-T02/ref-01-initial.png` — initial idle state
- `EVIDENCE/PHASE_01/P01-T02/ref-02-thrust.png` — after thrust input, ship displaced
- `EVIDENCE/PHASE_01/P01-T02/reference-source.md` — source map and license audit
- Cloned reference checkout (read-only): `reference/landroid-web` @ `fccb4ebd3e61e9cc4b708311c0da477eec8a4608`

## Honest limits

- Only basic flight input was exercised on the live reference (full reference parity testing happens in Phase 02).
- No physical Android device or emulator was used; no claim of such testing is made.
