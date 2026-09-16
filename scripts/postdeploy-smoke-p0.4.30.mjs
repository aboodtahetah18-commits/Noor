import process from 'node:process';

const candidate = process.argv[2] || process.env.PRODUCTION_BASE_URL || process.env.APP_BASE_URL;
if (!candidate) {
  console.error('NAMAA-P0.4.30-SMOKE-FAIL base URL is required');
  process.exit(1);
}

let base;
try {
  base = new URL(candidate);
} catch {
  console.error('NAMAA-P0.4.30-SMOKE-FAIL base URL is invalid');
  process.exit(1);
}
if (base.protocol !== 'https:') {
  console.error('NAMAA-P0.4.30-SMOKE-FAIL production smoke URL must use HTTPS');
  process.exit(1);
}

const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 12000);
const safeStatuses = new Set([200, 301, 302, 303, 307, 308, 401, 403]);

async function request(pathname, accept = 'text/html') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(new URL(pathname, base), {
      redirect: 'manual',
      headers: { Accept: accept, 'User-Agent': 'Namaa-P0.4.30-production-smoke/1.0' },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function requireHealthyJson(pathname, validator) {
  const response = await request(pathname, 'application/json');
  if (response.status !== 200) throw new Error(`${pathname} expected 200, received ${response.status}`);
  let body;
  try { body = await response.json(); } catch { throw new Error(`${pathname} returned invalid JSON`); }
  if (!validator(body)) throw new Error(`${pathname} returned an unhealthy payload`);
  console.log(`PASS ${pathname}`);
}

function requireNoServerError(response, pathname) {
  if (response.status >= 500) throw new Error(`${pathname} returned ${response.status}`);
  if (!safeStatuses.has(response.status)) throw new Error(`${pathname} returned unexpected status ${response.status}`);
}

try {
  await requireHealthyJson('/api/health/db', (body) => body?.ok === true && typeof body?.database === 'string');
  await requireHealthyJson('/api/health/app-db-role', (body) => body?.ok === true && body?.bypassrls === false && body?.superuser === false);
  await requireHealthyJson('/api/health/rls', (body) => body?.ok === true && Array.isArray(body?.tables));

  const publicRoutes = ['/', '/login', '/signup', '/forgot-password', '/reset-password'];
  for (const pathname of publicRoutes) {
    const response = await request(pathname);
    requireNoServerError(response, pathname);
    console.log(`PASS public route ${pathname} — ${response.status}`);
  }

  const protectedRoutes = [
    '/advisor', '/agents', '/alerts', '/analytics', '/assets', '/budget', '/central-bank',
    '/decisions', '/files', '/hilal', '/integration', '/malaa', '/meetings', '/reports', '/settings',
  ];
  for (const pathname of protectedRoutes) {
    const response = await request(pathname);
    requireNoServerError(response, pathname);
    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location && !location.includes('/login') && !location.includes(pathname)) {
      throw new Error(`${pathname} redirect target is unexpected: ${location}`);
    }
    console.log(`PASS protected route ${pathname} — ${response.status}${location ? ` -> ${location}` : ''}`);
  }

  const cron = await request('/api/jobs/financial-engine', 'application/json');
  if (cron.status !== 401 && cron.status !== 403) {
    throw new Error(`/api/jobs/financial-engine must reject unauthenticated access, received ${cron.status}`);
  }
  console.log(`PASS financial-engine cron auth boundary — ${cron.status}`);

  console.log(`NAMAA-P0.4.30-SMOKE-PASS ${base.origin}`);
} catch (error) {
  const message = error?.name === 'AbortError'
    ? `request timed out after ${timeoutMs}ms`
    : error instanceof Error ? error.message : String(error);
  console.error(`NAMAA-P0.4.30-SMOKE-FAIL ${message}`);
  process.exit(1);
}
