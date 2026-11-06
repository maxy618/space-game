# Space Exploration Game — Agent Pack v4

**27 major phases · 27 short Mission `.txt` prompts · 108 detailed task files · 18 rewritten practical skills.**

## Start
1. Extract/merge into the actual game repo root. Preserve all source, research, assets and user changes. Back up existing `AGENTS.md` and skills first; replace old agent instructions/skills with this pack only after backup. Do not delete the game repo.
2. Read `AGENTS.md`, `MISSION_START_HERE.txt`, `PROJECT_STATE.md`, `TASK_INDEX.md` and `ROADMAP.md`.
3. Start with `MISSIONS/MISSION_01.txt`. Each Mission is short; its detailed phase/task docs are the real specification. Run one phase at a time.
4. Keep tracker/state/evidence current and do not advance until the exit gate passes.

## Contents
- `MISSIONS/`: concise plain-text prompt for each phase.
- `PHASES/`: complete phase goals, dependencies, task maps and gates.
- `TASKS/`: detailed individual requirements, player tests and Definitions of Done.
- `.opencode/skills/`: focused workflows rewritten from scratch; old low-quality skills are not reused.
- `docs/`: player testing, visual quality, source licensing, research and Pages release standards.

## Hard requirements
The agent must **actively play** the game using Playwright input, not just take screenshots. Entry preserves trajectory and control. Planet gameplay includes flight, landing, rover and ecosystems. Visuals are layered authored 2D, not glossy generic 3D. PostFX are contextual. Every ship upgrade is visibly attached and changes gameplay. Commit, push when available, and verify GitHub Pages.
