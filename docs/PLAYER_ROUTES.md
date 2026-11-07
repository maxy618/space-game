# Player routes — standard Playwright verification routes

Companion to `docs/PLAYTEST_PROTOCOL.md`. These routes are executed with the
Playwright MCP browser against the dev server (`http://localhost:5199/#seed=<SEED>`)
or the built preview (`/space-game/`). Record viewport, browser, seed, input
sequence and evidence paths for every run.

## Environment

- Desktop viewport: 1280×800, Chromium (Playwright MCP).
- Phone viewport: 412×915 with touch pointer type (BROWSER_TOUCH_EMULATION).
- Telemetry lives in `#bottomText` (THR/POS/VEL) and `#topText`.
- Pause menu state: `#pauseMenu.className === "pause-open"`.

## Route A — flight parity (every refactor / release)

1. `browser_navigate` → `http://localhost:5199/#seed=123456789`, wait 3 s.
   Expect `THR: 0%`, `VEL` small (~1–42). Screenshot `a-rest`.
2. Synthetic pointer on `#canvasMain`: `pointerdown` at canvas center
   (pointerId 7, pointerType mouse, isPrimary), then `pointermove` to
   (−150, +200) relative offset. Wait 3.5–4 s. Expect `THR: 100%`,
   `VEL` rising toward the 5000 cap. Screenshot `b-thrust`.
3. Dispatch `pointerup`. Wait 2 s. Expect `THR: 0%`, `VEL ≈ 5000`
   (momentum preserved, drift continues). Screenshot `c-drift`.
4. Click `#pauseButton` (`browser_click` may time out — verify via
   `browser_evaluate`: `#pauseMenu.className === "pause-open"`).
   Screenshot `d-pause`.
5. Click `#pauseContinue` via evaluate `.click()`. Wait 1.5 s. Expect menu
   hidden, drift resumed (POS advanced relative to the paused frame).
6. Check `browser_console_messages({ level: "error" })` — must be 0.

## Route B — touch robustness (phone viewport)

1. Resize to 412×915, navigate with the same seed, wait 3 s.
2. Synthetic touch pointer (pointerType "touch"): `pointerdown` at center,
   `pointermove` (−90, +130). Expect `THR: 100%`, VEL rising.
3. Dispatch `pointercancel`. Wait 1.5 s. Expect `THR: 0%` immediately, drift
   continues (inertia kept) — no error in console.
4. Pause via `#pauseButton` click, verify menu, resume via `#pauseContinue`.
5. Dispatch window `blur`/`visibilitychange`; verify state stays sane and the
   drift continues.

## Route C — velocity zoom feel (desktop)

1. From rest: note the visual scale (camera at 0.7× view).
2. Thrust to high speed: the camera smoothly zooms out (expSmooth, rate 2.5),
   reaching ~1.7× farther view at VEL 5000. Confirm the transition is smooth,
   no kinks, and telemetry remains readable.
3. Release thrust and decelerate: camera returns smoothly toward the rest
   view.

## Route D — high-DPI camera (phone with dpr emulation)

1. Before navigation, stub `window.devicePixelRatio = 3` (2.5K phone).
2. Navigate and rest: the ship must render at the same *visible* size as on
   dpr=1 (camera zoom is CSS px/meter; context scale = zoom × dpr).
3. Repeat Route A thrust phase; camera behavior must be identical.

## Known Playwright MCP pitfalls

- `browser_click` on `#pauseButton` can time out while the action still
  performs — verify via `browser_evaluate`, do not re-click blindly.
- Use `browser_evaluate` with the `function` key (not `fn`).
- Synthetic pointer events on `#canvasMain` are the reliable input path;
  `setPointerCapture` failures on synthetic pointers are caught in-game.
- `browser_console_messages` requires the `level` argument.
