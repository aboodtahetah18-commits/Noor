import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const fail = (file, reason) => failures.push(`${file}: ${reason}`);
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const tokensFile = 'src/design-system/ndos-v1.2.tokens.json';
const layoutFile = 'src/app/layout.tsx';
const acceptanceFile = 'src/design-system/ndos-v1.2.acceptance.css';
const ndosFile = 'src/design-system/ndos-v1.2.css';
const enforcementFile = 'src/design-system/ndos-v1.2.enforcement.css';
const mobileAuditFile = 'scripts/audit-mobile-horizontal-overflow-runtime.mjs';

const tokens = JSON.parse(read(tokensFile));
if (tokens?.meta?.version !== '1.2 FINAL') fail(tokensFile, 'identity version must remain 1.2 FINAL');
if (tokens?.meta?.identity_status !== 'FROZEN') fail(tokensFile, 'identity must remain FROZEN');
if (tokens?.meta?.rtl_first !== true) fail(tokensFile, 'rtl_first must remain true');
if (tokens?.typography?.family !== 'Noto Sans Arabic') fail(tokensFile, 'Noto Sans Arabic must remain the approved family');
if (JSON.stringify(tokens?.button_height) !== JSON.stringify({ sm: 32, md: 40, lg: 48 })) fail(tokensFile, 'control heights must remain 32/40/48');

const layout = read(layoutFile);
if (!/<html[^>]*lang="ar"[^>]*dir="rtl"/.test(layout)) fail(layoutFile, 'root document must be Arabic RTL');
if (!layout.includes('Noto_Sans_Arabic')) fail(layoutFile, 'approved Noto Sans Arabic loader is required');
for (const retired of ['experience.css','brand-refresh.css']) {
  if (layout.includes(retired)) fail(layoutFile, `retired legacy visual layer must not be loaded: ${retired}`);
}
if (exists('src/design-system/experience.css')) fail('src/design-system/experience.css', 'retired Mustaqbali premium layer must be removed');
if (exists('src/design-system/brand-refresh.css')) fail('src/design-system/brand-refresh.css', 'retired Mustaqbali brand layer must be removed');

const componentIndex = layout.indexOf('../design-system/components.css');
const pagesIndex = layout.indexOf('../design-system/pages.css');
const acceptanceIndex = layout.indexOf('../design-system/ndos-v1.2.acceptance.css');
const ndosIndex = layout.indexOf('../design-system/ndos-v1.2.css');
const enforcementIndex = layout.indexOf('../design-system/ndos-v1.2.enforcement.css');
if ([componentIndex,pagesIndex,acceptanceIndex,ndosIndex,enforcementIndex].some((v)=>v < 0)) fail(layoutFile, 'all governed visual layers must be imported');
if (!(componentIndex < pagesIndex && pagesIndex < acceptanceIndex && acceptanceIndex < ndosIndex && ndosIndex < enforcementIndex)) {
  fail(layoutFile, 'visual authority must be components -> pages -> acceptance -> NDOS -> enforcement');
}
const afterEnforcement = layout.slice(enforcementIndex + '../design-system/ndos-v1.2.enforcement.css'.length);
if (/\.css['"]/.test(afterEnforcement)) fail(layoutFile, 'no CSS may load after final enforcement');

const ndos = read(ndosFile);
for (const value of ['#0B6B4F','#189F7F','#D4AF6B','#FCAA30','#FFF7E6','#FAF9F4']) {
  if (!ndos.includes(value)) fail(ndosFile, `missing frozen identity value ${value}`);
}
if (/Tajawal/i.test(ndos)) fail(ndosFile, 'legacy Tajawal must not exist in final authority');

const acceptance = read(acceptanceFile);
const requiredCorrections = [
  ':where(body, body *)',
  'font-family: var(--namaa-font) !important',
  'backdrop-filter: none !important',
  '.report-table-card',
  'padding-inline: var(--ux-space-0) !important',
  '.p47-mobile-topbar.mustaqbali-mobile-header',
  'inset-inline: var(--ux-space-0) !important',
  '.smart-combo-menu',
  'inset-inline: var(--ux-space-3) !important',
  '.auth-aurora-one',
  'inset-inline-start:',
  '.auth-aurora-two',
  'inset-inline-end:',
];
for (const expected of requiredCorrections) if (!acceptance.includes(expected)) fail(acceptanceFile, `missing runtime correction: ${expected}`);
if (/(?:linear|radial|conic)-gradient\s*\(/i.test(acceptance)) fail(acceptanceFile, 'acceptance layer must not introduce gradients');

const enforcement = read(enforcementFile);
for (const expected of ['--ndos-control-sm','--ndos-control-md','--ndos-control-lg','.namaa-brand-logo','aspect-ratio: 2 / 1','background: transparent']) {
  if (!enforcement.includes(expected)) fail(enforcementFile, `missing final enforcement contract: ${expected}`);
}

const mobileAudit = read(mobileAuditFile);
if (!mobileAudit.includes('[320, 360, 390, 430, 767]')) fail(mobileAuditFile, 'mobile acceptance widths must cover 320/360/390/430/767');
if (!mobileAudit.includes('document.documentElement.scrollWidth <= window.innerWidth')) fail(mobileAuditFile, 'horizontal overflow assertion is required');

const approvedBreakpoints = new Set(['767','768','1023','1024','1439','1440']);
const finalVisualFiles = [
  'src/design-system/components.css',
  'src/design-system/pages.css',
  acceptanceFile,
  ndosFile,
  enforcementFile,
];
const legacyColorPatterns = [/#0B2D5B\b/i,/#0EA5A2\b/i,/#2563EB\b/i,/#06B6D4\b/i];
const legacyVarPatterns = [/--ux-brand-deep\b/,/--ux-brand-sky-soft\b/,/--ux-brand-cyan\b/,/--ux-dark-[a-z0-9-]+\b/i];

for (const file of finalVisualFiles) {
  const text = read(file).replace(/\/\*[\s\S]*?\*\//g,'');
  if (/Tajawal/i.test(text)) fail(file, 'legacy Tajawal reference in effective visual layer');
  if (/(?:linear|radial|conic)-gradient\s*\(/i.test(text)) fail(file, 'unapproved gradient in effective visual layer');
  // `none` is the required neutralization value; any positive blur/glass value is forbidden.
  for (const match of text.matchAll(/(?:-webkit-)?backdrop-filter\s*:\s*([^;}]*)/gi)) {
    const normalized = match[1].replace(/!important/gi,'').trim().toLowerCase();
    if (normalized !== 'none') fail(file, `unapproved blur/glass value ${match[1].trim()}`);
  }
  for (const re of legacyColorPatterns) if (re.test(text)) fail(file, `legacy palette value ${re}`);
  for (const re of legacyVarPatterns) if (re.test(text)) fail(file, `legacy visual variable ${re}`);

  const physical = /(^|[;{}\n]\s*)(margin-left|margin-right|padding-left|padding-right|border-left|border-right|border-left-color|border-right-color|left|right)\s*:/gim;
  for (const match of text.matchAll(physical)) fail(file, `physical RTL property ${match[2]} in effective visual layer`);
}

// Breakpoint governance is evaluated across all runtime CSS, including compatibility layers.
const cssRoots = ['src/app','src/components','src/features','src/design-system'];
function walk(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs,{withFileTypes:true}).flatMap((entry)=>{
    const next = path.join(rel,entry.name);
    return entry.isDirectory() ? walk(next) : path.extname(entry.name) === '.css' ? [next] : [];
  });
}
for (const file of [...new Set(cssRoots.flatMap(walk))]) {
  const text = read(file).replace(/\/\*[\s\S]*?\*\//g,'');
  for (const match of text.matchAll(/@media[^\{]*\((?:min|max)-width\s*:\s*(\d+)px\)/gi)) {
    if (!approvedBreakpoints.has(match[1])) fail(file, `unapproved responsive breakpoint ${match[1]}px`);
  }
}

if (failures.length) {
  console.error(`NDOS-FINAL-VISUAL-ACCEPTANCE-FAIL ${failures.length} issue(s)`);
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}

console.log('NDOS-FINAL-VISUAL-ACCEPTANCE-PASS effective visual authority, RTL corrections, responsive breakpoints and mobile overflow contract are locked');
