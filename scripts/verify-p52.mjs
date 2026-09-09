import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => { console.error(`P52-FAIL ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS ${message}`);
const atLeast = (version, major, minor, patch) => {
  const [a = 0, b = 0, c = 0] = version.split('.').map(Number);
  if (a !== major) return a > major;
  if (b !== minor) return b > minor;
  return c >= patch;
};

const pkg = JSON.parse(read('package.json'));
if (atLeast(pkg.version, 0, 52, 0)) pass(`P52 version — ${pkg.version}`);
else fail(`version ${pkg.version} is older than 0.52.0`);

if (pkg.scripts?.['verify:p52'] === 'node scripts/verify-p52.mjs') pass('P52 verification command');
else fail('P52 verification command missing');
if (pkg.scripts?.['smoke:production'] === 'node scripts/postdeploy-smoke.mjs') pass('production smoke command retained');
else fail('production smoke command missing');
if (exists('scripts/postdeploy-smoke.mjs')) pass('post-deploy smoke script present');
else fail('post-deploy smoke script missing');

const gate = read('scripts/production-quality-gate.mjs');
if (gate.includes("['P52 live production smoke closure','node',['scripts/verify-p52.mjs']]")) pass('P52 wired into quality gate');
else fail('P52 quality-gate wiring missing');

const smoke = read('scripts/postdeploy-smoke.mjs');
for (const token of [
  "'/api/health'", "'/api/ready'", "'/login'", "'/dashboard'", "'/transactions'", "'/advisor'", "'/settings'",
  'strict-transport-security', 'content-security-policy', 'x-frame-options', 'cache-control',
  'SMOKE_TIMEOUT_MS', 'AbortController', 'Production smoke URL must use HTTPS', 'POSTDEPLOY-SMOKE-PASS',
]) {
  if (smoke.toLowerCase().includes(token.toLowerCase())) pass(`smoke contract ${token}`);
  else fail(`smoke contract missing ${token}`);
}

const nextConfig = read('next.config.ts');
for (const token of ['Strict-Transport-Security','Content-Security-Policy','X-Content-Type-Options','Referrer-Policy','X-Frame-Options']) {
  if (nextConfig.includes(token)) pass(`production header contract ${token}`);
  else fail(`production header contract missing ${token}`);
}

const health = read('src/app/api/health/route.ts');
if (health.includes("status: 'ok'") && health.includes("'Cache-Control': 'no-store'")) pass('health no-store contract');
else fail('health no-store contract incomplete');

const ready = read('src/app/api/ready/route.ts');
if (ready.includes("status:'ready'") && ready.includes("database:'reachable'") && ready.includes("'Cache-Control':'no-store'")) pass('ready no-store database contract');
else fail('ready no-store database contract incomplete');

const p51 = read('scripts/verify-p51.mjs');
if (p51.includes('atLeast(pkg.version, 0, 51, 0)')) pass('P51 accepts later versions');
else fail('P51 future-version guard missing');

const migrations = fs.readdirSync(path.join(root, 'database/migrations')).filter((name) => name.endsWith('.sql'));
if (migrations.length === 66) pass('migration inventory — 66');
else fail(`migration inventory expected 66 got ${migrations.length}`);

if (process.exitCode) process.exit(process.exitCode);
console.log('P52 live production smoke closure contract: PASS');
