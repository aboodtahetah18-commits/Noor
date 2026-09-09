import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const pass = (message) => console.log(`PASS ${message}`);
const fail = (message) => { console.error(`P64-FAIL ${message}`); process.exitCode = 1; };
const atLeast = (version, major, minor, patch) => {
  const [a = 0, b = 0, c = 0] = version.split('.').map(Number);
  if (a !== major) return a > major;
  if (b !== minor) return b > minor;
  return c >= patch;
};

const pkg = JSON.parse(read('package.json'));
if (atLeast(pkg.version, 1, 5, 0)) pass(`P64 version — ${pkg.version}`);
else fail(`version ${pkg.version} is older than 1.5.0`);

for (const [name, expected] of [
  ['verify:p64', 'node scripts/verify-p64.mjs'],
  ['ops:release-seal', 'node scripts/final-release-seal.mjs'],
  ['ops:live-validate', 'node scripts/live-production-validation.mjs'],
]) {
  if (pkg.scripts?.[name] === expected) pass(`package script ${name}`);
  else fail(`package script ${name} missing or changed`);
}

for (const file of [
  'CURRENT_RELEASE_STATUS.md',
  'CURRENT_KNOWN_ISSUES.md',
  'REGRESSION_REPORT.md',
  'PHASE_64_FINAL_100_PERCENT_CLOSURE_1_5_0.md',
  'RELEASE_1_5_0.md',
  'scripts/final-release-seal.mjs',
  'tests/regression/final-release-closure-contract.test.ts',
]) {
  if (exists(file)) pass(`P64 artifact ${file}`);
  else fail(`missing P64 artifact ${file}`);
}

const currentIssues = read('CURRENT_KNOWN_ISSUES.md');
if (currentIssues.includes('None open for the approved V1/V1.5 scope.')) pass('current product issues closed');
else fail('current product issue closure statement missing');
if (!/\bOPEN\b|\bP1\b|\bBLOCKED\b/.test(currentIssues)) pass('no open/blocking product marker in current issues');
else fail('current issues contains an open/blocking marker');

const readme = read('README.md');
for (const stale of ['supabase/migrations/', 'V1.0.0 Final Regression Report', 'live forecast values remain explicitly blocked']) {
  if (!readme.includes(stale)) pass(`README cleared stale marker ${stale}`);
  else fail(`README still contains stale marker ${stale}`);
}
if (readme.includes('database/migrations/') && readme.includes('V1.5.0')) pass('README current runtime baseline');
else fail('README current runtime baseline incomplete');

const live = read('scripts/live-production-validation.mjs');
if (live.includes("readyBody?.database === 'reachable'") && live.includes("hostileOrigin = 'https://invalid-origin.example'")) pass('P63 repaired live validation retained');
else fail('P63 live validation regression detected');

const seal = read('scripts/final-release-seal.mjs');
for (const token of [
  "report?.status !== 'accepted'",
  'report?.failedChecks !== 0',
  'report?.releaseVersion !== pkg.version',
  "report.origin.startsWith('https://')",
  'FINAL-RELEASE-SEAL-PASS',
]) {
  if (seal.includes(token)) pass(`release seal contract ${token}`);
  else fail(`release seal contract missing ${token}`);
}

const migrations = fs.readdirSync(path.join(root, 'database/migrations')).filter((name) => name.endsWith('.sql'));
if (migrations.length === 66) pass('migration inventory — 66');
else fail(`migration inventory expected 66 got ${migrations.length}`);

const tests = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.test\.(ts|tsx|js|mjs)$/.test(entry.name)) tests.push(full);
  }
};
walk(path.join(root, 'tests'));
if (tests.length >= 77) pass(`test inventory — ${tests.length}`);
else fail(`test inventory expected at least 77 got ${tests.length}`);

const gate = read('scripts/production-quality-gate.mjs');
const p64Needle = "['P64 final 100 percent closure','node',['scripts/verify-p64.mjs']]";
if (gate.includes(p64Needle)) pass('P64 wired into quality gate');
else fail('P64 quality-gate wiring missing');
const p64Index = gate.indexOf(p64Needle);
const p63Index = gate.indexOf("['P63 live production validation','node',['scripts/verify-p63.mjs']]");
if (p64Index >= 0 && p63Index >= 0 && p64Index < p63Index) pass('P64 is before P63 in quality gate');
else fail('P64 is not first-phase gate');

if (!exists('package-lock.json')) console.log('P64-NOTE package-lock.json is intentionally not fabricated outside Node 24.20/npm 11.19; Netlify remains authoritative for dependency installation.');

if (process.exitCode) process.exit(process.exitCode);
console.log('P64 final 100 percent scope closure contract: PASS');
