import fs from 'node:fs';
import process from 'node:process';

const candidate = process.argv.find((arg, index) => index > 1 && !arg.startsWith('--'))
  || process.env.PRODUCTION_BASE_URL
  || process.env.APP_BASE_URL;
const jsonMode = process.argv.includes('--json');
const reportArg = process.argv.find((arg) => arg.startsWith('--report='));
const reportPath = reportArg ? reportArg.slice('--report='.length).trim() : '';

if (!candidate) {
  console.error('LIVE-PRODUCTION-VALIDATION-FAIL base URL is required');
  process.exit(1);
}

let base;
try {
  base = new URL(candidate);
} catch {
  console.error('LIVE-PRODUCTION-VALIDATION-FAIL invalid base URL');
  process.exit(1);
}
if (base.protocol !== 'https:') {
  console.error('LIVE-PRODUCTION-VALIDATION-FAIL production URL must use HTTPS');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const timeoutMs = Math.max(1000, Math.min(30000, Number(process.env.SMOKE_TIMEOUT_MS || 12000)));
const protectedRoutes = ['/dashboard', '/transactions', '/expenses', '/accounts', '/advisor', '/reports', '/settings'];
const checks = [];

async function request(pathname, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(new URL(pathname, base), {
      method: options.method || 'GET',
      redirect: 'manual',
      headers: {
        Accept: options.accept || 'text/html',
        'User-Agent': `PFA-live-production-validation/${pkg.version}`,
        ...(options.headers || {}),
      },
      body: options.body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function record(name, ok, detail = '') {
  checks.push({ name, ok, detail });
  if (!jsonMode) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function jsonBody(response) {
  try { return await response.json(); } catch { return null; }
}

try {
  const health = await request('/api/health', { accept: 'application/json' });
  const healthBody = await jsonBody(health);
  record('/api/health', health.status === 200 && healthBody?.status === 'ok' && health.headers.get('cache-control')?.includes('no-store'), `HTTP ${health.status}`);

  const ready = await request('/api/ready', { accept: 'application/json' });
  const readyBody = await jsonBody(ready);
  record('/api/ready', ready.status === 200 && readyBody?.status === 'ready' && readyBody?.database === 'reachable' && ready.headers.get('cache-control')?.includes('no-store'), `HTTP ${ready.status}`);

  const authHealth = await request('/api/auth-owner/health', { accept: 'application/json' });
  const authHealthBody = await jsonBody(authHealth);
  record('/api/auth-owner/health', authHealth.status === 200 && authHealthBody?.ok === true && authHealthBody?.code === 'AUTH_HTTP_OK', `HTTP ${authHealth.status}`);

  const login = await request('/login');
  record('/login public entry', login.status === 200, `HTTP ${login.status}`);

  const root = await request('/');
  const rootLocation = root.headers.get('location') || '';
  record('/ root entry', [200, 302, 303, 307, 308].includes(root.status) && (!rootLocation || rootLocation.includes('/login') || rootLocation.includes('/dashboard')), `HTTP ${root.status}${rootLocation ? ` -> ${rootLocation}` : ''}`);

  for (const header of ['content-security-policy', 'x-content-type-options', 'x-frame-options', 'referrer-policy', 'strict-transport-security']) {
    const value = root.headers.get(header);
    record(`security header ${header}`, Boolean(value), value ? 'present' : 'missing');
  }

  for (const pathname of protectedRoutes) {
    const response = await request(pathname);
    const location = response.headers.get('location') || '';
    const protectedWithoutSession = [302, 303, 307, 308].includes(response.status) && location.includes('/login');
    record(`unauthenticated guard ${pathname}`, protectedWithoutSession, `HTTP ${response.status}${location ? ` -> ${location}` : ''}`);
  }

  const retired = await request('/api/auth/session', { accept: 'application/json' });
  const retiredBody = await jsonBody(retired);
  record('retired legacy auth runtime', retired.status === 410 && retiredBody?.code === 'AUTH_RUNTIME_RETIRED', `HTTP ${retired.status}`);

  const hostileOrigin = 'https://invalid-origin.example';
  const blockedLogin = await request('/api/auth-owner/login', {
    method: 'POST',
    accept: 'application/json',
    headers: { 'Content-Type': 'application/json', Origin: hostileOrigin },
    body: JSON.stringify({ email: 'nobody@example.invalid', password: 'not-a-real-password' }),
  });
  const blockedLoginBody = await jsonBody(blockedLogin);
  record('login origin protection', blockedLogin.status === 403 && blockedLoginBody?.code === 'AUTH_ORIGIN_REJECTED', `HTTP ${blockedLogin.status}`);

  const blockedRegister = await request('/api/auth-owner/register', {
    method: 'POST',
    accept: 'application/json',
    headers: { 'Content-Type': 'application/json', Origin: hostileOrigin },
    body: JSON.stringify({ name: 'Invalid Probe', email: 'nobody@example.invalid', password: 'not-a-real-password' }),
  });
  const blockedRegisterBody = await jsonBody(blockedRegister);
  record('registration origin protection', blockedRegister.status === 403 && blockedRegisterBody?.code === 'AUTH_ORIGIN_REJECTED', `HTTP ${blockedRegister.status}`);
} catch (error) {
  record('validation runtime', false, error?.name === 'AbortError' ? `timeout after ${timeoutMs}ms` : String(error?.message || error));
}

const failed = checks.filter((check) => !check.ok);
const report = {
  status: failed.length === 0 ? 'accepted' : 'rejected',
  checkedAt: new Date().toISOString(),
  releaseVersion: pkg.version,
  origin: base.origin,
  totalChecks: checks.length,
  passedChecks: checks.length - failed.length,
  failedChecks: failed.length,
  checks,
};

if (reportPath) fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
if (jsonMode) console.log(JSON.stringify(report, null, 2));
else console.log(`LIVE-PRODUCTION-VALIDATION-${failed.length === 0 ? 'PASS' : 'FAIL'} ${report.passedChecks}/${report.totalChecks} ${base.origin}`);

if (failed.length > 0) process.exit(1);
