# Git, push and GitHub Pages

Before every commit inspect branch, remote, status, diff and staged files; run required tests/build and scan for secrets. Commit small verified increments with clear messages. Never commit credentials, keys, private data, local paths or caches. Never force-push or rewrite shared history. Push only to the intended branch/remote when permissions exist; record exact blocker otherwise.

Use GitHub Actions: install from lockfile, test, production build, deploy Pages. Set Vite `base` to the exact repository Pages path. Verify repository Pages permissions/workflow status, open the live URL, check asset paths/console and actively play a smoke route. Record commit SHA, workflow run, URL and evidence. A local build is not a successful deployment. Never put tokens in source.
