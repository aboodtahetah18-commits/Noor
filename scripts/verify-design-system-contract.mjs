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
  'src/components/ui/index.ts',
];
for (const file of required) if (!fs.existsSync(path.join(root,file))) fail.push(`missing design-system artifact: ${file}`);

const layout = fs.readFileSync(path.join(root,'src/app/layout.tsx'),'utf8');
for (const file of ['tokens.css','themes.css','typography.css','foundations.css','responsive.css','contracts.css','experience.css']) {
  if (!layout.includes(`../design-system/${file}`)) fail.push(`root layout does not load ${file}`);
}

const responsive = fs.readFileSync(path.join(root,'src/design-system/responsive.css'),'utf8');
for (const boundary of ['max-width:767px','min-width:768px','max-width:1023px','min-width:1024px','max-width:1439px','min-width:1440px']) {
  if (!responsive.includes(boundary)) fail.push(`responsive contract missing governed boundary: ${boundary}`);
}

const tokens = fs.readFileSync(path.join(root,'src/design-system/tokens.css'),'utf8');
for (const token of ['--ux-brand-primary:#0B2D5B','--ux-brand-secondary:#0EA5A2','--ux-font-family-base:var(--font-tajawal)']) {
  if (!tokens.includes(token)) fail.push(`CR-002 token invariant missing: ${token}`);
}

if (fail.length) {
  console.error('DESIGN-SYSTEM-CONTRACT-FAIL');
  for (const item of fail) console.error(`- ${item}`);
  process.exit(1);
}
console.log('DESIGN-SYSTEM-CONTRACT-PASS');
