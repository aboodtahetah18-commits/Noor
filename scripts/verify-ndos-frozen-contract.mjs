import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const tokens = JSON.parse(read('src/design-system/ndos-v1.2.tokens.json'));
const ndos = read('src/design-system/ndos-v1.2.css');
const enforcement = read('src/design-system/ndos-v1.2.enforcement.css');
const layout = read('src/app/layout.tsx');
const legacyGovernance = read('src/app/uiux-governance.css');
const failures = [];
const fail = (message) => failures.push(message);

if (tokens.meta?.identity_status !== 'FROZEN' || tokens.meta?.version !== '1.2 FINAL') {
  fail('Frozen identity metadata is missing or changed.');
}
if (tokens.typography?.family !== 'Noto Sans Arabic') fail('Official font must remain Noto Sans Arabic.');
if (JSON.stringify(tokens.button_height) !== JSON.stringify({ sm: 32, md: 40, lg: 48 })) {
  fail('Button heights must remain exactly 32/40/48.');
}
if (JSON.stringify(tokens.spacing) !== JSON.stringify([4,8,12,16,20,24,32,40,48,64])) {
  fail('Spacing scale drifted from frozen NDOS v1.2.');
}

const requiredColors = [
  '#0B6B4F','#189F7F','#D4AF6B','#FCAA30','#FFF7E6','#FAF9F4','#FFFFFF',
  '#F6F4ED','#DDF3E8','#1F2937','#61758A','#DCE6E0','#C9D8D1',
];
for (const value of requiredColors) {
  if (!Object.values(tokens.color).includes(value)) fail(`Approved color missing from token registry: ${value}`);
  if (!ndos.toUpperCase().includes(value.toUpperCase())) fail(`Frozen runtime CSS does not expose approved color: ${value}`);
}

for (const size of Object.values(tokens.button_height)) {
  if (!ndos.includes(`${size}px`) && !enforcement.includes(`${size}px`)) fail(`Control height ${size}px is not represented in runtime CSS.`);
}

const importNeedle = "import '../design-system/ndos-v1.2.enforcement.css';";
const importIndex = layout.indexOf(importNeedle);
if (importIndex < 0) fail('NDOS enforcement stylesheet is not imported by the root layout.');
else {
  const laterCssImport = layout.slice(importIndex + importNeedle.length).match(/import\s+['"][^'"]+\.css['"]/);
  if (laterCssImport) fail('NDOS enforcement must be the final CSS import in root layout.');
}

if (!enforcement.includes('[data-block="true"]')) fail('Full-width button behavior must be explicit.');
if (!enforcement.includes('[data-icon-only="true"]')) fail('Icon-only square geometry contract is missing.');
if (!enforcement.includes('.ndos-form-grid')) fail('Canonical form-grid contract is missing.');
if (!enforcement.includes('.ndos-actions')) fail('Canonical action-group contract is missing.');

// Legacy visual contracts may remain temporarily for compatibility, but they are never authoritative.
// The final cascade must remap their public UX variables to the frozen NDOS identity and font.
const runtimeAliases = [
  '--ux-brand-primary:var(--namaa-green-900)',
  '--ux-brand-secondary:var(--namaa-green-700)',
  '--ux-brand-accent:var(--namaa-gold-500)',
  '--ux-font-family-base:var(--namaa-font)',
  '--ux-action-primary:var(--namaa-green-900)',
];
for (const alias of runtimeAliases) if (!ndos.includes(alias)) fail(`Frozen runtime alias missing: ${alias}`);
if (legacyGovernance.includes(':root')) fail('Legacy governance compatibility layer must not redefine root design tokens after Foundations consolidation.');

if (failures.length) {
  console.error(`NDOS-FROZEN-CONTRACT-FAIL ${failures.length} issue(s)`);
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}
console.log('NDOS-FROZEN-CONTRACT-PASS identity=1.2_FINAL controls=32/40/48 spacing=frozen aliases=official');
