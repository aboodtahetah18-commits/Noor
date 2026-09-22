import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fail = [];
const exists = (file) => fs.existsSync(path.join(root,file));
const read = (file) => fs.readFileSync(path.join(root,file),'utf8');

const required = [
  'src/design-system/tokens.css',
  'src/design-system/themes.css',
  'src/design-system/typography.css',
  'src/design-system/foundations.css',
  'src/design-system/responsive.css',
  'src/design-system/contracts.css',
  'src/design-system/components.css',
  'src/design-system/interaction-components.css',
  'src/design-system/pages.css',
  'src/design-system/ndos-v1.2.acceptance.css',
  'src/design-system/ndos-v1.2.css',
  'src/design-system/ndos-v1.2.enforcement.css',
  'src/design-system/ndos-v1.2.tokens.json',
  'src/components/ui/index.ts',
];
for (const file of required) if (!exists(file)) fail.push(`missing design-system artifact: ${file}`);
for (const retired of ['src/design-system/experience.css','src/design-system/brand-refresh.css']) {
  if (exists(retired)) fail.push(`retired pre-NDOS visual artifact must remain removed: ${retired}`);
}

const layout = read('src/app/layout.tsx');
const loaded = ['tokens.css','themes.css','typography.css','foundations.css','responsive.css','contracts.css','components.css','interaction-components.css','pages.css','ndos-v1.2.acceptance.css','ndos-v1.2.css','ndos-v1.2.enforcement.css'];
for (const file of loaded) if (!layout.includes(`../design-system/${file}`)) fail.push(`root layout does not load ${file}`);
for (const retired of ['experience.css','brand-refresh.css']) if (layout.includes(retired)) fail.push(`root layout still loads retired layer ${retired}`);

const order = loaded.map((file)=>layout.indexOf(`../design-system/${file}`));
for (let i=1;i<order.length;i++) if (order[i] <= order[i-1]) fail.push(`design-system import order is invalid around ${loaded[i-1]} -> ${loaded[i]}`);

if (!layout.includes('Noto_Sans_Arabic')) fail.push('approved Namaa font loader missing: Noto_Sans_Arabic');
if (!layout.includes('dir="rtl"')) fail.push('root layout must keep RTL as the primary direction');
if (!layout.includes('lang="ar"')) fail.push('root layout must keep Arabic as the primary language');

const responsive = read('src/design-system/responsive.css');
for (const boundary of ['max-width:767px','min-width:768px','max-width:1023px','min-width:1024px','max-width:1439px','min-width:1440px']) {
  if (!responsive.includes(boundary)) fail.push(`responsive contract missing governed boundary: ${boundary}`);
}

const frozen = JSON.parse(read('src/design-system/ndos-v1.2.tokens.json'));
const frozenChecks = [
  ['meta.version','1.2 FINAL',frozen?.meta?.version],
  ['meta.identity_status','FROZEN',frozen?.meta?.identity_status],
  ['typography.family','Noto Sans Arabic',frozen?.typography?.family],
  ['color.brand.green.900','#0B6B4F',frozen?.color?.['brand.green.900']],
  ['color.brand.green.700','#189F7F',frozen?.color?.['brand.green.700']],
  ['color.brand.gold.500','#D4AF6B',frozen?.color?.['brand.gold.500']],
  ['color.brand.gold.action','#FCAA30',frozen?.color?.['brand.gold.action']],
  ['color.surface.warm','#FAF9F4',frozen?.color?.['surface.warm']],
];
for (const [label,expected,actual] of frozenChecks) if (actual !== expected) fail.push(`frozen identity mismatch ${label}: expected ${expected}, got ${actual}`);

const ndos = read('src/design-system/ndos-v1.2.css');
for (const value of ['#0B6B4F','#189F7F','#D4AF6B','#FCAA30','#FAF9F4']) if (!ndos.includes(value)) fail.push(`final NDOS mapping missing frozen value ${value}`);
if (/Tajawal/i.test(ndos)) fail.push('Tajawal must not exist in final NDOS authority');

const themes = read('src/design-system/themes.css');
if (/var\(--font-tajawal\)/i.test(themes)) fail.push('legacy Tajawal font mapping remains active in themes.css');

const interaction = read('src/design-system/interaction-components.css');
for (const token of ['.mx-action-rail','touch-action:pan-x','.mx-action-chip']) if (!interaction.includes(token)) fail.push(`interaction component layer missing ${token}`);

const pages = read('src/design-system/pages.css');
for (const selector of ['.mustaqbali-topbar','.mustaqbali-sidebar','.p47-page-heading','.transaction-table','.p49-dialog-shell','.p55-profile-summary']) {
  if (!pages.includes(selector)) fail.push(`page identity layer is missing governed surface: ${selector}`);
}

const sourceOfTruth = read('docs/ui-ux/CURRENT_SOURCE_OF_TRUTH.md');
for (const marker of ['نماء — الهوية البصرية المعتمدة v1.0 — 2026-09-22','Noto Sans Arabic']) {
  if (!sourceOfTruth.includes(marker)) fail.push(`approved Namaa source-of-truth marker missing: ${marker}`);
}

if (fail.length) {
  console.error('DESIGN-SYSTEM-CONTRACT-FAIL');
  for (const item of fail) console.error(`- ${item}`);
  process.exit(1);
}
console.log('DESIGN-SYSTEM-CONTRACT-PASS frozen NDOS v1.2 is the active design-system authority');
