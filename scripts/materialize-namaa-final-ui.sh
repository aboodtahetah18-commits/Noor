#!/usr/bin/env bash
set -euo pipefail

ARTIFACT_ID="1FqoQ6VDV7gtl2YcvnTDLViA_JRqlPcip"
EXPECTED_SHA256="f7098556534e68ea186a4e934d9cdb24871c1bf02e551758cefed6be928ae14b"
WORK_DIR=".namaa-final-ui-artifact"
ZIP_PATH="$WORK_DIR/Namaa_App_P0.4.30_BRAND_FINAL_SANITIZED.zip"
TARGET_DIR="apps/namaa-final-ui"

rm -rf "$WORK_DIR" "$TARGET_DIR"
mkdir -p "$WORK_DIR" "$TARGET_DIR"

curl --fail --location --silent --show-error \
  "https://drive.usercontent.google.com/download?id=${ARTIFACT_ID}&export=download&confirm=t" \
  --output "$ZIP_PATH"

echo "${EXPECTED_SHA256}  ${ZIP_PATH}" | sha256sum --check --strict

unzip -q "$ZIP_PATH" -d "$TARGET_DIR"

# Hard safety gate: the sanitized artifact must not contain production RLS/grant migrations.
if find "$TARGET_DIR" -type f -path '*/migrations/*' | grep -q .; then
  echo "Refusing to continue: migrations/ unexpectedly present in sanitized artifact." >&2
  exit 1
fi

if find "$TARGET_DIR" -maxdepth 1 -type f -name '.env*' ! -name '.env.example' | grep -q .; then
  echo "Refusing to continue: runtime .env file found in artifact." >&2
  exit 1
fi

node -e "const p=require('./apps/namaa-final-ui/package.json'); if(p.version!=='0.4.30') { console.error('Unexpected Namaa version',p.version); process.exit(1) }"

echo "Materialized exact Namaa P0.4.30 sanitized artifact: ${EXPECTED_SHA256}"
