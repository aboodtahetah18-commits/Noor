import process from 'node:process';

const candidate = process.argv[2] || process.env.PRODUCTION_BASE_URL || process.env.APP_BASE_URL;
if (!candidate) {
  console.error('POSTDEPLOY-SMOKE-FAIL base URL is required (argument, PRODUCTION_BASE_URL, or APP_BASE_URL)');
  process.exit(1);
}

let base;
try {
  base = new URL(candidate);
} catch {
  console.error('POSTDEPLOY-SMOKE-FAIL base URL is invalid');
  process.exit(1);
}
if (base.protocol !== 'https:') {
  console.error('POSTDEPLOY-SMOKE-FAIL production smoke URL must use HTTPS');
  process.exit(1);
}

const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 12000);
const safeStatuses = new Set([200, 301, 302, 303, 307, 308, 401, 403]);

async function request(pathname, { accept = 'text/html' } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(new URL(pathname, base), {
      redirect: 'manual',
      headers: { Accept: accept, 'User-Agent': 'PFA-production-smoke/0.52' },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(pathname) {
  const response = await request(pathname, { accept: 'application/json' });
  let body = null;
  try { body = await response.json(); } catch { body = null; }
  return { response, body };
}

function requireHeader(response, name, predicate = (value) => Boolean(value)) {
  const value = response.headers.get(name);
  if (!value || !predicate(value)) throw new Error(`missing or invalid security header ${name}`);
  return value;
}

function requireNoServerError(response, pathname) {
  if (response.status >= 500) throw new Error(`${pathname} returned ${response.status}`);
  if (!safeStatuses.has(response.status)) throw new Error(`${pathname} returned unexpected status ${response.status}`);
}

try {
  const health = await fetchJson('/api/health');
  if (health.response.status !== 200 || health.body?.status !== 'ok') {
    throw new Error(`/api/health expected 200 status=ok, received ${health.response.status}`);
  }
  if (!health.response.headers.get('cache-control')?.includes('no-store')) {
    throw new Error('/api/health must be no-store');
  }
  console.log('PASS /api/health');

  const ready = await fetchJson('/api/ready');
  if (ready.response.status !== 200 || ready.body?.status !== 'ready' || ready.body?.database !== 'reachable') {
    throw new Error(`/api/ready expected 200 status=ready database=reachable, received ${ready.response.status}`);
  }
  if (!ready.response.headers.get('cache-control')?.includes('no-store')) {
    throw new Error('/api/ready must be no-store');
  }
  console.log('PASS /api/ready');

  const root = await request('/');
  requireNoServerError(root, '/');
  const location = root.headers.get('location');
  if (location && !location.includes('/login') && !location.includes('/dashboard')) {
    throw new Error(`/ redirect target is unexpected: ${location}`);
  }
  console.log(`PASS / entrypoint — ${root.status}${location ? ` -> ${location}` : ''}`);

  for (const name of ['x-content-type-options','referrer-policy','x-frame-options','content-security-policy']) {
    requireHeader(root, name);
    console.log(`PASS security header ${name}`);
  }
  requireHeader(root, 'strict-transport-security', (value) => value.includes('max-age='));
  console.log('PASS security header strict-transport-security');

  const probes = ['/login','/dashboard','/transactions','/advisor','/settings'];
  for (const pathname of probes) {
    const response = await request(pathname);
    requireNoServerError(response, pathname);
    const redirectTarget = response.headers.get('location');
    if (redirectTarget && !redirectTarget.includes('/login') && !redirectTarget.includes(pathname) && !redirectTarget.includes('/dashboard')) {
      throw new Error(`${pathname} redirect target is unexpected: ${redirectTarget}`);
    }
    console.log(`PASS route ${pathname} — ${response.status}${redirectTarget ? ` -> ${redirectTarget}` : ''}`);
  }

  console.log(`POSTDEPLOY-SMOKE-PASS ${base.origin}`);
} catch (error) {
  const message = error?.name === 'AbortError'
    ? `request timed out after ${timeoutMs}ms`
    : error instanceof Error ? error.message : String(error);
  console.error(`POSTDEPLOY-SMOKE-FAIL ${message}`);
  process.exit(1);
}
