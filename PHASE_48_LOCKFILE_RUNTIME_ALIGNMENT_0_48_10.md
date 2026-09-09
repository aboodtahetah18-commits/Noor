# P48.5 — Lockfile Runtime Alignment & Package-Manager Closure Path

## Scope
P48.5 removes the remaining package-manager documentation drift and adds a deterministic, runtime-guarded path for creating the missing npm lockfile.

## Implemented
- Project version advanced to `0.48.10`.
- Added `npm run dependencies:lock`.
- Added `scripts/generate-package-lock.mjs`.
- Lock generation is refused unless the runtime matches Node `24.20.x` and npm `11.19.x`.
- The generated lockfile must be npm lockfile v3 and its root version must match `package.json`.
- Updated README runtime/install/quality-gate commands from stale pnpm instructions to the repository's approved npm policy.

## Why the lockfile is not fabricated in this package
The current execution environment is Node 22 and registry resolution timed out. The repository explicitly requires Node 24.20.x / npm 11.19.x. A lockfile generated under the wrong toolchain or synthesized by hand would violate the dependency-governance objective.

## Completion action in the matching runtime
Run:

```bash
npm run dependencies:lock
npm ci --include=dev --no-audit --no-fund
npm run quality:gate
```

Then commit the resulting `package-lock.json`. Once present, `verify:dependencies` changes from `lockfile=pending` to `lockfile=present`.

## Database
No migration added. Total remains 64.
