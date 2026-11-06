# Decision log

Use `docs/templates/DECISION_TEMPLATE.md` for non-trivial decisions. Record context, evidence, alternatives, trade-offs, tests and revisit condition.

## D-001 — Reference implementation source (Phase 01 / P01-T02)

- **Context:** The charter requires reconstructing the Android Easter Egg reference as a playable baseline. No game source existed in the repository.
- **Decision:** Use `lll69/landroid-web` (https://github.com/lll69/landroid-web) as the reference implementation. Revision `fccb4ebd3e61e9cc4b708311c0da477eec8a4608` (2026-11-04), branch `main`, license Apache-2.0.
- **Evidence:** Cloned to `reference/landroid-web` (gitignored, read-only). Live pages verified at `https://landroid.js.org/player.html` and played with Playwright keyboard input — ship moved, 144 FPS, 0 console errors.
- **Alternatives considered:** Building from scratch without a reference (rejected: charter mandates faithful reconstruction first; reference gives the interaction loop, seed behavior, and procedural systems to match).
- **Trade-offs:** Apache-2.0 requires attribution/NOTICE preservation; tracked in `docs/LICENSING_AND_SOURCE_REUSE.md`.
- **Revisit condition:** If the reference repo is deleted or re-licensed, re-audit before any reuse.
