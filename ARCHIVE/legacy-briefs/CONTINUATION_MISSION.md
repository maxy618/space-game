# CONTINUATION MISSION — RESEARCH, DESIGN, AND BUILD THE EXPANDED SPACE EXPLORATION GAME

## Mission intent

Continue the existing project; do not restart it. The previous research and architecture work is valuable context. The objective is to turn the existing concept into a beautiful, playable, expandable 2D space-exploration game whose planetary experience includes atmospheric entry and aircraft-like side-view planetary flight.

The user wants an ambitious game, not an enterprise software product. They do not expect the entire universe, every ship, or every biome to be finished in one pass. They do expect the first playable implementation to establish the real visual identity, key gameplay transitions, robust extension points, and a credible path to much more content.

The research must be performed by the agent. Do not rely on the user to provide formulas or technical answers. Research each topic, use specialist/parallel agents when helpful and actually available, produce separate detailed reports, synthesize findings, then implement and test.

## 0. Mandatory first actions

1. Read `AGENTS.md` completely and load relevant skills from `.opencode/skills/`.
2. Read `INITIAL_TASK.md`, `FINAL_REPORT.md` if present, and all existing `docs/research/` reports. Also inspect `README.md`, `package.json`, source code, tests, Git status, and current build state.
3. Identify which parts of the original preproduction report have already been completed. Do not redo finished work unless verification reveals a gap or outdated claim.
4. Preserve all existing user work, files, configuration, saves, and local changes. Do not delete or overwrite research. Append, cross-link, or create versioned/additional reports.
5. Read `MISSION_PROGRESS.md` if it exists and resume from its last verified checkpoint.
6. Do not ask the user to repeat the vision or approve decisions already supported by the documents. Make reasonable decisions, record trade-offs, and proceed.

## 1. Core experience to build

The game is a visually exceptional 2D space exploration sandbox. The player pilots a spacecraft through star systems, discovers celestial objects, approaches planets, enters atmospheres where applicable, explores large generated planetary regions, flies horizontally and vertically in a close side-view mode, encounters different climates/weather/geography, chooses a landing place, lands, takes off, and returns to space.

Space navigation and local planetary flight may use different camera and control models. Their transition must feel intentional and preserve the sense that the player is visiting a specific location on the same generated world.

Planetary environments must have coherent generated identities. Some worlds may be dominated by deserts and sandstorms; others by ice, glaciers and blizzards; others by huge oceans and island chains that require long-distance flight. Other regions may contain mountains, canyons, volcanic terrain, dense atmospheric haze, unusual weather, or speculative ecosystems. These examples are a starting point, not a limit or a requirement that every world contain everything.

The ship should not be stuck on a single horizontal rail. Research and implement a satisfying flight model with horizontal travel and vertical maneuvering. Different ship types should eventually have distinct handling and capabilities. The exact physical model and simplifications must be chosen after research, not invented from intuition.

## 2. Parallel research orchestration

Before implementing complex planetary systems, run a focused research phase. If the environment supports subagents/parallel agents, assign independent tracks with separate output files. Use parallelism only where it saves time and avoids overlapping edits. The main agent remains responsible for source verification, synthesis, design decisions, integration, and testing.

Suggested tracks:

A. **Atmospheric flight and aerospace fundamentals** — research the physical concepts relevant to a 2D side-view game: atmosphere, gravity, thrust, lift/drag/stability where relevant, turning, momentum, hover/VTOL, wind, turbulence, density, and landing. Compare realistic, simplified, and arcade models. Recommend a model with clear trade-offs.

B. **Atmospheric entry and transition design** — research entry/descent patterns, camera/scale transitions, planet continuity, local-region streaming, cloud/haze layers, and relevant game references. Study the player experience of No Man's Sky atmospheric arrival using public gameplay footage and official material; identify what can be adapted to an original 2D design.

C. **Climate and planetary environments** — research the scientific drivers of climate, atmospheric classes, climate gradients, day/night and seasonal behavior, tidal locking, water states, and regional variation.

D. **Geology, terrain, biomes, and oceans** — research terrain formation and visual signatures, deserts/dunes, ice/glaciers, mountains, canyons, volcanic/ash terrain, coastlines, ocean worlds, waves, islands, and traversal scale.

E. **Weather and environmental gameplay** — research storms, dust, sand, blizzards, wind, turbulence, fog, clouds, precipitation, electrical activity, ash, visibility, and their gameplay implications.

F. **Astrobiology, fauna, ecosystems, and hazards** — research habitability and ecological niches; distinguish known terrestrial biology from speculative alien life; propose a scalable discovery/avoidance/interaction model.

G. **2D rendering, art direction, and performance** — investigate continuous side-view environments, terrain/water/cloud/weather rendering, procedural detail, camera, LOD, WebGL2/PixiJS constraints, mobile fallbacks, and polished bespoke interface assets.

H. **Gameplay reference analysis** — compare several public game references for atmospheric approach, planetary flight, landing/takeoff, ocean crossing, exploration pacing, and discovery. Avoid one-to-one copying.

If subagents are not available, research each track yourself in a disciplined sequence. Do not pretend parallel agents ran. Do not create many agents with duplicate goals. Give every agent a bounded question set, explicit report path, citation requirements, and a deadline/stop condition within the active session.

### Research quality contract

Every report must include: scope/questions; search/research method; sources with URLs/DOIs and access dates; source-backed findings; units/ranges where meaningful; uncertainty and disagreement; alternatives; game-specific recommendation; what should ship now versus later; technical implications; tests/acceptance criteria; remaining questions.

Verify important claims yourself. A subagent summary is not automatically evidence. Use official/primary and peer-reviewed material where possible. Separate confirmed science, candidates, theoretical models, gameplay conventions, implementation approximations, and fictional content. Do not invent equations, coefficients, citations, benchmark values, or API behavior.

## 3. Required research reports

Create or update these files under `docs/research/`, preserving all previous reports:

- `PLANETARY_EXPLORATION_OVERVIEW.md`
- `PLANETARY_FLIGHT_PHYSICS_RESEARCH.md`
- `SHIP_FLIGHT_MODEL_AND_ARCHETYPES.md`
- `ATMOSPHERIC_ENTRY_AND_CAMERA.md`
- `PLANETARY_CLIMATE_AND_WEATHER.md`
- `BIOMES_GEOLOGY_AND_OCEANS.md`
- `FAUNA_ECOSYSTEMS_AND_HAZARDS.md`
- `PROCEDURAL_PLANET_PIPELINE.md`
- `PLANETARY_RENDERING_AND_ART_DIRECTION.md`
- `PLANETARY_GAMEPLAY_AND_CONTROLS.md`
- `PLANETARY_TEST_PLAN.md`
- `EXPANDED_IMPLEMENTATION_ROADMAP.md`

Update existing `SOURCE_REGISTER.md` (or `SOURCES.md` if that is the established name), `TECHNICAL_ARCHITECTURE.md`, `GAME_DESIGN.md`, `ART_DIRECTION.md`, `ROADMAP.md`, and `DECISIONS.md` with concise cross-links and decisions. Do not duplicate entire reports in the summary docs.

## 4. Integrated design decisions

After research, the main agent must synthesize a coherent design rather than leaving a pile of disconnected reports. Decide and document:

- the player journey and state machine from space to planetary flight and back;
- which planetary bodies have atmospheres and which entry paths are possible;
- camera scale, framing, orientation, parallax, and visual continuity;
- the selected side-view movement/flight model and its intentional approximations;
- how horizontal and vertical movement, altitude, hover/stability, braking, and landing are controlled;
- how ships differ through data-driven capabilities without forking the core controller;
- how planet-wide climate leads to regional biomes and local terrain;
- how weather is generated, updated, spatially coherent, and tied to gameplay;
- how oceans, coasts, islands, terrain and hazards support long traversal;
- how fauna/ecosystems are represented without making unsupported science claims;
- how generation is deterministic and chunk boundaries remain continuous;
- how saves preserve discoveries and player changes while procedural base worlds remain reproducible;
- what must be implemented in the first slice and what belongs in future milestones.

For each decision include options considered, evidence, chosen approach, trade-offs, revisit conditions, and acceptance tests.

## 5. Implementation sequence

Do not rush directly into a huge world generator. Implement a coherent, polished vertical slice in ordered stages. Adapt the sequence to the existing codebase, but preserve every essential capability.

### Stage 0 — Existing project audit

Inspect the actual source, package scripts, architecture, design reports, tests, screenshots, and current work. Run the existing app and tests before modifying it. Record baseline issues. Create/update `MISSION_PROGRESS.md`. Preserve local changes and do not reset or clean the repository destructively.

### Stage 1 — Research and synthesis

Complete section 2 tracks, create section 3 reports, verify references, synthesize decisions, and update roadmap. Only ask the user if a choice is truly impossible to infer and would materially change the project. Otherwise make and record the best choice.

### Stage 2 — Game architecture foundation

Implement or adapt modular boundaries for universe/system generation, planetary world generation, simulation, ship definitions, flight controllers, camera/state transitions, rendering, UI, weather, terrain, landing, persistence, audio and testing. Avoid overengineering: use clear typed interfaces and extension points justified by actual future requirements.

### Stage 3 — Space-flight quality pass

Ensure the existing space mode is genuinely playable and visually polished: movement, camera, celestial interactions, travel/approach, procedural system identity, and visual effects. Do not regress already-working features.

### Stage 4 — Atmospheric approach and entry

Implement the full approach/entry transition informed by research. The view should evolve from planet/orbit scale into atmospheric/local scale. Preserve world identity and approximate geographic continuity. Make entry work repeatedly and handle no atmosphere, aborted entry, and edge cases.

### Stage 5 — Side-view planetary flight

Implement a large continuous 2D side-view environment with horizontal travel and vertical maneuvering. Use the researched handling model. Ensure responsive keyboard and touch controls, terrain clearance, camera follow, braking/stabilization or other selected controls, speed/altitude feedback, and stable streaming.

### Stage 6 — First signature planet

Create one detailed planet with strong identity, coherent climate, layered terrain, atmospheric/sky treatment where applicable, and at least one meaningful environmental condition. Use procedural visuals, not flat placeholder circles or generic repeated tiles. The environment must look compelling both in full-frame composition and close-up inspection.

### Stage 7 — Environment variety prototype

Add at least three distinctive environment test cases selected from research, ideally:

- a desert/arid world or region with coherent dunes/rock formations and dust/sand weather;
- an icy/frozen world or region with snow/ice forms and blizzard/visibility behavior;
- an ocean-dominant world or region with continuous water, coastlines/islands, and a meaningful long-distance crossing.

Do not make them simple palette swaps. Each should have unique terrain/material hierarchy, atmospheric cues, weather, gameplay effect, and landing considerations. The architecture should support more climate/biome families later.

### Stage 8 — Landing and takeoff

Implement landing-zone search/feedback, approach, stabilization, descent, touchdown, landed state, takeoff, and transition back to flight/space. Account for ship capability, slope, roughness, obstacles, surface type, wind, visibility, and hazards according to the selected model. Keep the system understandable and fair.

### Stage 9 — Extensible ship system

Implement at least two meaningfully different ship configurations to prove extensibility. Ship data should define visuals, handling parameters, abilities/equipment hooks, and relevant environment capability. Shared code handles common movement/input/collision. Add ship types without rewriting core systems. Do not create a large inventory/upgrades platform before it is needed.

### Stage 10 — Weather and ecosystem sample

Add a small number of meaningful environmental systems. Weather should be spatially coherent and influence visibility/flight/landing where intended. Add one or more life/ecosystem encounters only if they fit the design and performance scope. Keep discovery and avoidance as valid interactions; avoid needless combat and graphic content.

### Stage 11 — Visual craft pass

Refine world composition, procedural terrain, ocean rendering, cloud/atmosphere, weather, ship silhouettes/materials, engine effects, particles, lighting, shaders, camera transitions, and sound feedback. Research the strongest feasible real-time effects for the chosen stack and mobile targets. Distinguish actual hardware ray tracing from GLSL/screen-space approximations; never claim RTX/path tracing if the implementation is not that.

### Stage 12 — Bespoke UI and iconography

All player-facing text is concise, natural English. Prefer original custom icons and visual feedback. Do not use emoji, Unicode symbols, Lucide, Font Awesome, Material Icons, generic icon fonts, or ready-made icon libraries as final game icons. Draw icons specifically for the game using custom SVG paths, vector geometry, or PixiJS Graphics. No generic dashboard, fake telemetry, random gradients, arbitrary decorative shapes, or unnecessary text.

### Stage 13 — Optimization and Android

Profile both space and planetary scenes. Include oceans, long terrain horizons, weather, cloud, particles, multiple ships, fauna, transitions, and camera zoom. Use measured LOD, culling, chunk budgets, adaptive resolution, and quality tiers. Build the Android debug APK with existing tools. Test on emulator/real phone if available; do not mistake desktop performance for mobile validation.

### Stage 14 — Mandatory play-testing and visual inspection

Actively play the game through Playwright or the available real input path. Do not merely start a dev server or run tests. Perform complete loops: space flight, planet approach, atmospheric entry, side-view flight, vertical maneuvering, different climates, long ocean travel, weather exposure, landing, takeoff, and return/revisit.

Capture screenshots/video at key moments and multiple viewports. Inspect both the whole scene and tightly cropped/zoomed details: ships, custom icons, terrain edges, material patterns, waves, clouds, atmosphere, particles, text, HUD, animations, and transitions. Look for cheap-looking details, visual artifacts, blur, clipping, texture stretching, tiling, seams, pop-in, camera snaps, collision defects, inconsistent lighting, unreadable controls, and weak composition. Fix issues and repeat the same gameplay path. Never declare visual quality based on one screenshot or a quick glance.

### Stage 15 — Final verification and roadmap update

Run unit/invariant tests, Playwright E2E, build/typecheck/lint, browser visual review, Android build, and available device tests. Report results truthfully. Update roadmap, decisions, source register, visual QA log, and `MISSION_PROGRESS.md`. List what's playable, what's partial, what remains, and the exact next development stage.

## 6. Scalability requirements

The first slice must not be a throwaway one-off. Build data-driven extension points for:

- multiple ship archetypes and handling configurations;
- ship visuals, modules/equipment/abilities when introduced;
- celestial classes and planet classes;
- climate families, regional biomes, weather patterns and rare events;
- terrain materials, geological features, oceans/coasts and local landmarks;
- fauna/ecosystem definitions and behaviors;
- scan/discovery metadata and player bookmarks;
- future upgrades/progression only when a real gameplay loop justifies them.

Use stable IDs, deterministic hierarchical seeds, typed registries/configuration, clear simulation/render separation, versioned saves, chunk/region streaming, and tests for adding new content. Avoid giant switch statements, giant central files, premature plugin frameworks, service architectures, accounts, cloud dependencies, multiplayer, payment, analytics, admin tools, and other unrelated enterprise systems.

## 7. Non-negotiable visual standards

The target is a distinctive, high-quality commercial game art direction. Avoid generic AI-looking UI and procedural noise masquerading as art. Use intentional silhouettes, coherent material grammar, restrained color hierarchy, meaningful negative space, layered depth, accurate scale cues, carefully controlled glow, high-quality motion, and world-specific visual identities.

All icons must be bespoke game artwork. No emoji, Unicode symbols, Lucide, Font Awesome, Material Icons, generic icon fonts, or ready-made symbol packs as final icons. Use original vector paths, custom geometry, or PixiJS Graphics.

Inspect visual work at actual gameplay size and in close crops. A planet must not look like a blurred circle at close range; a ship must have a deliberate silhouette; weather must have coherent direction/structure; oceans must communicate scale; terrain should not tile obviously; transitions should be smooth and continuous. Maintain a defect log and fix visible defects before progressing to more content.

## 8. Tools and configuration boundaries

Use the existing toolchain and configured integrations. Do not reinstall working tools. Do not change global OpenCode settings, model/provider, environment variables, API keys, or MCP configuration. Do not add/remove MCP servers or plugins during this mission unless the user separately asks. Use Sequential Thinking if it is already configured and genuinely useful; it is not a mandatory step for every task. Use Context7/official docs for current APIs and Playwright for gameplay testing where available. If a tool is missing, use an alternative and record the limitation.

## 9. Rate-limit/context resilience

The mission may take more than one session. Keep `MISSION_PROGRESS.md` accurate and useful. After each major phase, record verified completion, report paths, sources checked, commands/tests, failures, current branch/Git state, decisions, and next concrete actions. Before a rate/context limit, save the current work and a precise resume point. The next session must read the checkpoint and continue; do not restart completed tasks or claim the full game is done when it is not. Do not promise background execution or wait for a later reset.

## 10. Final completion conditions

Do not stop at a research outline, technical scaffold, isolated landing animation, or static screenshots. The first expanded planetary slice is complete only when:

- a player can fly in space and approach a generated world;
- the atmospheric transition works and preserves world/location continuity where applicable;
- close side-view planetary flight supports horizontal and vertical maneuvering;
- the player can travel across a coherent generated region with distinctive terrain;
- at least one environment condition materially affects visibility or handling;
- representative desert, ice, and ocean environment cases exist or any substituted cases are justified in the roadmap;
- landing and takeoff are playable interactions;
- at least two ship configurations demonstrate extensibility;
- procedural results are deterministic and adjacent chunks are continuous;
- the art direction and bespoke iconography meet the strict visual standard;
- relevant tests pass and actual gameplay/visual QA has been performed;
- browser and Android build paths are validated to the extent the environment allows;
- all research, decisions, limitations, and next steps are documented.

The game itself is a long-term project. At this stage, completion means the expanded vertical slice and its scalable foundation are genuinely playable, visually polished, tested, and ready for the next content expansion—not that every planned feature has been finished.
