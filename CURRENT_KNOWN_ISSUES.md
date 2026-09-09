# Current Known Issues — V1.5.0

## Verification status
Runtime verification is pending in this artifact environment. The project requires Node 24.20.x/npm 11.x, while the available local runtime does not match that baseline and dependency installation did not complete.

The following gates therefore remain **NOT VERIFIED** locally:

- full TypeScript typecheck with installed project dependencies;
- lint;
- complete Vitest suite;
- production Next.js build;
- Netlify deployment preflight against the authoritative deployment runtime;
- deployment-specific live production acceptance.

## Product implementation issues
No additional product implementation issue is asserted as closed solely from static inspection. Financial-number usage outside the repaired authoritative future-pressure path remains tracked by the current financial conversion audit until each consumer is proven display-only or migrated to exact money arithmetic.

Historical issue registers under `docs/reference/` and phase documents are retained as audit history only; they are not current authority.

## External release evidence
The live production acceptance report is deployment-specific evidence. It must be generated against the deployed HTTPS origin with `npm run ops:live-validate` and sealed with `npm run ops:release-seal`.

## Environment note
`package-lock.json` is absent in this artifact. Direct dependency versions remain exact-pinned in `package.json`, but reproducible installation is **NOT VERIFIED** until the project is installed with the required Node/npm baseline.
