import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const pass = (message) => console.log(`PASS ${message}`);
const fail = (message) => { console.error(`P59-FAIL ${message}`); process.exitCode = 1; };

const atLeast=(version,major,minor,patch)=>{const [a=0,b=0,c=0]=version.split('.').map(Number);if(a!==major)return a>major;if(b!==minor)return b>minor;return c>=patch;};
const pkg = JSON.parse(read('package.json'));
if (atLeast(pkg.version,1,0,0)) pass(`final semantic version — ${pkg.version}`);
else fail(`expected version 1.0.0 or newer got ${pkg.version}`);
if (pkg.scripts?.['verify:p59'] === 'node scripts/verify-p59.mjs') pass('P59 verification command');
else fail('P59 verification command missing');

for (const file of [
  'docs/P59_FINAL_PRODUCTION_AUDIT.md',
  'RELEASE_1_0_0.md',
  'database/migrations/20260904_065_goal_contribution_account_ledger.sql',
  'tests/integration/goal-contribution-ledger-contract.test.ts',
]) {
  if (exists(file)) pass(`final artifact ${file}`); else fail(`missing final artifact ${file}`);
}

const goalRepo = read('src/repositories/goal-repository.ts');
if (goalRepo.includes("'GOAL_CONTRIBUTION','POSTED'") && goalRepo.includes("${now},'OUT'") && goalRepo.includes("cashLedgerEffect: 'SOURCE_ACCOUNT_DEBIT'")) {
  pass('goal contribution debits source account');
} else fail('goal contribution ledger contract incomplete');

const goalType = read('src/features/goals/types/goal.ts');
if (goalType.includes("cashLedgerEffect: 'SOURCE_ACCOUNT_DEBIT'")) pass('goal contribution result exposes source debit');
else fail('goal contribution result still reports unresolved ledger effect');

const goalUi = read('src/app/(protected)/goals/[id]/contribute/page.tsx');
if (!goalUi.includes('لم يحسم') && goalUi.includes('تخصم المبلغ من الحساب المحدد')) pass('goal UI no longer reports unresolved physical ledger');
else fail('goal contribution UI still contains stale unresolved message');

const migration = read('database/migrations/20260904_065_goal_contribution_account_ledger.sql');
for (const marker of [
  "transaction_type='GOAL_CONTRIBUTION'",
  "transaction_direction='OUT'",
  'transactions_goal_contribution_direction_chk',
  'create or replace view public.account_balances_v',
  "'EMERGENCY_WITHDRAWAL','GOAL_CONTRIBUTION'",
]) {
  if (migration.includes(marker)) pass(`goal ledger migration ${marker}`); else fail(`goal ledger migration missing ${marker}`);
}

const issues = read('docs/IMPLEMENTATION_KNOWN_ISSUES_ADDENDUM.md');
for (const marker of ['ISSUE-0001','ISSUE-0002','ISSUE-0003','ISSUE-0004','ISSUE-0005','ISSUE-0006','ISSUE-0019']) {
  if (issues.includes(marker)) pass(`known-issue record ${marker}`); else fail(`known-issue record missing ${marker}`);
}
if (issues.includes('ISSUE-0019') && issues.includes('Status:** RESOLVED')) pass('final protected-fund P1 resolved');
else fail('ISSUE-0019 not resolved');

const currentDocs = [read('README.md'), read('REGRESSION_REPORT.md')].join('\n');
for (const stale of [
  'live forecast values remain explicitly blocked',
  'Cycle closing remains blocked while ISSUE-0002',
  'Forecast remains blocked while ISSUE-0004',
  'Safe To Spend final and cycle-final snapshot remain functionally blocked',
]) {
  if (!currentDocs.includes(stale)) pass(`current docs cleared stale blocker: ${stale}`); else fail(`current docs still contain stale blocker: ${stale}`);
}

const forecastIndex = read('src/forecast/index.ts');
if (!forecastIndex.includes('PendingForecastEngine') && !exists('src/forecast/pending-forecast-engine.ts')) pass('deprecated pending forecast runtime removed');
else fail('deprecated pending forecast runtime remains');

const migrations = fs.readdirSync(path.join(root, 'database/migrations')).filter((name) => name.endsWith('.sql'));
if (migrations.length === 66) pass('migration inventory — 66'); else fail(`migration inventory expected 66 got ${migrations.length}`);

const gate = read('scripts/production-quality-gate.mjs');
if (gate.includes("['P59 V1 final production release','node',['scripts/verify-p59.mjs']]")) pass('P59 wired first into quality gate');
else fail('P59 quality-gate wiring missing');

const p58 = read('scripts/verify-p58.mjs');
if (p58.includes('atLeast(pkg.version, 0, 58, 0)')) pass('P58 accepts V1 version'); else fail('P58 future-version guard missing');

if (!exists('package-lock.json')) console.log('P59-NOTE package-lock.json is not generated in this local runtime; Netlify remains authoritative under Node 24.20/npm 11.19.');

if (process.exitCode) process.exit(process.exitCode);
console.log('P59 V1 final production release contract: PASS');
