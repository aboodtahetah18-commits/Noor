import process from 'node:process';

const errors = [];
const warnings = [];
const vercelEnv = process.env.VERCEL_ENV;
const appEnv = process.env.APP_ENV || (vercelEnv === 'production' ? 'production' : 'staging');
const deployContext = process.env.CONTEXT || (vercelEnv === 'production' ? 'production' : vercelEnv === 'preview' ? 'deploy-preview' : 'local');

if (!['staging','production'].includes(appEnv)) {
  errors.push(`APP_ENV must be staging or production (received: ${appEnv})`);
}

const databaseUrl = process.env.DATABASE_URL?.trim() || process.env.DATABASEURL?.trim();
if (!databaseUrl) errors.push('DATABASE_URL or DATABASEURL is required');
else {
  try {
    const url = new URL(databaseUrl);
    if (!['postgres:','postgresql:'].includes(url.protocol)) errors.push('DATABASE_URL/DATABASEURL must use postgres/postgresql');
    if (!url.hostname) errors.push('DATABASE_URL/DATABASEURL must contain a host');
    if (!/sslmode=require/i.test(url.search)) warnings.push('Neon connection should include sslmode=require');
  } catch {
    errors.push('DATABASE_URL/DATABASEURL is not a valid PostgreSQL URL');
  }
}

for (const optionalSecret of ['CRON_SECRET','JOB_SECRET']) {
  const value = process.env[optionalSecret]?.trim();
  if (value && value.length < 32) errors.push(`${optionalSecret} must be at least 32 characters when configured`);
}

function origin(value) {
  if (!value) return null;
  try { return new URL(value).origin; } catch { return null; }
}
const vercelRuntimeUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;
const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null;
const runtimeOrigin = origin(process.env.APP_BASE_URL) || origin(process.env.BETTER_AUTH_URL) || origin(vercelRuntimeUrl) || origin(vercelProductionUrl) || origin(process.env.APP_BASE_URL) || origin(process.env.BETTER_AUTH_URL) || origin(process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null) || origin(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) || origin(process.env.DEPLOY_PRIME_URL) || origin(process.env.DEPLOY_URL) || origin(process.env.URL);
if (!runtimeOrigin) warnings.push('No explicit deployment runtime URL is available during preflight; runtime URL resolution will fall back to localhost only outside hosted deployments.');
if (appEnv === 'production' && runtimeOrigin?.startsWith('http://')) errors.push('Production runtime URL must use HTTPS');

if (process.env.PREVIEW_MODE === 'true') errors.push('PREVIEW_MODE must not be true in operational deployments');

const migrationsAllowed = process.env.ALLOW_DB_MIGRATIONS === 'true' || process.env.ALLOW_STAGING_MIGRATIONS === 'true';
if (['deploy-preview','preview'].includes(deployContext) && migrationsAllowed) {
  errors.push('Preview deployments must not apply database migrations automatically');
}
if (appEnv === 'production' && deployContext === 'production' && !migrationsAllowed) {
  warnings.push('Production migrations are disabled; deployment will build without applying new migrations.');
}

if (errors.length) {
  console.error('Deployment preflight FAILED:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('Deployment preflight PASS');
console.log(`APP_ENV=${appEnv}`);
console.log(`CONTEXT=${deployContext}`);
console.log(`Database connection variable=${process.env.DATABASE_URL?.trim() ? 'DATABASE_URL' : 'DATABASEURL'} (redacted)`);
console.log(`Migrations=${migrationsAllowed ? 'enabled' : 'disabled'}`);
for (const warning of warnings) console.warn(`WARN: ${warning}`);
