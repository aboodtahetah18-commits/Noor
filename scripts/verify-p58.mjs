import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const pass = (message) => console.log(`PASS ${message}`);
const fail = (message) => { console.error(`P58-FAIL ${message}`); process.exitCode = 1; };
const atLeast = (version, major, minor, patch) => {
  const [a = 0, b = 0, c = 0] = version.split('.').map(Number);
  if (a !== major) return a > major;
  if (b !== minor) return b > minor;
  return c >= patch;
};

const pkg = JSON.parse(read('package.json'));
if (atLeast(pkg.version, 0, 58, 0)) pass(`P58 version — ${pkg.version}`); else fail(`version ${pkg.version} is older than 0.58.0`);

const required = [
  'docs/P58_UAT_MATRIX.md',
  'docs/P58_PRODUCTION_HARDENING_RUNBOOK.md',
  'tests/e2e/p58-full-uat-journey-contract.test.ts',
  'tests/recovery/p58-recovery-readiness-contract.test.ts',
  'tests/performance/p58-production-performance-contract.test.ts',
  'scripts/production-hardening.mjs',
  'scripts/recovery-preflight.mjs',
];
for (const file of required) {
  if (exists(file)) pass(`artifact ${file}`); else fail(`missing ${file}`);
}

if (pkg.scripts?.['ops:hardening'] === 'node scripts/production-hardening.mjs') pass('production hardening command'); else fail('production hardening command missing');
if (pkg.scripts?.['ops:recovery-preflight'] === 'node scripts/recovery-preflight.mjs') pass('recovery preflight command'); else fail('recovery preflight command missing');
if (pkg.scripts?.['verify:p58'] === 'node scripts/verify-p58.mjs') pass('P58 verification command'); else fail('P58 verification command missing');

const uat = read('tests/e2e/p58-full-uat-journey-contract.test.ts');
for (const marker of ['onboarding','accounts','income','budget','expenses','obligations','savings','emergency','goals','advisor','reports','dashboard','START_CLOSING','ForecastResolvedResult']) {
  if (uat.includes(marker)) pass(`UAT contract ${marker}`); else fail(`UAT contract missing ${marker}`);
}

const recovery = read('scripts/recovery-preflight.mjs');
for (const marker of ['RECOVERY_DATABASE_URL','target === production','BEGIN READ ONLY','schema_migrations','criticalTables','66']) {
  if (recovery.includes(marker)) pass(`recovery contract ${marker}`); else fail(`recovery contract missing ${marker}`);
}

const hardening = read('scripts/production-hardening.mjs');
for (const marker of ['postdeploy-smoke.mjs','production-status.mjs','production-stability.mjs','PRODUCTION-HARDENING-PASS']) {
  if (hardening.includes(marker)) pass(`hardening contract ${marker}`); else fail(`hardening contract missing ${marker}`);
}

const performance = read('tests/performance/p58-production-performance-contract.test.ts');
for (const marker of ['.max(100)','Promise.all','transactions_cycle_posted_type_category_idx','recommendations_open_feed_idx']) {
  if (performance.includes(marker)) pass(`performance contract ${marker}`); else fail(`performance contract missing ${marker}`);
}

const migrations = fs.readdirSync(path.join(root, 'database/migrations')).filter((name) => name.endsWith('.sql'));
if (migrations.length === 66) pass('migration inventory — 66'); else fail(`migration inventory expected 66 got ${migrations.length}`);

const gate = read('scripts/production-quality-gate.mjs');
if (gate.includes("['P58 full UAT and production hardening','node',['scripts/verify-p58.mjs']]")) pass('P58 wired first into quality gate'); else fail('P58 quality-gate wiring missing');

const p57 = read('scripts/verify-p57.mjs');
if (p57.includes('atLeast(pkg.version, 0, 57, 0)')) pass('P57 accepts later versions'); else fail('P57 future-version guard missing');

if (process.exitCode) process.exit(process.exitCode);
console.log('P58 full UAT and production hardening contract: PASS');
