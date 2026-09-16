# NDOS Stage 2 — Final Visual Authority

This stage makes the frozen NDOS v1.2 identity the final visual authority in the application cascade.

Runtime order:
1. Legacy/application compatibility CSS
2. Component and page CSS
3. `ndos-v1.2.css` — frozen identity aliases and light/dark visual authority
4. `ndos-v1.2.enforcement.css` — geometry/control enforcement only

The authoritative source of identity values is `src/design-system/ndos-v1.2.tokens.json` (`1.2 FINAL`, `FROZEN`). Verification scripts must derive frozen palette and typography expectations from that file rather than hard-coding a legacy palette.

Forbidden in the final NDOS/enforcement layers: legacy blue/cyan brand literals and Tajawal. Noto Sans Arabic remains the frozen Arabic family. Any CSS imported after the enforcement layer fails the NDOS authority contract.
