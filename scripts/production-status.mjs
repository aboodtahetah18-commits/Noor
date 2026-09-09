import process from 'node:process';
import fs from 'node:fs';

const candidate = process.argv.find((arg, index) => index > 1 && !arg.startsWith('--'))
  || process.env.PRODUCTION_BASE_URL
  || process.env.APP_BASE_URL;
const jsonMode = process.argv.includes('--json');

if (!candidate) {
  console.error('PRODUCTION-STATUS-FAIL base URL is required (argument, PRODUCTION_BASE_URL, or APP_BASE_URL)');
  process.exit(1);
}

let base;
try {
  base = new URL(candidate);
} catch {
  console.error('PRODUCTION-STATUS-FAIL base URL is invalid');
  process.exit(1);
}
if (base.protocol !== 'https:') {
  console.error('PRODUCTION-STATUS-FAIL production status URL must use HTTPS');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 12000);
const safeStatuses = new Set([200, 301, 302, 303, 307, 308, 401, 403]);
const routePaths = ['/', '/login', '/dashboard', '/transactions', '/advisor', '/settings'];

async function request(pathname, accept = 'text/html') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(new URL(pathname, base), {
      method: 'GET',
      redirect: 'manual',
      headers: { Accept: accept, 'User-Agent': `PFA-production-status/${pkg.version}` },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function jsonProbe(pathname) {
  try {
    const response = await request(pathname, 'application/json');
    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    return {
      path: pathname,
      ok: response.status === 200,
      status: response.status,
      body,
    };
  } catch (error) {
    return {
      path: pathname,
      ok: false,
      status: null,
      error: error?.name === 'AbortError' ? `timeout after ${timeoutMs}ms` : String(error?.message || error),
    };
  }
}

async function routeProbe(pathname) {
  try {
    const response = await request(pathname);
    return {
      path: pathname,
      ok: response.status < 500 && safeStatuses.has(response.status),
      status: response.status,
      location: response.headers.get('location'),
    };
  } catch (error) {
    return {
      path: pathname,
      ok: false,
      status: null,
      error: error?.name === 'AbortError' ? `timeout after ${timeoutMs}ms` : String(error?.message || error),
    };
  }
}

const health = await jsonProbe('/api/health');
health.ok = health.ok && health.body?.status === 'ok';
const ready = await jsonProbe('/api/ready');
ready.ok = ready.ok && ready.body?.status === 'ready' && ready.body?.database === 'reachable';

const routes = [];
for (const pathname of routePaths) {
  routes.push(await routeProbe(pathname));
}

const overall = health.ok && ready.ok && routes.every((route) => route.ok);
const report = {
  status: overall ? 'operational' : 'degraded',
  checkedAt: new Date().toISOString(),
  releaseVersion: pkg.version,
  origin: base.origin,
  health,
  readiness: ready,
  routes,
};

if (jsonMode) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Production status: ${report.status.toUpperCase()}`);
  console.log(`Release: ${report.releaseVersion}`);
  console.log(`Origin: ${report.origin}`);
  console.log(`Health: ${health.ok ? 'PASS' : 'FAIL'}${health.status ? ` (${health.status})` : ''}`);
  console.log(`Readiness: ${ready.ok ? 'PASS' : 'FAIL'}${ready.status ? ` (${ready.status})` : ''}`);
  for (const route of routes) {
    const suffix = route.location ? ` -> ${route.location}` : '';
    console.log(`${route.ok ? 'PASS' : 'FAIL'} ${route.path}${route.status ? ` (${route.status})` : ''}${suffix}`);
  }
}

if (!overall) process.exit(1);
