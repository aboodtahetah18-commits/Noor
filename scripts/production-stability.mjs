import fs from 'node:fs';
import process from 'node:process';

const candidate = process.argv.find((arg, index) => index > 1 && !arg.startsWith('--'))
  || process.env.PRODUCTION_BASE_URL
  || process.env.APP_BASE_URL;
const jsonMode = process.argv.includes('--json');

function optionNumber(name, fallback) {
  const prefix = `${name}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  if (!arg) return fallback;
  const value = Number(arg.slice(prefix.length));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const samples = Math.max(1, Math.min(10, Math.floor(optionNumber('--samples', 3))));
const intervalMs = Math.max(0, Math.min(60000, Math.floor(optionNumber('--interval-ms', 5000))));
const timeoutMs = Math.max(1000, Math.min(30000, Math.floor(Number(process.env.SMOKE_TIMEOUT_MS || 12000))));

if (!candidate) {
  console.error('PRODUCTION-STABILITY-FAIL base URL is required (argument, PRODUCTION_BASE_URL, or APP_BASE_URL)');
  process.exit(1);
}

let base;
try {
  base = new URL(candidate);
} catch {
  console.error('PRODUCTION-STABILITY-FAIL base URL is invalid');
  process.exit(1);
}
if (base.protocol !== 'https:') {
  console.error('PRODUCTION-STABILITY-FAIL production stability URL must use HTTPS');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const safeStatuses = new Set([200, 301, 302, 303, 307, 308, 401, 403]);
const routePaths = ['/', '/login', '/dashboard', '/transactions', '/advisor', '/settings'];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(pathname, accept = 'text/html') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(new URL(pathname, base), {
      method: 'GET',
      redirect: 'manual',
      headers: { Accept: accept, 'User-Agent': `PFA-production-stability/${pkg.version}` },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function jsonProbe(pathname, validator) {
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
      ok: response.status === 200 && validator(body),
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

async function takeSample(index) {
  const startedAt = new Date().toISOString();
  const health = await jsonProbe('/api/health', (body) => body?.status === 'ok');
  const readiness = await jsonProbe('/api/ready', (body) => body?.status === 'ready' && body?.database === 'reachable');
  const routes = [];
  for (const pathname of routePaths) {
    routes.push(await routeProbe(pathname));
  }
  const ok = health.ok && readiness.ok && routes.every((route) => route.ok);
  return { index, startedAt, ok, health, readiness, routes };
}

const results = [];
for (let index = 1; index <= samples; index += 1) {
  results.push(await takeSample(index));
  if (index < samples && intervalMs > 0) await delay(intervalMs);
}

const passed = results.filter((sample) => sample.ok).length;
let status = 'unstable';
if (passed === samples) status = 'stable';
else if (passed > 0) status = 'degraded';

const report = {
  status,
  checkedAt: new Date().toISOString(),
  releaseVersion: pkg.version,
  origin: base.origin,
  samples,
  passed,
  failed: samples - passed,
  intervalMs,
  timeoutMs,
  results,
};

if (jsonMode) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Production stability: ${status.toUpperCase()}`);
  console.log(`Release: ${pkg.version}`);
  console.log(`Origin: ${base.origin}`);
  console.log(`Samples: ${passed}/${samples} passed`);
  for (const sample of results) {
    console.log(`${sample.ok ? 'PASS' : 'FAIL'} sample ${sample.index} — health=${sample.health.ok ? 'PASS' : 'FAIL'} ready=${sample.readiness.ok ? 'PASS' : 'FAIL'} routes=${sample.routes.filter((route) => route.ok).length}/${sample.routes.length}`);
  }
}

if (status !== 'stable') process.exit(1);
