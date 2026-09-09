import { spawnSync } from 'node:child_process';
import process from 'node:process';

const candidate = process.argv.find((arg, index) => index > 1 && !arg.startsWith('--'))
  || process.env.PRODUCTION_BASE_URL
  || process.env.APP_BASE_URL;
if (!candidate) {
  console.error('PRODUCTION-HARDENING-FAIL base URL is required');
  process.exit(1);
}
let url;
try { url = new URL(candidate); } catch { console.error('PRODUCTION-HARDENING-FAIL invalid base URL'); process.exit(1); }
if (url.protocol !== 'https:') {
  console.error('PRODUCTION-HARDENING-FAIL production URL must use HTTPS');
  process.exit(1);
}

const steps = [
  ['post-deploy smoke', 'scripts/postdeploy-smoke.mjs', [url.origin]],
  ['production status', 'scripts/production-status.mjs', [url.origin]],
  ['production stability', 'scripts/production-stability.mjs', [url.origin, '--samples=3', '--interval-ms=5000']],
];
for (const [label, script, args] of steps) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(process.execPath, [script, ...args], { stdio: 'inherit' });
  if (result.error) {
    console.error(`PRODUCTION-HARDENING-FAIL ${label}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`PRODUCTION-HARDENING-FAIL ${label} exit=${result.status}`);
    process.exit(result.status ?? 1);
  }
}
console.log(`\nPRODUCTION-HARDENING-PASS ${url.origin}`);
