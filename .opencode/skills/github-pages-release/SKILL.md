---
name: github-pages-release
description: Safely commit/push tested work, automate GitHub Pages deployment and verify the actual live game.
---

# Github Pages Release

1. Inspect branch/remote/status/diff; preserve unrelated user work.
2. Run tests/build, inspect staged files and scan for secrets.
3. Make small descriptive commits; never force-push/rewrite history.
4. Push only to intended remote/branch with access; record blocker otherwise.
5. Configure Actions to install via lockfile, test, build, deploy Pages; verify Vite base path.
6. Inspect workflow result, open live URL, inspect assets/routes/console.
7. Smoke-play deployed build with Playwright and record commit SHA/URL/evidence.

Avoid secrets, untested deploys, invented URLs or claims based only on local build.
