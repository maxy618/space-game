# ART_DIRECTION — layered authored 2D bible

The visual identity of the game. If an asset does not answer to this document,
it does not ship. (P06-T01)

## 1. North star

Distinctive, memorable **layered authored 2D** with real depth: macro
silhouette first, regional structure second, material response third, fine
detail only when visible at that zoom, then motion, parallax, and optical
compositing. Never generic glossy 3D, never "noise is art direction".

## 2. Macro composition (silhouette comes first)

- Every object must read as a silhouette at phone gameplay size (390×844 pt
  class screens, ship ≈ 24 px): circle-with-identity for planets, spiked
  disc for stars, angular assembly for ships.
- Different object families get **different silhouette grammar**:
  stars = radiating disc with rotating corona spikes; planets = layered disc
  with limb + terminator + regional patches; ships = angular fuselage with
  legs/engine pods; nebulae = filament clouds without hard edges.
- Large forms are composed before any detail: star corona → disc → surface
  markings; ship hull → legs → engine assembly → exhaust.

## 3. Palette (current, extendable)

| Token | Hex | Role |
|---|---|---|
| `--color-Eigengrau` | #16161D | void/background |
| `--color-Eigengrau2` | #292936 | grid minor |
| `--color-Eigengrau3` | #3C3C4C | grid/frames |
| `--color-Eigengrau4` | #A7A7CA | planet bodies |
| `--color-Console` | #B7B7FF | telemetry text |
| `--color-Autopilot` | #4285F4 | active indicators |
| Green stick | #2ECC71 family | flight stick |
| Exhaust core/edge | white → #FFC8A0 | engine flame bands |

Palette rules: background stays near-black blue; UI uses the console lavender;
accent colors are reserved for gameplay meaning (green = thrust/control,
orange-white = propulsion, blue = active/autopilot).

## 4. Material language

- **Vacuum gradient**: radial falloff on celestial discs (limb darker,
  center brighter) — never flat fills for large discs.
- **Edge response**: every body/marker gets a 1–2 px edge at zoom-inverse
  width (`w / zoom`) so lines stay constant on screen at any view scale.
- **Erosion/contour**: planet markings imply erosion/contour, not dots;
  rings/orbits are broken/dashed, never solid perfect circles unless the
  physics demands it.
- **Emissive details**: engine/exhaust and star corona are emissive accents;
  everything else is lit, not glowing (no bloom-everywhere).

## 5. Line + edge treatment

- Screen-constant widths: `width / zoom` in world space (= constant CSS px,
  matching the Android dp convention).
- Hierarchy of weights: world geometry (heaviest) > structural rings >
  markings > micro-detail. No equal-weight clutter.
- Negative space is respected: the UI layer never overlaps the flight stick
  region; the pause button avoids the telemetry block (layout guard).

## 6. Motion + animation rhythm

- Camera: follow chase at 30/s, zoom exp-smoothing at 2.5/s (velocity zoom
  feels like breathing, not stepping).
- Exhaust: layered flare + 45 ms flicker; turbulence noise on sparks.
- Selection/confirmation: soft pulses (pause menu frosted layer) at
  2.2–3.6 s intervals, ordered rhythm, never chaotic.
- All animation must terminate (kicks decay to exact zero); reduced-motion
  users get static equivalents of every effect.

## 7. Families (current + planned)

- **Space**: star discs with rotating corona spikes (planets orbit lines,
  gravity rings) — current live set from the reference reconstruction.
- **Ships**: angular hull + legs + dynamic teardrop exhaust (Phase 05).
- **Surface / fauna / UI**: rules above apply; fauna arrives in Phase 18;
  UI icons are bespoke SVG geometry only (no icon packs, no emoji).

## 8. Anti-goals (explicit)

1. No generic glossy 3D spheres; no radial-gradient "planet" shortcuts.
2. No emoji / Unicode pictographs / Lucide / Font Awesome / Material icons
   as shipped assets.
3. No permanent chromatic aberration, bloom-everywhere, or decorative hexes.
4. No palette-swap cloning: biome changes require silhouette change too.
5. No uncredited stock or AI-watermarked imagery.

## 9. Lawful references (attribution)

- Android Easter-egg reference (`landroid-web`, Apache-2.0, lll69) — core
  flight/telemetry/parity behavior. Attribution retained in
  `docs/LICENSING_AND_SOURCE_REUSE.md`.
- The user's own playtest feedback (camera distance, exhaust expressiveness)
  is the newest reference board: every art change is verified by an actual
  playtest screenshot at phone size.

## 10. How to extend

New families must: (1) declare silhouette grammar here, (2) implement the
macro→regional→material→fine layer order, (3) add a screenshot at gameplay
size + 2–4× crop, (4) log in the audit (P06-T05), (5) keep the anti-goals.
