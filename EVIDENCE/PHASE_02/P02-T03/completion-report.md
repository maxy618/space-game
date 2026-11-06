# P02-T03 — Ship and interaction parity: completion report

**Date:** 2026-11-07
**Build:** Vite + TypeScript, `npm run build` clean (dist 51.59 kB JS)
**Tests:** vitest 23/23 passed (determinism 8 + phase02 15)

## What was ported (Android 15 parity)

| Reference file | Project port | Notes |
|---|---|---|
| `MainActivity15.ts` (406 L) | `src/app/MainActivity15.ts` | isBaklava, playSpeed, expSmooth camera zoom, telemetry LND/JOB/ALT/THR/SPEED, setAutopilot/setControlsShow, SPEED_ZOOM (project-native, see below) |
| `Autopilot15.ts` (201 L) | `src/app/Autopilot15.ts` | Algorithm module only (D-003): LANDING/CHASING/APPROACHING/LAUNCHING/LANDED strategies, brakingDistance, leadingPos, telemetry text |
| `Universe15.ts` (100 L) | `src/universe/Universe15.ts` | Landing15 + Fuse flag removal, Spacecraft15 launchClock detach |
| `VisibleUniverse15.ts` (377 L) | `src/render/VisibleUniverse15.ts` | ZoomedDrawScope15: landing legs, thrust flame, autopilot visuals; VisibleUniverse15 landing/crash sparks; Namer15 describeActivity |
| `Physics15.ts` (44 L) | `src/core/Physics15.ts` | Fuse |
| `Flag15.ts` | `src/core/Flag15.ts` | drawFlag toggle |
| `Namer15.ts` (122 L) | `src/core/Namer15.ts` | describeActivity template engine |
| `player15.ts` (340 L) | `src/main.ts` | hash params, flight-stick pointer input, wheel/pinch (debug-only), controls auto-hide |
| `playerSpeed.ts` (142 L) | `src/playerSpeed.ts` + `src/core/SimClock.ts` | speed picker UI (debug-only), SimClock pause/speed arithmetic |
| `static/index.html` UI | `index.html` | rightContainer, zoomSelect, pauseCheck, speedButton, speed picker, loading overlay |

## Player vs debug policy (user mandate 2026-11-07)

- **Player-facing:** flight stick, telemetry, velocity zoom (below).
- **Debug-only (`#debug=1`):** playSpeed (0.05–50.95x), pause, zoom select (fixed/dynamic/manual), wheel/pinch zoom, seed (URL hash only).
- Velocity zoom (project-native): camera breathes with ship speed anchored to the original default view — slow = slightly closer (≤15% in), SPEED_ZOOM_REF = 800 px/s = exactly original view, fast = smoothly farther (≤2.2x out), expSmooth rate 2.5.

## Player test evidence (Playwright, real input)

- Desktop 1280×800, seed 123456789: flight-stick drag → THR 100%, VEL 1763 px/s; release → decel to VEL 0. Screenshots: `final-rest-desktop.png`, `final-flight-highspeed.png`, `final-flight-decel.png`.
- Phone viewport 412×915: clean start, ship centered, no debug UI, no speed-menu popup at launch. `final-phone-viewport.png`.
- Debug mode `#debug=1`: rightContainer visible, speed/pause/zoom controls present, speed menu opens only on button click. `final-debug-mode.png`.
- Console: 0 errors across all routes (only seed/creation INFO logs).
- Early bug found and fixed: speed picker overlay visible at launch (CSS specificity); telemetry text collapsed to one line (missing `white-space: pre`).

## Omissions / rewrites (explained)

- Autopilot is NOT wired to player UI (D-003): ported as tested algorithm module; player-facing autopilot comes in a later phase with project-native autopilot.
- LANDING_REMOVAL_TIME in reference Universe15 = 60*1 (Android 15 tweak of 15-min Fuse removal from Android 14) — ported as-is.
- Reference `main.ts` `unsupportedFeatures` BigInt check kept in project main.ts.

## Verdict

P02-T03 objectives met: ship, camera, controls, interaction in separate modules; player-visible behavior matches reference; speed/pause/zoom correctly demoted to debug; velocity zoom added as the player camera feature. → VERIFIED.

## Addendum: player-facing polish pass (2026-11-07, same task)

User-driven fixes and features, all verified live on desktop (1280×800) and phone viewport (412×915):

- **Velocity zoom curve (final):** smooth single curve, no kink at junction.
  Stopped = 0.7× closer; SPEED_ZOOM_REF (800 px/s) = exactly original view;
  max speed = 1.7× farther (SPEED_ZOOM_FAR, user asked to keep pushing range).
  Curve: linear lerp below REF, quadratic ease above REF, expSmooth rate 2.5.
  Verified: VEL 5000 at max thrust, camera smoothly farther; VEL 0 rest closer.
- **Flight stick:** rendered 1.5× smaller (minRadius 33px, maxRadius 67px local px) — full-size stick covered most of the phone screen.
- **Pause button (player-facing):** bespoke SVG pause bars, top-right at 14px inset.
- **Pause button anti-overlap logic:** measured every frame against the FIRST telemetry line only (not the whole text block); button slides below the line with 8px margin only when the text actually reaches the button. Fixed double-render jank by writing style.top only on change.
- **Pause menu:** full-screen frosted-glass blur + darkening overlay, smooth fade-in (0.28s), reduced-motion honored. Buttons: CONTINUE (verified live: menu opens, resume works, telemetry runs again), SETTINGS and EXIT are visual stubs for a later phase (user-approved placeholder scope).
- **Pause ambience:** soft white radial pulses at random positions/times while paused; several pulses can coexist in different phases; a new pulse spawns mid-life of the previous one (not at its end), organic rhythm.
- **Grid/telemetry toggles removed from pause menu** per user: grid is always on as in the reference; telemetry always on.
- **Fixed freeze bug:** zoom used `lexp` (inverse-lerp helper) by mistake → negative zoom at VEL 0 → `while (gridStep * cameraZoom < dp32)` infinite loop → tab hang. Replaced with `lerp` + clamp; verified no hang across full throttle route.
- Console: 0 errors across all final routes (rest, thrust, max speed, pause open/close).

Screenshots (final): final-v4-rest, final-v3-flight-highspeed (VEL 5000), final-v3-flight-decel (drift), final-v4-pause-1/2 (frosted menu + pulses), final-v4-desktop-resumed (after CONTINUE), phone viewports.
