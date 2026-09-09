import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => { console.error(`P63-FAIL ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS ${message}`);
const atLeast = (version, major, minor, patch) => {
  const [a = 0, b = 0, c = 0] = version.split('.').map(Number);
  if (a !== major) return a > major;
  if (b !== minor) return b > minor;
  return c >= patch;
};

const pkg = JSON.parse(read('package.json'));
if (atLeast(pkg.version, 1, 4, 0)) pass(`P63 version — ${pkg.version}`);
else fail(`version ${pkg.version} is older than 1.4.0`);

if (pkg.scripts?.['verify:p63'] === 'node scripts/verify-p63.mjs') pass('P63 verification command');
else fail('P63 verification command missing');
if (pkg.scripts?.['ops:live-validate'] === 'node scripts/live-production-validation.mjs') pass('live production validation command');
else fail('live production validation command missing');
if (exists('scripts/live-production-validation.mjs')) pass('live production validation script present');
else fail('live production validation script missing');
if (exists('P63_LIVE_PRODUCTION_ACCEPTANCE.md')) pass('live production acceptance runbook present');
else fail('live production acceptance runbook missing');

const live = read('scripts/live-production-validation.mjs');
for (const token of [
  "'/api/health'", "'/api/ready'", "'/api/auth-owner/health'", "'/login'", "'/dashboard'", "'/transactions'", "'/expenses'", "'/accounts'", "'/advisor'", "'/reports'", "'/settings'",
  'AUTH_RUNTIME_RETIRED', 'AUTH_ORIGIN_REJECTED', 'strict-transport-security', 'content-security-policy', '--report=', '--json', "method: 'POST'", "method: options.method || 'GET'", "readyBody?.database === 'reachable'",
]) {
  if (live.includes(token)) pass(`live validation contract ${token}`);
  else fail(`live validation contract missing ${token}`);
}

if (live.includes("hostileOrigin = 'https://invalid-origin.example'") && live.includes('registration origin protection') && live.includes('login origin protection')) pass('non-destructive hostile-origin security probes');
else fail('hostile-origin production probes missing');

const authLegacy = read('src/app/api/auth/[...all]/route.ts');
if (authLegacy.includes("AUTH_RUNTIME_RETIRED") && authLegacy.includes('status: 410')) pass('legacy auth runtime retirement contract');
else fail('legacy auth runtime retirement contract missing');

const authHealth = read('src/app/api/auth-owner/health/route.ts');
if (authHealth.includes("AUTH_HTTP_OK") && authHealth.includes('ownerCount')) pass('owner auth health contract');
else fail('owner auth health contract missing');

const gate = read('scripts/production-quality-gate.mjs');
if (gate.includes("['P63 live production validation','node',['scripts/verify-p63.mjs']]")) pass('P63 wired first in quality gate');
else fail('P63 quality-gate wiring missing');

const p62 = read('scripts/verify-p62.mjs');
if (p62.includes('atLeast(pkg.version, 1, 3, 0)')) pass('P62 accepts later versions');
else fail('P62 future-version guard missing');

const migrations = fs.readdirSync(path.join(root, 'database/migrations')).filter((name) => name.endsWith('.sql'));
if (migrations.length === 66) pass('migration inventory — 66');
else fail(`migration inventory expected 66 got ${migrations.length}`);

if (process.exitCode) process.exit(process.exitCode);
console.log('P63 live production validation contract: PASS');
