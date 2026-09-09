import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => { console.error(`P54-FAIL ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS ${message}`);
const atLeast = (version, major, minor, patch) => {
  const [a = 0, b = 0, c = 0] = version.split('.').map(Number);
  if (a !== major) return a > major;
  if (b !== minor) return b > minor;
  return c >= patch;
};

const pkg = JSON.parse(read('package.json'));
if (atLeast(pkg.version, 0, 54, 0)) pass(`P54 version — ${pkg.version}`);
else fail(`version ${pkg.version} is older than 0.54.0`);

if (pkg.scripts?.['verify:p54'] === 'node scripts/verify-p54.mjs') pass('P54 verification command');
else fail('P54 verification command missing');
if (pkg.scripts?.['ops:stability'] === 'node scripts/production-stability.mjs') pass('production stability command');
else fail('production stability command missing');
if (exists('scripts/production-stability.mjs')) pass('production stability script present');
else fail('production stability script missing');
if (exists('STABILITY_RUNBOOK.md')) pass('stability runbook present');
else fail('stability runbook missing');

const gate = read('scripts/production-quality-gate.mjs');
if (gate.includes("['P54 post-launch stability closure','node',['scripts/verify-p54.mjs']]")) pass('P54 wired into quality gate');
else fail('P54 quality-gate wiring missing');

const stability = read('scripts/production-stability.mjs');
for (const token of [
  "'/api/health'", "'/api/ready'", "'/login'", "'/dashboard'", "'/transactions'", "'/advisor'", "'/settings'",
  'production stability URL must use HTTPS', "status = 'stable'", "status = 'degraded'", '--samples', '--interval-ms', '--json',
  "method: 'GET'", "body?.database === 'reachable'",
]) {
  if (stability.includes(token)) pass(`stability contract ${token}`);
  else fail(`stability contract missing ${token}`);
}

const p53 = read('scripts/verify-p53.mjs');
if (p53.includes('atLeast(pkg.version, 0, 53, 0)')) pass('P53 accepts later versions');
else fail('P53 future-version guard missing');

const migrations = fs.readdirSync(path.join(root, 'database/migrations')).filter((name) => name.endsWith('.sql'));
if (migrations.length === 66) pass('migration inventory — 66');
else fail(`migration inventory expected 66 got ${migrations.length}`);

if (process.exitCode) process.exit(process.exitCode);
console.log('P54 post-launch monitoring and stability contract: PASS');
