import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fail = [];
const required = [
  'src/design-system/tokens.css',
  'src/design-system/themes.css',
  'src/design-system/typography.css',
  'src/design-system/foundations.css',
  'src/design-system/responsive.css',
  'src/design-system/contracts.css',
  'src/design-system/experience.css',
  'src/design-system/components.css',
  'src/components/ui/index.ts',
];
for (const file of required) if (!fs.existsSync(path.join(root,file))) fail.push(`missing design-system artifact: ${file}`);

const layout = fs.readFileSync(path.join(root,'src/app/layout.tsx'),'utf8');
for (const file of ['tokens.css','themes.css','typography.css','foundations.css','responsive.css','contracts.css','experience.css','components.css']) {
  if (!layout.includes(`../design-system/${file}`)) fail.push(`root layout does not load ${file}`);
}

if (!layout.includes('Noto_Sans_Arabic')) fail.push('approved Namaa font loader missing: Noto_Sans_Arabic');
if (!layout.includes('dir="rtl"')) fail.push('root layout must keep RTL as the primary direction');

const responsive = fs.readFileSync(path.join(root,'src/design-system/responsive.css'),'utf8');
for (const boundary of ['max-width:767px','min-width:768px','max-width:1023px','min-width:1024px','max-width:1439px','min-width:1440px']) {
  if (!responsive.includes(boundary)) fail.push(`responsive contract missing governed boundary: ${boundary}`);
}

const tokens = fs.readFileSync(path.join(root,'src/design-system/tokens.css'),'utf8');
for (const token of [
  '--ux-brand-primary:#023C6E',
  '--ux-brand-deep:#021737',
  '--ux-brand-secondary:#0CB6E5',
  '--ux-brand-accent:#189F7F',
  '--ux-brand-gold:#FCAA30',
  '--ux-font-family-base:var(--font-noto-sans-arabic)',
]) {
  if (!tokens.includes(token)) fail.push(`approved Namaa identity invariant missing: ${token}`);
}

const sourceOfTruth = fs.readFileSync(path.join(root,'docs/ui-ux/CURRENT_SOURCE_OF_TRUTH.md'),'utf8');
for (const sourceMarker of ['00_نماء_الهوية_البصرية_المرجع_المعتمد_v1.0_2026-09-15','Noto Sans Arabic','#023C6E','#021737','#0CB6E5','#189F7F','#FCAA30']) {
  if (!sourceOfTruth.includes(sourceMarker)) fail.push(`approved Namaa source-of-truth marker missing: ${sourceMarker}`);
}

if (fail.length) {
  console.error('DESIGN-SYSTEM-CONTRACT-FAIL');
  for (const item of fail) console.error(`- ${item}`);
  process.exit(1);
}
console.log('DESIGN-SYSTEM-CONTRACT-PASS');
