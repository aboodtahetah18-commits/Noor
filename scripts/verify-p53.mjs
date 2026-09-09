import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => { console.error(`P53-FAIL ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS ${message}`);
const atLeast = (version, major, minor, patch) => {
  const [a = 0, b = 0, c = 0] = version.split('.').map(Number);
  if (a !== major) return a > major;
  if (b !== minor) return b > minor;
  return c >= patch;
};

const pkg = JSON.parse(read('package.json'));
if (atLeast(pkg.version, 0, 53, 0)) pass(`P53 version — ${pkg.version}`);
else fail(`version ${pkg.version} is older than 0.53.0`);

if (pkg.scripts?.['verify:p53'] === 'node scripts/verify-p53.mjs') pass('P53 verification command');
else fail('P53 verification command missing');
if (pkg.scripts?.['ops:status'] === 'node scripts/production-status.mjs') pass('operational status command');
else fail('operational status command missing');
if (pkg.scripts?.['smoke:production'] === 'node scripts/postdeploy-smoke.mjs') pass('production smoke retained');
else fail('production smoke command missing');

if (exists('scripts/production-status.mjs')) pass('production status script present');
else fail('production status script missing');
if (exists('PRODUCTION_RUNBOOK.md')) pass('production runbook present');
else fail('production runbook missing');

const gate = read('scripts/production-quality-gate.mjs');
if (gate.includes("['P53 production launch handoff','node',['scripts/verify-p53.mjs']]")) pass('P53 wired into quality gate');
else fail('P53 quality-gate wiring missing');

const status = read('scripts/production-status.mjs');
for (const token of [
  "'/api/health'", "'/api/ready'", "'/login'", "'/dashboard'", "'/transactions'", "'/advisor'", "'/settings'",
  'production status URL must use HTTPS', 'database === \'reachable\'', 'status: overall ? \'operational\' : \'degraded\'', '--json',
]) {
  if (status.includes(token)) pass(`operational status contract ${token}`);
  else fail(`operational status contract missing ${token}`);
}

const runbook = read('PRODUCTION_RUNBOOK.md');
for (const token of ['smoke:production', 'ops:status', 'Rollback', '/api/ready', '66 migrations']) {
  if (runbook.includes(token)) pass(`runbook contract ${token}`);
  else fail(`runbook contract missing ${token}`);
}

const p52 = read('scripts/verify-p52.mjs');
if (p52.includes('atLeast(pkg.version, 0, 52, 0)')) pass('P52 accepts later versions');
else fail('P52 future-version guard missing');

const migrations = fs.readdirSync(path.join(root, 'database/migrations')).filter((name) => name.endsWith('.sql'));
if (migrations.length === 66) pass('migration inventory — 66');
else fail(`migration inventory expected 66 got ${migrations.length}`);

if (process.exitCode) process.exit(process.exitCode);
console.log('P53 production launch handoff contract: PASS');
