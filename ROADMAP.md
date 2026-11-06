# Roadmap — 27 gated phases

Each phase depends on the previous phase passing its exit gate. Do not skip.

## 01. Project audit and safe foundation

Inspect the actual repository, preserve all existing work, verify licensing and tooling, and establish a reliable workflow.

**Expected result:** A reproducible baseline, source/license ledger, task tracker, risk/decision logs and safe first checkpoint.

**Exit gate:** The existing project is inventoried and runnable or its exact blocker is documented; no user work was lost; source reuse is license-checked; baseline Git state is safe.

## 02. Faithful Android reference reconstruction

First make a faithful, playable reconstruction of the selected Android reference. Do not invent the later dream-game features yet.

**Expected result:** A playable reference-like baseline with version-specific behavior, controls and a source-backed parity report.

**Exit gate:** The agent has actually played the reconstruction through Playwright, and the major reference interactions work end-to-end. Screenshots alone do not pass.

## 03. Modularization and deterministic game core

Refactor the playable baseline into clear modules without changing the behavior.

**Expected result:** Small coherent modules, stable IDs/seeds, simulation/render/input/save boundaries and regression coverage. Save data is versioned with a documented migration contract from the first persistent state, so future releases migrate old saves automatically.

**Exit gate:** Reference routes still pass; the game remains runnable; new content can be added without rewriting the game loop.

## 04. Ship controls and movement feel

Make the ship feel responsive, precise and intuitive across keyboard, mouse and touch.

**Expected result:** Input abstraction, tuned ship handling, bespoke touch controls and tested edge cases.

**Exit gate:** Agent has actively flown the ship with keyboard and touch emulation; no stuck-input defect remains.

## 05. Space camera, scale and navigation feel

Make camera movement communicate scale and speed without disorienting the player.

**Expected result:** Stable coordinate contract, follow/zoom, parallax and event-based camera feedback.

**Exit gate:** No camera jumps, orientation loss, jitter or unreadable zoom remains across viewports.

## 06. Art direction and layered rendering architecture

Define a distinctive layered 2D visual identity and a renderer capable of rich depth without generic glossy 3D. Lighting is a first-class pillar: multi-level illumination, dynamic light sources, HDR-like color pipeline, bloom and emissive materials are designed here, not bolted on later.

**Expected result:** Art bible, render graph, material/LOD contracts, original icon grammar and reviewed visual prototype. A documented lighting model (light sources, HDR/bloom pipeline, shadows and emissive layers where justified) with measurable quality tiers for desktop and Android.

**Exit gate:** Representative star, ship, planet, nebula, surface and UI look authored at actual game scale and close crop; layer costs and purposes are documented.

## 07. Signature celestial visuals

Create memorable layered visual families for stars, planets, rings, asteroids, nebulae and black holes.

**Expected result:** A coherent in-game visual library with distinct silhouettes, materials, light, animation and distance/close LOD. Every family defines its own material response: emissive parts, self-shadowing cues, light scattering into the surrounding medium, and post-processing needs (bloom/glare for stars, glow for nebulae).

**Exit gate:** Players can encounter and inspect each family in actual play; all have close-up and normal-size evidence.

## 08. Ray-marching, optics and contextual screen filters

Implement spectacular optical effects and many screen-layer effects without false hardware-RT claims or constant filter spam.

**Expected result:** Measured post-processing graph with selective lensing, distortion, scattering/reflection approximations, contextual profiles and quality tiers. Bloom, HDR-like tone mapping, glare, volumetric light cues and atmospheric perspective are tuned as part of this graph — never as a permanent stack — and each effect documents its desktop/Android cost and low-tier fallback.

**Exit gate:** At least two signature effects trigger in gameplay; event profiles cleanly enter/exit; low-tier/reduced-motion modes work.

## 09. Universe, galaxies and deterministic systems

Build a persistent procedurally generated universe with stable identity and efficient streaming.

**Expected result:** Hierarchical galaxy/sector/system/body generation, stable seeds/IDs and separate player-save data.

**Exit gate:** Same seed/revisit produces the same world; chunk/order changes do not alter generated results; streaming stays bounded.

## 10. Star-system navigation and jumps

Let players discover systems, choose destinations and travel through satisfying, readable transitions.

**Expected result:** Functional system map, route validation, jump animation and arrival continuity.

**Exit gate:** Repeated multi-system journeys arrive at correct systems, preserve player state and remain playable on touch.

## 11. Astronomy catalogue and rare encounters

Add a scientifically honest range of astronomical classes and unusual encounters with clear gameplay identity.

**Expected result:** Typed evidence-labeled catalogue and playable encounters integrated with seeded universe generation.

**Exit gate:** All entries trace to sources; candidate/hypothetical/fictional labels are correct and encounters can be found/inspected in-game.

## 12. Planet generation and climate identity

Generate coherent planets whose climate, geography and local environments arise from a connected set of world parameters.

**Expected result:** Deterministic planet pipeline with climate regions and stable biome identity.

**Exit gate:** Same planet seed reproduces the same regions; different planet families are visibly and environmentally distinct.

## 13. Geology, terrain and enormous oceans

Build continuous streamed side-view surfaces with striking geological forms and long-distance ocean exploration.

**Expected result:** Terrain/shore/ocean representation with coherent material families, collision and seamless chunks. Surfaces and water read as lit materials: directional sun/shadow cues, specular and wet/foam responses on shorelines, atmospheric perspective over distances, and depth-dependent water scattering.

**Exit gate:** Player flies/drives across multiple landforms and huge water regions without seams, collision mismatch or obvious tile repetition.

## 14. Seamless atmospheric entry and trajectory continuity

Create a cinematic space-to-atmosphere transition that preserves the same ship and manoeuvre.

**Expected result:** Playable entry where ship, planet region, mapped position, heading, momentum and player control carry into local flight.

**Exit gate:** Player can steer during entry, continue the same trajectory in atmosphere, abort/retry and later land; no teleport or black fade.

## 15. Atmospheric flight physics and handling

Make atmospheric flight a distinctive piloting mechanic with environment- and ship-dependent behavior.

**Expected result:** Researched 2D flight model, flight modes, recovery and tuning matrix.

**Exit gate:** Same manoeuvre responds meaningfully to different atmospheres and ship configurations; flight is controllable and recoverable.

## 16. Planet surface atmosphere and visual environments

Make sky, haze, cloud, terrain and ocean scenes visually rich, layered and unmistakably different by world family.

**Expected result:** A family-based local planetary renderer with distinctive atmospheric depth, lighting and material response. Sky/atmosphere profiles define light color and scattering, cloud shadow cues, terrain sun/shadow behavior, HDR sky gradient, and haze/atmospheric perspective by world family — scaled by quality tier.

**Exit gate:** Several planet families are immediately distinguishable in actual flight and remain coherent during movement/zoom/weather.

## 17. Weather, hazards and screen-reactive effects

Create coherent weather that changes visuals, sound, flight, visibility, landing and screen distortion.

**Expected result:** Weather fronts and distinct effects for storms, dust, snow, fog, lightning, ash, heat and oceans. Weather is rendered as lit media: dust/snow/fog scatter light, lightning flashes expose the scene briefly, heat shimmer refracts, and each effect has documented blend-in/out plus performance cost and fallback.

**Exit gate:** Weather is spatially consistent and changes gameplay; filters blend in/out cleanly and never obscure critical controls.

## 18. Flora, fauna and living ecosystems

Create beautiful, strange, unsettling and compelling procedural life with actual behaviors and ecological context.

**Expected result:** Stable species catalogue, bespoke organism visuals, habitat logic, animation, observation and discovery. Creatures and plants are lit consistently with the world: contact shadows on ground flora, emissive organs where justified, subsurface/scattering cues for exotic tissue, and light interaction with skin/fur/wing materials.

**Exit gate:** Players can encounter, observe, scan and revisit distinctive species; they react to the world/player rather than sit as decoration.

## 19. Skillful landing and takeoff

Make landing a meaningful piloting interaction affected by terrain, weather, ship capability and approach quality.

**Expected result:** A continuous approach/touchdown/takeoff loop connected to rover deployment and space exit.

**Exit gate:** Player chooses a site, controls descent, lands at the exact approach location, deploys rover, relaunches and recovers from bad approaches.

## 20. Planetary rover and surface vehicle

Let players deploy a ground vehicle and explore planetary terrain in a different way from flight.

**Expected result:** Responsive rover, suspension/traction, distinct camera/controls and persistent ship-to-rover flow.

**Exit gate:** Player deploys, drives across varied surfaces, scans, returns to ship and retains exact rover position.

## 21. Exploration, scanning and currency economy

Give exploration purpose and persistent rewards; discoveries earn the currency used for ships and equipment.

**Expected result:** A balanced first-discovery economy, scanner/journal, persistent rewards and anti-duplication rules.

**Exit gate:** Player earns currency from new discoveries, reloads, revisits without duplicate rewards and buys a meaningful unlock.

## 22. Ship fleet, roles and hangar

Add a fleet of unlockable ships that differ mechanically and visually.

**Expected result:** Data-driven roster, hangar, ownership/purchase and tested ship-specific flight profiles.

**Exit gate:** Player earns/buys/selects ships and feels real differences in space and atmosphere.

## 23. Visible modular ship equipment and upgrades

Make upgrades real physical additions to the ship that visibly alter its structure and change gameplay.

**Expected result:** Attachment anchors, original module art, compatibility rules, stat/ability effects, purchases and saved loadouts.

**Exit gate:** Every supported upgrade is visibly attached and produces measurable behavior; removal reverts behavior and saves persist.

## 24. Animation, sound, interface and accessibility

Give actions and worlds authored motion/audio feedback while keeping a clear minimal interface.

**Expected result:** Reusable motion grammar, event-driven sound, bespoke HUD and persistent accessibility settings. UI and animation respect the lighting model: emissive HUD accents, energy-consistent highlight states, and light-reactive interface feedback where it aids readability without becoming noise.

**Exit gate:** Core interactions have coherent feedback; motion can be reduced; UI remains legible and uncluttered.

## 25. Performance and Android delivery

Measure demanding scenes, implement quality tiers, and build/test the Android app on the actual available Windows toolchain.

**Expected result:** Performance reports, LOD/fallbacks, safe GPU lifecycle, reproducible Capacitor/APK workflow and honest device matrix. Quality tiers scale the full lighting/postFX stack on both PC and Android, and the release architecture is complete: versioned builds, automated Web (GitHub Pages) and APK publishing, GitHub Releases, an in-game update check and a save-version migration path so progress survives every upgrade.

**Exit gate:** Representative scenes meet measured budgets or adapt gracefully; Android build/install succeeds when tooling/device are available.

## 26. Content expansion and long-session balance

Turn the implemented features into a coherent, replayable exploration game with meaningful variety and persistence.

**Expected result:** Curated seed catalogue, balanced progression, reduced repetition and reliable long-session saves.

**Exit gate:** Multiple distinct journeys are playable; progress survives reload; content systems reinforce one another rather than feel isolated.

## 27. Full QA, release and GitHub Pages deployment

Deliver a stable, beautiful, genuinely playable release with verified commits, pushes, automated CI and live GitHub Pages.

**Expected result:** Release candidate, full player QA matrix, visual audit, GitHub Actions and live Pages evidence. The release pipeline delivers the full update story: semantic versioning, automated Web build to GitHub Pages and APK build to GitHub Releases, in-game update checking, and verified migration of old save data so no player progress is lost between versions.

**Exit gate:** Fresh clone builds/tests; critical journeys pass; Actions deploy is green; live Pages URL serves and can be actively played.
