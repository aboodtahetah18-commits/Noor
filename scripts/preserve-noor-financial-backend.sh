#!/usr/bin/env bash
set -euo pipefail

# The Vercel build materializes Namaa first and applies the compatibility patch.
# Apply the mobile-native experience only after those steps so its responsive
# contract is the final UI authority before backend preservation/build.
node scripts/patch-namaa-mobile-native.mjs
node scripts/patch-namaa-mobile-chat-first.mjs
node scripts/patch-namaa-mobile-operational-rooms.mjs
node scripts/patch-namaa-mobile-inline-actions-v2.mjs
node scripts/patch-namaa-mobile-governance-groups-v2.mjs
node scripts/patch-namaa-mobile-governance-compat.mjs
node scripts/patch-namaa-mobile-governance-verifier-compat.mjs
node scripts/patch-namaa-mobile-agent-deeplink-compat.mjs
node scripts/verify-namaa-mobile-experience.mjs
node scripts/verify-namaa-mobile-chat-first.mjs
node scripts/verify-namaa-mobile-operational-rooms.mjs
node scripts/verify-namaa-mobile-inline-actions.mjs
node scripts/verify-namaa-mobile-governance-groups.mjs

TARGET="apps/namaa-final-ui/src"

required=(
  "src/app/api/jobs/financial-engine/route.ts"
  "src/features/financial-engine/jobs/run-financial-engine-recalc.ts"
  "src/features/financial-engine/services/run-full-cycle-pipeline.ts"
  "src/features/financial-engine/services/resolve-runtime-versions.ts"
  "src/infrastructure/db/client.ts"
  "src/security/safe-logging.ts"
)

for source in "${required[@]}"; do
  if [[ ! -f "$source" ]]; then
    echo "Refusing to preserve backend: missing source $source" >&2
    exit 1
  fi
  destination="$TARGET/${source#src/}"
  mkdir -p "$(dirname "$destination")"
  cp "$source" "$destination"
done

# This route only recalculates governed engine/recommendation state. It does not
# perform any external transfer, payment, investment, or other financial action.
for source in "${required[@]}"; do
  sha256sum "$source"
done

echo "Preserved Noor financial-engine cron backend inside Namaa P0.4.30 runtime."
