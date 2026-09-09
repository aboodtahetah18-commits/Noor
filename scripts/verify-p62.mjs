import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => { console.error(`P62-FAIL ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS ${message}`);
const atLeast = (version, major, minor, patch) => {
  const [a = 0, b = 0, c = 0] = version.split('.').map(Number);
  if (a !== major) return a > major;
  if (b !== minor) return b > minor;
  return c >= patch;
};

const pkg = JSON.parse(read('package.json'));
if (atLeast(pkg.version, 1, 3, 0)) pass(`P62 version — ${pkg.version}`);
else fail(`version ${pkg.version} is older than 1.3.0`);

if (pkg.scripts?.['verify:p62'] === 'node scripts/verify-p62.mjs') pass('P62 verification command');
else fail('P62 verification command missing');

const statuses = read('src/lib/financial-status-labels.ts');
for (const token of ['CYCLE_STATUS_LABELS', 'OBLIGATION_STATUS_LABELS', 'BUDGET_STATUS_LABELS', 'دورة نشطة', 'مستحقة الآن', 'معرض للتجاوز']) {
  if (statuses.includes(token)) pass(`localized financial status ${token}`);
  else fail(`localized financial status missing ${token}`);
}

const dashboard = read('src/app/(protected)/dashboard/page.tsx');
if (dashboard.includes('financialStatusLabel(CYCLE_STATUS_LABELS, dashboard.cycle.status)')) pass('dashboard cycle status localized');
else fail('dashboard cycle status localization missing');
if (dashboard.includes('financialStatusLabel(OBLIGATION_STATUS_LABELS, item.status)')) pass('dashboard obligation status localized');
else fail('dashboard obligation status localization missing');

const report = read('src/features/reports/components/cycle-report-view.tsx');
if (report.includes('financialStatusLabel(BUDGET_STATUS_LABELS, item.status)')) pass('cycle report budget status localized');
else fail('cycle report budget status localization missing');
if (!report.includes('مصروفات مصنفة UNPLANNED')) pass('cycle report technical English label removed');
else fail('cycle report exposes technical English label');

const obligations = read('src/app/(protected)/obligations/page.tsx');
if (obligations.includes('التسلسل الزمني') && !obligations.includes('<span>Timeline</span>')) pass('obligation timeline localized');
else fail('obligation timeline localization incomplete');

const transactions = read('src/app/(protected)/transactions/page.tsx');
if (transactions.includes('غيّر الفلاتر أو أضف عملية مالية جديدة.')) pass('transaction empty state is source-neutral');
else fail('transaction empty state copy not finalized');

for (const file of ['loading.tsx', 'error.tsx', 'not-found.tsx']) {
  if (exists(`src/app/(protected)/${file}`)) pass(`protected operational state ${file}`);
  else fail(`protected operational state missing ${file}`);
}
const loading = read('src/app/(protected)/loading.tsx');
if (loading.includes('role="status"') && loading.includes('aria-live="polite"')) pass('loading state accessibility');
else fail('loading state accessibility incomplete');
const error = read('src/app/(protected)/error.tsx');
if (error.includes('onClick={reset}') && error.includes('href="/workspace"') && error.includes("import Link from 'next/link'")) pass('recoverable error navigation');
else fail('recoverable error navigation incomplete');
const notFound = read('src/app/(protected)/not-found.tsx');
if (notFound.includes('الرابط غير متاح') && notFound.includes('href="/workspace"') && notFound.includes('href="/dashboard"')) pass('protected not-found recovery');
else fail('protected not-found recovery incomplete');

const layout = read('src/app/(protected)/layout.tsx');
if (layout.includes('className="skip-link"') && layout.includes('id="main-content"')) pass('skip-to-content contract');
else fail('skip-to-content contract missing');
const css = read('src/app/globals.css') + read('src/app/uiux-governance.css');
for (const token of [':focus-visible', 'prefers-reduced-motion', 'forced-colors', 'min-height:var(--ux-size-11)']) {
  if (css.includes(token)) pass(`accessibility styling ${token}`);
  else fail(`accessibility styling missing ${token}`);
}

const gate = read('scripts/production-quality-gate.mjs');
if (gate.includes("['P62 final UX and operational polish','node',['scripts/verify-p62.mjs']]")) pass('P62 wired first in quality gate');
else fail('P62 quality-gate wiring missing');

const migrations = fs.readdirSync(path.join(root, 'database/migrations')).filter((name) => name.endsWith('.sql'));
if (migrations.length === 66) pass('migration inventory — 66');
else fail(`migration inventory expected 66 got ${migrations.length}`);

if (process.exitCode) process.exit(process.exitCode);
console.log('P62 final UX and operational polish contract: PASS');
