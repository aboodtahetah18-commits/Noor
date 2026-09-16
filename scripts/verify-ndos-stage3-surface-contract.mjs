import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const componentsPath = path.join(root, 'src/design-system/components.css');
const pagesPath = path.join(root, 'src/design-system/pages.css');
const enforcementPath = path.join(root, 'src/design-system/ndos-v1.2.enforcement.css');

const components = fs.readFileSync(componentsPath, 'utf8');
const pages = fs.readFileSync(pagesPath, 'utf8');
const enforcement = fs.readFileSync(enforcementPath, 'utf8');
const failures = [];

function requireText(label, text, needle) {
  if (!text.includes(needle)) failures.push(`${label}: missing ${needle}`);
}
function forbid(label, text, re) {
  if (re.test(text)) failures.push(`${label}: forbidden ${re}`);
}

for (const [label, text] of [['components.css', components], ['pages.css', pages]]) {
  forbid(label, text, /--ux-brand-(?:deep|cyan|sky-soft|shell-highlight|hero-bg|night-soft)\b/);
  forbid(label, text, /--ux-dark-(?:border|card-bg|text-primary|text-secondary|surface-muted|shell-topbar-bg)\b/);
  forbid(label, text, /backdrop-filter\s*:/i);
  forbid(label, text, /(?:linear|radial|conic)-gradient\(/i);
  forbid(label, text, /font-family\s*:\s*["']?Tajawal/i);
}

requireText('components.css', components, '.ux-button[data-block="true"] { width:100%; }');
requireText('components.css', components, 'min-height:var(--ux-size-10);');
requireText('components.css', components, 'height:var(--ux-size-10);');
requireText('components.css', components, '.ux-button[data-size="sm"]');
requireText('components.css', components, '.ux-button[data-size="lg"]');
requireText('components.css', components, 'textarea.ux-control { min-height:calc(var(--ux-size-12) * 2);');
requireText('components.css', components, '.ux-dialog-actions > [data-block-mobile="true"] { width:100%; }');

requireText('pages.css', pages, '.mustaqbali-sidebar,\n.mustaqbali-mobile-drawer {\n  background:var(--ux-shell-sidebar-bg) !important;');
requireText('pages.css', pages, '.p49-action-dialog::backdrop { background:rgb(31 41 55 / .42) !important; }');
requireText('pages.css', pages, 'html[data-theme="dark"] .page-header');
requireText('pages.css', pages, 'background:var(--ux-card-bg) !important;');
requireText('pages.css', pages, 'background:var(--ux-section-soft-teal) !important;');

requireText('enforcement.css', enforcement, '--ndos-control-sm: var(--ux-size-8);');
requireText('enforcement.css', enforcement, '--ndos-control-md: var(--ux-size-10);');
requireText('enforcement.css', enforcement, '--ndos-control-lg: var(--ux-size-12);');
requireText('enforcement.css', enforcement, '.ndos-button--block { width: 100%; }');

if (failures.length) {
  console.error(`NDOS-STAGE3-SURFACE-CONTRACT-FAIL ${failures.length} issue(s)`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('NDOS-STAGE3-SURFACE-CONTRACT-PASS shared components, page surfaces, dialogs, dark mode and control geometry are frozen-aligned');
