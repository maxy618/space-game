# Mandatory player-driven QA

Screenshots, code review and unit tests do not prove gameplay. For every gameplay task, launch the real build and perform input-driven Playwright play.

## Routine
1. Start dev server; record command, port and commit.
2. Open Playwright; capture console/page errors and failed network requests.
3. Use real keyboard, mouse, pointer or touchscreen inputs. Move, steer, brake, select, interact, scan, land, drive or equip as required.
4. Verify player-visible response after each action; do not use internal state injection as the only test.
5. Test press/release, simultaneous input, pointercancel, focus loss, pause/resume, resize and reload where relevant.
6. Capture screenshots/video at meaningful states; inspect full gameplay view and magnified crops.
7. Fix defects and replay the same seed/route.
8. Record browser, viewport, seed, input sequence, result, evidence paths and runtime errors.

## Mandatory routes
- Ship: thrust/steer/brake/release and turn.
- System map: open/select/cancel/jump/arrive/repeat.
- PostFX: trigger event, enter/exit region, verify blend-out and quality tiers.
- Atmospheric entry: approach target, steer throughout entry, verify same ship/region/mapped position/heading/velocity, continue steering in atmosphere, abort and repeat. Capture video and inspect frame-by-frame.
- Planet flight: fly/brake/climb/descent/hover if supported; compare atmospheres and hulls.
- Landing: choose safe site, control descent, touch down at same location, relaunch and recover.
- Rover: deploy/drive over varied surfaces/scan/return/save/reload.
- Ecosystems: observe/approach/trigger behavior/scan/discover/revisit same seed.
- Economy: earn first-discovery credits, save/reload, ensure no duplicate, buy unlock.
- Upgrades: buy/equip/remove, inspect silhouette, fly same route, verify changed gameplay, reload.
- Pages: open live URL, check assets/routes/errors and actively smoke-play.

Evidence classes: `BROWSER_DESKTOP`, `BROWSER_TOUCH_EMULATION`, `ANDROID_EMULATOR`, `PHYSICAL_ANDROID`. Never overstate what was tested.
