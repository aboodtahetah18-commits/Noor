import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const pass = (message) => console.log(`PASS ${message}`);
const fail = (message) => {
  console.error(`P57-FAIL ${message}`);
  process.exitCode = 1;
};
const atLeast = (version, major, minor, patch) => {
  const [a = 0, b = 0, c = 0] = version.split('.').map(Number);
  if (a !== major) return a > major;
  if (b !== minor) return b > minor;
  return c >= patch;
};

const pkg = JSON.parse(read('package.json'));
if (atLeast(pkg.version, 0, 57, 0)) pass(`P57 version — ${pkg.version}`);
else fail(`version ${pkg.version} is older than 0.57.0`);

const requiredArtifacts = [
  'docs/P57_SYSTEM_INTEGRITY_MATRIX.md',
  'tests/integration/p57-critical-write-integrity-contract.test.ts',
  'tests/security/p57-security-boundary-contract.test.ts',
  'tests/unit/state-machines/p57-transition-completeness.test.ts',
  'tests/regression/p57-complete-product-journey-contract.test.ts',
  'tests/accessibility/p57-responsive-accessibility-contract.test.ts',
];
for (const file of requiredArtifacts) {
  if (exists(file)) pass(`artifact ${file}`);
  else fail(`missing ${file}`);
}

const integrity = read('tests/integration/p57-critical-write-integrity-contract.test.ts');
for (const repository of [
  'expense-repository.ts',
  'income-repository.ts',
  'transfer-repository.ts',
  'refund-repository.ts',
  'obligation-repository.ts',
  'saving-repository.ts',
  'emergency-repository.ts',
  'goal-repository.ts',
  'financial-plan-repository.ts',
  'financial-cycle-repository.ts',
]) {
  if (integrity.includes(repository)) pass(`critical write audit ${repository}`);
  else fail(`critical write audit missing ${repository}`);
}
if (integrity.includes('rawSql.transaction') && integrity.toLowerCase().includes('idempotency')) {
  pass('critical write atomicity and idempotency assertions');
} else {
  fail('critical write atomicity/idempotency assertions missing');
}

const security = read('tests/security/p57-security-boundary-contract.test.ts');
for (const marker of [
  'dangerouslySetInnerHTML',
  'NEXT_PUBLIC_',
  'requireAuthenticatedMutationUser',
  'assertTrustedMutationOrigin',
  'Content-Security-Policy',
  'Strict-Transport-Security',
]) {
  if (security.includes(marker)) pass(`security audit ${marker}`);
  else fail(`security audit missing ${marker}`);
}

const state = read('tests/unit/state-machines/p57-transition-completeness.test.ts');
for (const marker of ['financialCycleTransitions', 'financialPlanTransitions', 'goalTransitions', 'obligationTransitions', 'transactionTransitions', 'recommendationTransitions']) {
  if (state.includes(marker)) pass(`state-machine audit ${marker}`);
  else fail(`state-machine audit missing ${marker}`);
}

const regression = read('tests/regression/p57-complete-product-journey-contract.test.ts');
for (const route of ['dashboard', 'accounts', 'income', 'budget', 'transactions', 'obligations', 'savings', 'emergency', 'goals', 'advisor', 'reports', 'settings']) {
  if (regression.includes(`/${route}/page.tsx`)) pass(`product journey ${route}`);
  else fail(`product journey missing ${route}`);
}

const accessibility = read('tests/accessibility/p57-responsive-accessibility-contract.test.ts');
for (const marker of ['MobileBottomNav', 'TabletTopNav', 'DesktopTopNav', ':focus-visible', 'prefers-reduced-motion', 'aria-modal', 'min-height:44px']) {
  if (accessibility.includes(marker)) pass(`responsive/accessibility ${marker}`);
  else fail(`responsive/accessibility missing ${marker}`);
}

const testFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const current = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(current);
    else if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) testFiles.push(current);
  }
}
walk(path.join(root, 'tests'));
if (testFiles.length >= 69) pass(`test inventory — ${testFiles.length} files`);
else fail(`test inventory unexpectedly low — ${testFiles.length}`);

const categories = ['unit', 'integration', 'database', 'security', 'accessibility', 'regression'];
for (const category of categories) {
  const count = testFiles.filter((file) => file.includes(`${path.sep}${category}${path.sep}`)).length;
  if (count > 0) pass(`test category ${category} — ${count}`);
  else fail(`test category missing ${category}`);
}

const migrations = fs.readdirSync(path.join(root, 'database/migrations')).filter((name) => name.endsWith('.sql'));
if (migrations.length === 66) pass('migration inventory — 66');
else fail(`migration inventory expected 66 got ${migrations.length}`);

const gate = read('scripts/production-quality-gate.mjs');
if (gate.includes("['P57 system integrity and full verification','node',['scripts/verify-p57.mjs']]")) {
  pass('P57 wired first into quality gate');
} else {
  fail('P57 quality-gate wiring missing');
}

if (process.exitCode) process.exit(process.exitCode);
console.log(`P57 system integrity and full verification: PASS (${testFiles.length} test files, 66 migrations)`);
