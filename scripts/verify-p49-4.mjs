import fs from 'node:fs';
import path from 'node:path';
const atLeast=(v,a,b,c)=>{const x=v.split('.').map(Number);return x[0]>a||(x[0]===a&&(x[1]>b||(x[1]===b&&x[2]>=c)));};

const root = process.cwd();
const failures = [];
const pass = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(name);
};
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const pkg = JSON.parse(read('package.json'));
pass('P49.4 version', atLeast(pkg.version,0,49,4), pkg.version);
pass('npmrc ensure script wired', pkg.scripts?.['ensure:npmrc'] === 'node scripts/ensure-npmrc.mjs');

const gate = read('scripts/production-quality-gate.mjs');
pass('npmrc repair runs before dependency policy', gate.indexOf("['npm configuration'") >= 0 && gate.indexOf("['npm configuration'") < gate.indexOf("['dependency policy'"));

const npmrc = read('.npmrc');
pass('engine strict present', npmrc.includes('engine-strict=true'));
pass('save exact present', npmrc.includes('save-exact=true'));

const protectedRoot = path.join(root, 'src/app/(protected)');
const componentRoot = path.join(root, 'src/components');
const files = [];
const walk = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(entry.name)) files.push(p);
  }
};
walk(protectedRoot);
walk(componentRoot);

let forms = 0;
let getForms = 0;
let actionableForms = 0;
let placeholderLinks = 0;
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/<form\b([^>]*)>/gs)) {
    forms += 1;
    const attrs = match[1];
    if (/\bmethod=["']get["']/i.test(attrs)) getForms += 1;
    else if (/\b(action|onSubmit)=/.test(attrs)) actionableForms += 1;
    else failures.push(`form-without-action:${path.relative(root, file)}`);
  }
  const placeholders = source.match(/href=["'](?:#|javascript:[^"']*)["']/g) ?? [];
  placeholderLinks += placeholders.length;
}
pass('no placeholder links', placeholderLinks === 0, `${placeholderLinks}`);
pass('forms have an execution path', forms === getForms + actionableForms, `${forms} forms (${getForms} GET, ${actionableForms} action/onSubmit)`);

const nav = read('src/app/(protected)/mobile-bottom-nav.tsx');
const dashboard = read('src/app/(protected)/dashboard/page.tsx');
pass('CR-002 full-page add entrypoint remains functional', fs.existsSync(path.join(protectedRoot, 'expenses/page.tsx')) && dashboard.includes('href="/expenses"'));
pass('legacy mobile quick-add removed', !nav.includes('role="dialog"') && !nav.includes('mobile-quick-add'));
pass('more hub remains reachable', nav.includes("href: '/more'"));
pass('recoverable protected error state', fs.existsSync(path.join(protectedRoot, 'error.tsx')) && read('src/app/(protected)/error.tsx').includes('إعادة المحاولة'));

if (failures.length) {
  for (const failure of failures) console.error('P49.4-FAIL', failure);
  console.error(`P49.4 verification FAILED (${failures.length})`);
  process.exit(1);
}
console.log(`P49.4 functional execution audit: PASS (${forms} forms checked across ${files.length} TS/TSX files)`);
