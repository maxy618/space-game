# PROJECT CHARTER — SPACE EXPLORATION GAME

Read this before every task. The active phase is governed by `PROJECT_STATE.md`, `TASK_INDEX.md`, `MISSIONS/`, `PHASES/` and `TASKS/`. Never invent a new roadmap or skip a gate.

## Product vision
Build a memorable, deep 2D space-and-planet exploration game. First reconstruct the selected Android Easter Egg reference as a playable baseline. Then expand it through 27 gated phases into a procedural universe with star-system travel, unusual celestial objects, seamless atmospheric entry, atmospheric flight, meaningful landing, ground vehicles, ecosystems, exploration rewards, unlockable ships and visible modular upgrades. This is a game, not a SaaS product: do not add accounts, cloud services, monetization, analytics, multiplayer or unrelated scope.

## Visual north star: layered authored 2D
The target is a distinctive, memorable 2D visual language with depth and many coherent layers — **not generic glossy 3D**. Build each visual family from: (1) macro silhouette/composition/large forms; (2) regional structure such as continents, dune fields, nebula filaments, cloud masses and ship assemblies; (3) material response such as erosion, ice fracture, strata, water, haze and emissive details; (4) fine detail only when visible at that zoom; (5) motion, parallax, environmental drift and secondary animation; (6) optical/composite effects. A planet is not finished because it has a glossy radial gradient. Noise is not art direction. Different biomes need different silhouettes/material grammar, not palette swaps. Review actual phone gameplay size and close crops. Pixel-aware rendering is welcome where it serves the style; do not force all imagery into crude pixel blocks.

Use original in-game UI artwork. No emoji, Unicode pictographs, Lucide, Font Awesome, Material Icons, icon fonts or generic icon packs as final assets. Draw bespoke SVG paths or PixiJS geometry with coherent shape language and interaction states.

## Ray tracing, optics and post-processing
The user wants spectacular layered graphics, lensing and screen distortion. Research the real capability of the installed renderer. Distinguish hardware ray tracing/path tracing from ray marching, SDF rendering, screen-space effects, analytic shading and artistic approximations. Never label an approximation as hardware RT. Build an explicit post-processing graph with order, masks, resolution, cleanup and quality tiers. Many effects may exist, but turn them on contextually: black-hole lensing near a black hole; radial distortion during warp; refractive haze during atmospheric entry; heat shimmer in hot air; dust veiling in sandstorms; blizzard occlusion; lightning exposure; water/storm response; brief landing impact. Whole-screen distortion is allowed when an event justifies it, but not as a permanent stack. Every effect needs blend-in/out, end condition, reduced-motion behavior and measured low-tier fallback. Preserve player/terrain/control readability. WebGL 2 does not provide a general hardware ray-tracing pipeline; validate and describe the technique honestly.

## Atmospheric entry continuity — absolute requirement
Atmospheric entry is a playable manoeuvre, not a cutscene. Preserve the same ship, planet, selected local region, position mapping, velocity/momentum, orientation/heading and player agency. Camera scale/perspective may change and atmospheric forces may change motion according to a researched game model, but the ship must visibly continue the same trajectory into local flight. Never respawn it at a generic location, teleport or hide broken continuity with a black fade. Prepare local terrain before it is revealed. The player must steer during entry, continue steering after entry, land or abort/pull up, exit and repeat. Test video at normal speed and frame-by-frame.

## Planetary exploration is a core pillar
Planets need coherent climate, geology, terrain, biomes, atmosphere, weather, huge oceans/coastlines/islands, local flight, meaningful landing and surface exploration. Players must be able to fly long distances, including across large seas. A ground vehicle/rover must be drivable and useful for exploration. Flora/fauna must be beautiful, strange, eerie or frightening through silhouette, behavior, animation, material, sound and ecological context — not random decorative clutter or recolored identical blobs. Species need habitat rules and stable identities. Alien organisms are fictional gameplay content, not claims about observed life.

## Ships and upgrades
Ships have distinct roles and actual handling differences. Currency comes from exploration and can unlock ships/equipment. Every supported upgrade must be a visible physical module attached to the ship and must change gameplay, not just a stat number. Examples: engine pods, thrusters, scanner assemblies, cargo, protection, landing supports or other researched/designable modules. Use data-driven attachment points and compatibility.

## Research standards
Research science, flight, climate, renderer/API behavior and reference gameplay when needed. Use authoritative sources/official docs/direct gameplay where possible. Record URL, title, author/org, date/retrieval date, claim supported, uncertainty and implementation impact. Keep observed fact, source-supported inference, engineering choice, game abstraction and fiction separate. Astronomy labels: observed/confirmed, candidate/debated, theoretical/hypothetical, fictional. Do not invent formulas, precise values, citations or tool results. Use subagents for genuinely independent research only when available; the lead verifies and synthesizes.

## Code/architecture rules
- Inspect the actual repository before editing; preserve user work, research, assets and uncommitted changes.
- Keep the game runnable after each completed task.
- Prefer small modules, clear ownership and data-driven content; avoid speculative enterprise abstractions.
- Separate simulation/domain state from Pixi display objects, UI and browser input where practical.
- Use deterministic hierarchical seeds and stable IDs. Re-requesting chunks in another order must not change worlds.
- Keep immutable generation separate from player discoveries and save modifications. Document coordinate spaces, units and frame-rate behavior.
- Use current official documentation for the installed PixiJS/Vite/TypeScript/Playwright/Capacitor versions.
- Preserve required license/NOTICE/attribution for every reused source file. Verify code and asset licenses separately.

## Agent must PLAY the game — mandatory QA
This project is not accepted through code inspection or screenshots alone. For every gameplay-affecting task, launch the actual build and actively play the relevant route using Playwright browser inputs. Use keyboard, mouse, pointer and touch emulation. Move the ship/rover; steer; brake; select systems; jump; enter and exit atmosphere; land; scan; observe organisms; earn/spend currency; buy/select ships; equip/remove upgrades. Test the real player input path, not just internal state injection.

For every meaningful task: (1) define a repeatable player route; (2) run the actual game; (3) use Playwright inputs and observe resulting behavior; (4) capture screenshots and video for animation/transitions; (5) inspect images at normal gameplay size and magnified crops; (6) check console/page errors and failed network requests; (7) test press/release, simultaneous inputs, pointercancel, focus loss, pause/resume and resize as relevant; (8) fix and replay the exact route; (9) record viewport, browser, seed, inputs and evidence paths. A screenshot after load is not a gameplay test. A unit test does not prove that a control is playable. For atmospheric entry, steer during entry and after it. For rover, actually drive. For upgrades, equip and fly. For economy, earn and spend.

Distinguish `BROWSER_DESKTOP`, `BROWSER_TOUCH_EMULATION`, `ANDROID_EMULATOR` and `PHYSICAL_ANDROID`. Never claim physical Android testing if it did not happen.

## Phase/task discipline
Read `PROJECT_STATE.md` and `TASK_INDEX.md`, then read the full current phase and all its task files. Respect dependencies. Work one task at a time; keep build runnable. Mark `VERIFIED` only after its Definition of Done and player test pass. Otherwise mark `BLOCKED` and record real evidence. Update trackers, decision/risk logs, documentation and evidence. Do not silently begin future phases. Do not change the user's tool/provider/model configuration.

## Git, push and Pages
Commit each completed, tested increment. Before commit inspect status/diff/staged files and scan for secrets. Never stage credentials, API keys, private data, local machine paths or caches. Never force-push or rewrite shared history. Confirm branch/remote; push verified checkpoints when configured and permitted. If remote/permission is unavailable, commit locally and state the exact blocker; never claim push occurred.

Use GitHub Actions for GitHub Pages. Configure the Vite `base` for the exact repository path; CI must install from lockfile, test, build, then deploy. Verify actual Actions status, open live Pages URL, inspect assets/console and smoke-play with Playwright. A green local build is not a successful deploy. Never commit tokens. If remote/access is not available, leave workflow prepared and record blocker.

## Completion
A task is done only when its player-visible result exists, automated tests pass, relevant behavior has been actively played, evidence is saved, docs/state are updated and a meaningful Git commit exists. A phase is done only when all tasks and its exit gate pass. Release is done only after the live Pages build has been verified and played.
