# FIRST TASK FOR OPENCODE — RESEARCH, DESIGN, AND TECHNICAL PLAN

Read the complete root `AGENTS.md` first and follow it as the project's persistent charter. Do not start by coding the game. This first task is to build a reliable, evidence-backed preproduction package so that the later implementation has a clear scientific, visual, gameplay, and technical direction.

## Mission

Study the Android Easter Egg-inspired space exploration reference, understand its mechanics and procedural generation, research a broad and scientifically honest catalogue of astronomical objects, and design a distinctive high-quality 2D procedural space game that can be developed in a browser and packaged as an Android app from Windows.

The target is not a clone of the reference's schematic presentation. Use it to learn the interaction loop, navigation, seed behavior, procedural systems, objects, landing/collision, zoom, and viewer concepts. Our target visual quality is substantially higher: minimalist, spacious, luminous, atmospheric, richly detailed at close range, and carefully optimized for mobile.

## Phase A — Audit the workspace and environment

1. Inspect the repository root, Git status, existing files, existing work, and any existing project instructions. Preserve everything already present.
2. Confirm available versions of Node.js, npm, Git, Java, Android SDK/ADB, and relevant browser tooling. Android Studio is already installed by the user; do not reinstall it.
3. Do not change global npm packages, PATH, OpenCode configuration, model/provider selection, MCP configuration, environment variables, Android SDK settings, or user files.
4. Do not install packages globally. If a tool or browser is missing, report it and propose the smallest local/project-level installation only when justified.
5. Record environment details and what could not be verified in `docs/research/MOBILE_DELIVERY.md` or a short environment section in that document.

## Phase B — Study all three primary LAndroid areas

Inspect these exact URLs:

- https://landroid.js.org/player.html — Android 14 player.
- https://landroid.js.org/player15.html — Android 15/16 player.
- https://landroid.js.org/viewer.html — Android 14/15/16 Planet Viewer.
- Supplementary index: https://landroid.js.org/eggs/
- Main page: https://landroid.js.org/
- Source repository: https://github.com/lll69/landroid-web

Do not stop after reading the landing page. Inspect the runtime pages and their actual controls. Clone the public source repository into an isolated research/reference folder if Git access is available. Record its current commit hash, branch, retrieval date, package structure, license/NOTICE files, and relevant modules. Never modify the reference checkout.

Use Playwright to test each accessible interactive page. Capture screenshots and record:

- Initial state and loading behavior.
- Input methods and movement response.
- Spacecraft position/speed/metadata displays.
- Star/system metadata and body counts.
- Seed options: daily, evergreen, fixed seed, and valid range handling.
- Zoom options: fixed, dynamic, manual; observe transitions and camera behavior.
- Autopilot and pause/resume where present.
- Object discovery, proximity, collision, landing, and any surface/planet interaction.
- Planet Viewer: date selection, displayed types, names, system/body counts, and any limits.
- Differences between Android 14 and Android 15/16 implementations.
- Responsive behavior and useful details on desktop-sized and phone-sized viewports.

For every observation, mark whether it was directly observed in the browser, read from source, inferred, or unavailable. Do not invent behavior because the reference summary mentions it.

Read the source repository deeply enough to understand the generator and mechanics. Use `rg`/`git grep` to locate seed logic, world generation, object models, orbital logic, movement/input, zoom/camera, landing/collision, viewer/date logic, and tests. Trace important code paths rather than merely listing filenames.

The site states an Apache-2.0 license. Verify the repository's actual LICENSE and NOTICE files. Treat the reference primarily as inspiration. Do not bulk-copy code/assets. If reuse is recommended, explain precisely what, why, and the required notice/attribution handling.

Deliver `docs/research/REFERENCE_AUDIT.md` with a feature matrix:

| Reference feature | Page/source location | Observed behavior | Source implementation | Adopt? | Our improvement |

Also include a concise description of what is genuinely fun/useful in the original interaction loop and what should be changed for our product.

## Phase C — Research astronomy and build the object taxonomy

Research real astronomical objects and phenomena from authoritative sources. Start with NASA, ESA, IAU, JPL, NASA Exoplanet Archive, NASA ADS, Gaia, and recognized astronomical catalogues. Use primary datasets and current documentation where possible.

You must cover the families in `AGENTS.md` section 4, and add uncommon but credible classes discovered during research. The catalogue must include stars and stellar systems; planets and exoplanets; dwarf planets; moons and ring systems; asteroids, comets, minor bodies and interstellar visitors; brown dwarfs; white dwarfs; neutron stars, pulsars and magnetars; black holes; nebulae and remnants; quasars and active galaxies; galaxy types and large-scale structures; transients and high-energy events; plus explicitly hypothetical objects such as white holes and wormholes.

For every category/subcategory record:

- Common and scientific names / aliases.
- What physically defines it.
- Evidence status: confirmed, candidate/debated, hypothetical, or fictional.
- Approximate physical parameters and units, with uncertainty where relevant.
- Formation/evolution context, host/parent relationships, and characteristic environment.
- What makes it visually recognizable, while distinguishing real expected features from artistic visualization.
- What gameplay behavior could be derived from the physics.
- Source URL/DOI, date checked, and the exact claim that source supports.

Explicitly resolve the tricky cases:

- Do not treat white holes as observed; explain that they are hypothetical and have no observational confirmation.
- Distinguish observed stellar-mass and supermassive black holes from the still-developing intermediate-mass evidence and hypothetical primordial population.
- Explain the fuzzy boundary between the most massive giant planets and brown dwarfs; do not invent a universally accepted “ultra-heavy planet” formal class.
- Distinguish an astronomical object from a transient event, a remnant, a structure, a classification descriptor, or a theoretical solution.
- Distinguish formal IAU Solar System categories from common exoplanet descriptors such as hot Jupiter, super-Earth, mini-Neptune, and super-puff.
- Record scientific uncertainty. Never supply false exactness.

Investigate how to use the NASA Exoplanet Archive, JPL Small-Body Database API, and JPL Horizons API. Do not make the core game dependent on a live external API. The game should generate synthetic but plausible systems offline; curated real-catalogue data can enrich an optional “known objects” or reference mode.

Deliver:
- `docs/research/ASTRONOMY_CATALOGUE.md`
- `docs/research/SOURCE_REGISTER.md`
- A proposed typed data schema and evidence-status model in `TECHNICAL_ARCHITECTURE.md`.

## Phase D — Define the art direction in concrete terms

Do not write “make it beautiful” and stop there. Translate the vision into a practical art-direction specification.

The desired look:

- Minimalist, spacious, elegant, and immersive.
- The universe should feel enormous; keep substantial dark negative space.
- Stars and exotic objects can be intensely luminous, but luminosity must have hierarchy.
- Planets should have procedurally generated identity, atmosphere, lighting, surface pattern, and optional rings/clouds without relying on pre-painted planet textures.
- Nebulae should feel layered and organic, not like random colorful noise.
- Black holes should be visually distinctive and physically inspired, with a clean silhouette, accretion disk, lensing distortion, and restrained light bloom.
- Motion should make the ship feel responsive and the world feel alive: subtle camera easing, engine exhaust, particles, orbital motion, speed streaks, event-driven shake, and carefully timed transitions.
- Interface should feel purpose-built, not like an aircraft cockpit or a generic AI dashboard. A simple joystick and a few contextual controls are the default direction to prototype.

Specify:

1. Visual pillars and anti-patterns.
2. Palette and rules for color assignment by object family.
3. Planet material language and surface-generation layers.
4. Star, nebula, ring, black-hole, neutron-star, quasar, and galaxy visual signatures.
5. Lighting, glow, bloom, particles, trails, camera motion, screen shake, distortion, and transition guidelines.
6. HUD hierarchy and touch-control concepts.
7. At least 5 named example scenes (for example: quiet red-dwarf system, ringed gas giant close pass, storm world, nebula crossing, black-hole encounter) described in enough detail to guide implementation.
8. Quality tiers and the visual fallback order for lower-end phones.

Deliver `docs/research/ART_DIRECTION.md`.

## Phase E — Design the game loop and controls

Define the core loop from launching into a system through navigation, scanning/discovery, orbital approach, landing or close inspection, and onward travel. Avoid feature bloat. Clearly separate the minimum compelling loop from future expansion.

Design the camera and scale-transition model. Explain how the player navigates a galaxy/sector map, how systems are selected, how local flight works, and what happens at planetary approach. Do not imply that a 2D rendering is a full 3D simulation.

Propose desktop and mobile controls. For mobile, prototype a left thumb joystick and a compact context-sensitive right-side action area, but test alternatives against thumb reach, hand comfort, safe areas, and screen aspect ratios. Include pause, settings, reduced motion, sound/haptics control, and accessibility considerations.

Deliver `docs/research/GAME_DESIGN.md`.

## Phase F — Propose the technical architecture and mobile release path

Validate the proposed stack (do not accept it blindly): TypeScript + PixiJS 8 + Vite + WebGL 2 baseline + GLSL ES + Capacitor Android. Use Context7 and official documentation to verify current PixiJS 8 APIs, shader/filter architecture, Vite, TypeScript, Playwright, and Capacitor/Android requirements.

Compare only lightweight, credible alternatives if they solve a real problem. Do not pivot to Unity/Godot/Unreal. Do not introduce WebGPU as a hard requirement. Explain why the chosen renderer can achieve the desired visual result without hardware ray tracing.

Specify modules and boundaries for:

- Core/domain types and astronomical object registry.
- Seeded procedural generation.
- System/orbit model and local ship physics.
- World streaming/LOD/spatial queries.
- PixiJS renderer and render layers.
- Shader/effect library.
- Input abstraction and touch/keyboard implementations.
- HUD/UI overlay.
- Save/discovery/bookmark persistence.
- Sound/haptics and accessibility.
- Diagnostics/performance settings.
- Browser and Android build/test tooling.

Define measurable budgets and targets as initial hypotheses, not guaranteed facts: frame-time goals, particle caps, effect-resolution strategy, draw-call/batch monitoring, memory awareness, and Low/Medium/High quality modes. Recommend what to benchmark on real Android hardware before finalizing numbers.

Document Android on Windows:

- Browser development and Playwright testing remain the fastest loop.
- Build web assets, sync with Capacitor, build Android debug APK locally, install by Android Studio or ADB.
- Explain APK (direct install) vs AAB (store distribution; not installed directly like an APK).
- Explain what requires signing for release.
- State that Android development/building does not require a Mac, while local iOS builds require macOS/Xcode.
- Verify the currently installed SDK/JDK and Capacitor compatibility rather than guessing.

Deliver:
- `docs/research/TECHNICAL_ARCHITECTURE.md`
- `docs/research/MOBILE_DELIVERY.md`

## Phase G — Create project-local skills

Create the eight on-demand skills listed in `AGENTS.md` under `.opencode/skills/`. Confirm OpenCode V2-compatible frontmatter and directory naming. Do not create a skill that simply repeats all of AGENTS.md. Each skill must contain a practical workflow, checklists, documentation/source guidance, and anti-patterns.

## Phase H — Roadmap and decision report

Create:
- `docs/research/ROADMAP.md` — phased milestones, dependencies, acceptance criteria, and explicit stop/go gates.
- `docs/research/DECISIONS.md` — date, context, options, decision, trade-offs, revisit conditions.
- `docs/research/OPEN_QUESTIONS_AND_RISKS.md` — scientific, UX, rendering, mobile, scope, licensing, and performance risks.

The first recommended implementation milestone should be a polished vertical slice: one deterministic star system, a responsive ship, a few procedural planets, camera/zoom, one close interaction or landing prototype, one signature shader effect (preferably a black-hole encounter), and browser tests. It must demonstrate the target art direction rather than use greybox placeholders.

## Phase I — Final response

When the research package is complete, give the user a Russian-language report with:

1. What you inspected and what you could not inspect.
2. The most important discoveries from the three LAndroid areas and the source repository.
3. The proposed visual direction in concrete language.
4. The scientific object taxonomy and how evidence labels work.
5. The recommended architecture and why.
6. The simplest Windows → Android APK workflow.
7. The eight skills created.
8. The proposed vertical slice and roadmap.
9. Tests/tools used, with truthful limitations.
10. A short list of decisions that actually require user input.

Do not implement the complete game in this first assignment. Do not install global tools or edit OpenCode configuration. Do not pretend that all astronomical objects have been exhaustively catalogued. Finish the research and design package, then wait for the user's next instruction before the main implementation.


---

# ADDENDUM — EXPANDED PLANETARY FLIGHT AND ENVIRONMENT RESEARCH

This addendum expands the original preproduction scope. It does not replace or shorten any earlier phase. The project is not limited to orbital navigation, a planet viewer, or a simple landing animation. Before selecting an implementation model, investigate the full planetary experience described below and provide separate research reports.

## Additional research objectives

1. **Atmospheric entry and continuous arrival:** research how a player can approach a planet from space, enter its atmosphere, transition the camera and scale, and arrive in a consistent local region. Study transitions, cloud/atmosphere layers, curvature, horizon, lighting, parallax, local world streaming, no-atmosphere cases, aborts, and exits.
2. **Detailed planetary flight:** research aircraft-like and spaceplane-like movement for a 2D side-view game. Compare horizontal travel, vertical movement, hover/VTOL, momentum, thrust, lift/drag-inspired models, stabilization, braking, wind, turbulence, gravity, and atmospheric density. Do not assume an equation or handling model in advance; source and compare alternatives, then recommend a playable model.
3. **Planetary climates:** investigate how stellar input, orbit, atmosphere, pressure, composition, albedo, rotation, axial tilt, geology, gravity, water, seasons, and tidal locking influence climate. Translate findings into a procedural climate model with evidence labels and explicit game abstractions.
4. **Biomes and terrain:** research deserts, dunes, frozen regions, glaciers, mountains, canyons, volcanic landscapes, forests or speculative vegetation, wetlands, coastlines, salt flats, crater fields, and other credible or clearly fictional environment families. Explain their generation dependencies and visual signatures.
5. **Weather and environmental gameplay:** investigate sandstorms, dust fronts, blizzards, wind, precipitation, fog, clouds, electrical storms, volcanic ash, heat/cold stress, atmospheric visibility, and how environmental conditions can affect flight, navigation, visibility, and landing.
6. **Oceans and large-scale geography:** research ocean worlds, archipelagos, coastlines, waves, currents where useful, sea/ice transitions, storms over water, and the gameplay of long flights across large water regions. Determine how a 2D view can imply enormous planetary extent while streaming only a local region.
7. **Landing and takeoff:** research landing surfaces, slopes, roughness, obstacles, wind, visibility, environmental hazards, ship capability, stabilization, touchdown feedback, and recovery from poor approaches. Landing must be an interaction rather than teleportation.
8. **Life and ecosystems:** research habitability and astrobiology without presenting speculative alien life as observed fact. Design a scalable model for organisms, ecological niches, environmental dependencies, behavior, scanning/discovery, avoidance, and hazards.
9. **Ship variety:** research how different ships can have distinct flight handling, atmospheric performance, hover capability, equipment and environmental tolerance. Define a data-driven extension system so additional ships can be added independently.
10. **Visual and technical implementation:** research 2D side-view terrain, ocean, atmosphere, cloud, weather, ship, and lighting techniques compatible with PixiJS/WebGL 2 and mobile hardware. Compare true capabilities with visual approximations honestly.

## Required investigation method

If parallel agents are available, delegate independent tracks for aerospace/flight research, atmospheric entry and camera, planetary climate/weather, geology/biomes/oceans, astrobiology/ecosystems, game-reference analysis, and 2D rendering/performance. Give each track a separate report file. The primary agent must verify sources, reconcile disagreements, and synthesize recommendations. If subagents are unavailable, research each track sequentially. Never claim delegation that did not occur.

Each report must include its research questions, methodology, authoritative sources, source-supported findings, ranges and units where appropriate, uncertainty and conflicting evidence, candidate design models, trade-offs, recommended approach, implementation implications, tests, and unresolved questions. Do not write a predetermined physics solution from intuition. The agent must conduct the research and decide what is scientifically grounded, what is a game approximation, and what is fictional.

## Required additional reports

Create the expanded reports listed in `AGENTS.md` section 19. At minimum these must include `PLANETARY_FLIGHT_PHYSICS_RESEARCH.md`, `ATMOSPHERIC_ENTRY_AND_CAMERA.md`, `PLANETARY_CLIMATE_AND_WEATHER.md`, `BIOMES_GEOLOGY_AND_OCEANS.md`, `FAUNA_ECOSYSTEMS_AND_HAZARDS.md`, and `SHIP_FLIGHT_MODEL_AND_ARCHETYPES.md`. Update the source register and architecture/design documents without deleting prior findings.

The intended experience includes a close side-view planetary mode. The ship should support horizontal travel and vertical maneuvering, not merely move along a single fixed line. A planet may contain enormous oceans to cross, shifting weather, dust and sand storms, icy regions, hazardous terrain, and fauna or other environmental encounters. These are connected procedural systems, not random decorations or isolated level presets.
