import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const manifestPath = path.join(root, 'public/brand/ndos/approved-brand-assets.json');
const brandComponentPath = path.join(root, 'src/components/brand/brand-logo.tsx');
const enforcementPath = path.join(root, 'src/design-system/ndos-v1.2.enforcement.css');

function fail(message) {
  console.error(`APPROVED-BRAND-ASSET-CONTRACT-FAIL: ${message}`);
  process.exit(1);
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function pngDimensions(file) {
  const buffer = fs.readFileSync(file);
  if (buffer.length < 24 || buffer.toString('hex', 1, 4) !== '504e47') fail(`${file} is not a PNG`);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function walkText(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkText(full, acc);
    else if (/\.(?:ts|tsx|js|jsx|mjs|css|json|md)$/i.test(entry.name)) acc.push(full);
  }
  return acc;
}

if (!fs.existsSync(manifestPath)) fail('approved-brand-assets.json is missing');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (manifest.identity_status !== 'FROZEN') fail('identity_status must remain FROZEN');

for (const mode of ['light', 'dark']) {
  const asset = manifest.assets?.[mode];
  if (!asset) fail(`${mode} asset is missing from manifest`);
  const file = path.join(root, 'public', asset.runtime_path.replace(/^\//, '').replace(/^brand\//, 'brand/'));
  if (!fs.existsSync(file)) fail(`${mode} runtime asset is missing: ${asset.runtime_path}`);
  const dims = pngDimensions(file);
  if (dims.width !== 128 || dims.height !== 64 || dims.width !== dims.height * 2) {
    fail(`${mode} asset must be exactly 128x64 (2:1), got ${dims.width}x${dims.height}`);
  }
  const actualHash = sha256(file);
  if (actualHash !== asset.runtime_sha256) fail(`${mode} runtime hash changed: ${actualHash}`);
}

const brandComponent = fs.readFileSync(brandComponentPath, 'utf8');
for (const required of [
  '/brand/ndos/namaa-logo-color-transparent.png',
  '/brand/ndos/namaa-logo-white-transparent.png',
  "surface = 'auto'",
  'width={128}',
  'height={64}',
]) {
  if (!brandComponent.includes(required)) fail(`BrandLogo missing required contract: ${required}`);
}

const enforcement = fs.readFileSync(enforcementPath, 'utf8');
for (const required of [
  '.namaa-brand-logo',
  'aspect-ratio: 2 / 1',
  'background: transparent !important',
  'border: 0 !important',
  'box-shadow: none !important',
]) {
  if (!enforcement.includes(required)) fail(`brand enforcement missing: ${required}`);
}

const banned = ['namaa-logo-official.png', 'namaa-logo-official-lockup.png'];
for (const file of walkText(path.join(root, 'src'))) {
  const text = fs.readFileSync(file, 'utf8');
  for (const token of banned) {
    if (text.includes(token)) fail(`legacy logo reference ${token} found in ${path.relative(root, file)}`);
  }
}

for (const legacy of banned) {
  if (fs.existsSync(path.join(root, 'public/brand/ndos', legacy))) fail(`legacy logo asset still exists: ${legacy}`);
}

console.log('APPROVED-BRAND-ASSET-CONTRACT-PASS');
