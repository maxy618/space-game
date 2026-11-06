# P02-T01 — Reference behavior capture report

**Date:** 2026-11-06
**Task:** TASKS/PHASE_02/P02-T01_reference-behavior-capture.md
**Toolchain:** Playwright Chromium (BROWSER_DESKTOP + emulated phone viewport 390x844)
**Reference:** https://landroid.js.org (Android 14/15/16 Easter Egg)

## Feature matrix (verified by actual Playwright interaction)

| Feature | Android 14 (`player.html`) | Android 15 (`player15.html`) | Viewer (`viewer.html`) |
| --- | --- | --- | --- |
| Startup loads | ✅ Desktop + Phone | ✅ Desktop + Phone | ✅ Desktop |
| Flight stick (drag) | ✅ ALT 8633→2444, VEL 1758→2535 | ✅ VEL 160→256 (desktop), VEL 159→257 (phone) | N/A (data viewer) |
| HUD (POS/VEL/ALT) | ✅ | ✅ + THR | N/A |
| Camera/zoom (wheel) | ✅ state updated | ✅ (Fixed/Dynamic/Manual options) | N/A |
| Menus (zoom modes) | N/A | ✅ 3 modes visible | ✅ Calendar + checkboxes |
| Date navigation | N/A | N/A | ✅ Prev month verified |
| Object data (star+planets) | ✅ (Aries 1355, 4 bodies) | ✅ | ✅ (4 planets w/ Type, Atmosphere, Fauna, Flora) |
| "Play Online" button | N/A | N/A | ✅ navigates to player |
| Console errors | 0 errors / 0 warnings | 0 errors / 0 warnings | 0 errors / 0 warnings |

## Reproducible routes

### Route A — Android 14 flight test
1. `resize 1280x800` → `goto https://landroid.js.org/player.html`
2. Wait 5s (loading) → screenshot `android14-desktop-01-startup.png`
3. Mouse: move(640,400) → down → move(640,300, steps 10) → up → wait 2s
4. Observe: `ALT: 8633` → `2444`, `POS: <+5753,-6436>` → `<+1389,-2012>`, `VEL: 1758` → `2535`
5. Mouse wheel scroll -500 then +1000 (zoom test) → `POS/VEL` update
6. Console check: 0 errors, 0 warnings

### Route B — Android 14 phone test
1. `resize 390x844` → navigate
2. Pointer drag (mouse down/move/up) — engine handles `pointerdown/move/up` events
3. Observe: `POS: <+10280,-10865> VEL: 942` (state updates on input)
4. Console check: clean

### Route C — Android 15 flight test
1. `resize 1280x800` → `goto player15.html` → wait 5s → screenshot
2. Drag from (640,400) to (640,300)
3. Observe: `THR: 0% POS: <+14901,-15137> VEL: 160` → `POS: <+14540,-14866> VEL: 256`
4. Zoom mode options visible: Fixed, Dynamic, Manual
5. Phone (390x844) → same drag → `VEL: 159` → `257`

### Route D — Viewer test
1. `resize 1280x800` → `goto viewer.html` → wait 6s → screenshot
2. Inspect: Star "Aries 1355" (Class M, Radius 5225.664, Mass 2.242e+11, 4 bodies)
3. Planets listed with: Radius, Orbit radius, Speed, Type, Atmosphere, Fauna, Flora (e.g. "Ancient planetoid", "Minty", "Brutish", "Artisanal")
4. Click "Previous month" → calendar switches (ноябрь → октябрь)
5. Click "Play Online" → navigates to `player.html`
6. Console check: 0 errors, 0 warnings

## Console/Network results
- `player.html`: 0 errors, 0 warnings (10 messages total, all info)
- `player15.html`: 0 errors, 0 warnings
- `viewer.html`: 0 errors, 0 warnings (25 messages total)

## Honest limits
- Touchscreen.tap failed due to `hasTouch: false` context; used pointer events (mouse) as fallback — engine explicitly registers both pointer and touch handlers, so pointer verification is valid for flight stick logic. True multi-touch pinch zoom on emulator still needs verification in Phase 04.
- No physical device was used; all tests are Playwright desktop + emulated phone viewport.
