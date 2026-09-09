import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => { console.error(`P51-FAIL ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS ${message}`);
const atLeast = (version, major, minor, patch) => {
  const [a = 0, b = 0, c = 0] = version.split('.').map(Number);
  if (a !== major) return a > major;
  if (b !== minor) return b > minor;
  return c >= patch;
};

const pkg = JSON.parse(read('package.json'));
if (atLeast(pkg.version, 0, 51, 0)) pass(`P51 version — ${pkg.version}`);
else fail(`version ${pkg.version} is older than 0.51.0`);

if (pkg.scripts?.['smoke:production'] === 'node scripts/postdeploy-smoke.mjs') pass('production smoke command');
else fail('production smoke command missing');
if (pkg.scripts?.['verify:p51'] === 'node scripts/verify-p51.mjs') pass('P51 verification command');
else fail('P51 verification command missing');
if (exists('scripts/postdeploy-smoke.mjs')) pass('post-deploy smoke script present');
else fail('post-deploy smoke script missing');

const gate = read('scripts/production-quality-gate.mjs');
if (gate.includes("['P51 production closure','node',['scripts/verify-p51.mjs']]")) pass('P51 wired first-class into quality gate');
else fail('P51 quality-gate wiring missing');

const netlify = read('netlify.toml');
for (const token of [
  'npm run deploy:preflight && npm run quality:gate && npm run deploy:migrate',
  'NODE_VERSION = "24.20.0"',
  'NPM_VERSION = "11.19.0"',
  '[context.production.environment]',
  'APP_ENV = "production"',
  'ALLOW_DB_MIGRATIONS = "true"',
  '[context.deploy-preview.environment]',
  'ALLOW_DB_MIGRATIONS = "false"',
]) {
  if (netlify.includes(token)) pass(`Netlify production contract ${token}`);
  else fail(`Netlify production contract missing: ${token}`);
}

const preflight = read('scripts/deployment-preflight.mjs');
for (const token of ['Production runtime URL must use HTTPS','Deploy Preview must not apply database migrations automatically']) {
  if (preflight.includes(token)) pass(`preflight guard ${token}`);
  else fail(`preflight guard missing: ${token}`);
}

const smoke = read('scripts/postdeploy-smoke.mjs');
for (const token of ["'/api/health'","'/api/ready'","'/login'","'/dashboard'",'content-security-policy','x-frame-options','Production smoke URL must use HTTPS']) {
  if (smoke.toLowerCase().includes(token.toLowerCase())) pass(`smoke contract ${token}`);
  else fail(`smoke contract missing ${token}`);
}

const health = read('src/app/api/health/route.ts');
if (health.includes("status: 'ok'") && health.includes("'Cache-Control': 'no-store'")) pass('health liveness contract');
else fail('health liveness contract incomplete');

const ready = read('src/app/api/ready/route.ts');
if (ready.includes("status:'ready'") && ready.includes("database:'reachable'") && ready.includes('status:503')) pass('readiness dependency contract');
else fail('readiness dependency contract incomplete');

const entry = read('src/app/page.tsx');
if (entry.includes("redirect(user ? '/dashboard' : '/login')")) pass('operational root entrypoint');
else fail('operational root entrypoint missing');

const nextConfig = read('next.config.ts');
for (const token of ['Content-Security-Policy','X-Content-Type-Options','Referrer-Policy','X-Frame-Options','Strict-Transport-Security']) {
  if (nextConfig.includes(token)) pass(`security header ${token}`);
  else fail(`security header missing ${token}`);
}

const p50 = read('scripts/verify-p50.mjs');
if (p50.includes('atLeast(pkg.version,0,50,0)') || p50.includes('atLeast(pkg.version, 0, 50, 0)')) pass('P50 accepts later release versions');
else fail('P50 version guard is not future-compatible');

const migrations = fs.readdirSync(path.join(root, 'database/migrations')).filter((name) => name.endsWith('.sql'));
if (migrations.length === 66) pass('migration inventory — 66');
else fail(`migration inventory expected 66 got ${migrations.length}`);

if (process.exitCode) process.exit(process.exitCode);
console.log('P51 production closure contract: PASS');
