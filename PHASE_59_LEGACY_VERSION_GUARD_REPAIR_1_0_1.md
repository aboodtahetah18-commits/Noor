# P59.1 — Legacy Version Guard Repair — 1.0.1

Netlify reached the legacy P49.1 CI/runtime verifier after all later production gates passed. P49.1 still used a pre-1.0 regex that accepted only `0.49.x` through `0.99.x`, so it rejected the valid V1 release.

Repair:
- replace the P49.1 legacy regex with semantic lower-bound comparison (`>= 0.49.0`);
- make the P59 release verifier accept `1.0.0` and compatible patch/minor releases;
- bump the package patch version to `1.0.1`;
- no financial logic, schema, UI, route, or migration changes.

Migration inventory remains 65.
