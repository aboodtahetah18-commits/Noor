import process from 'node:process';

const errors=[];
const warnings=[];
const env=process.env.VERCEL_ENV || process.env.APP_ENV || 'development';
const databaseUrl=process.env.DATABASE_URL?.trim() || process.env.DATABASEURL?.trim();

if (process.env.VERCEL === '1' && !['production','preview','development'].includes(env)) {
  errors.push(`Unexpected Vercel environment: ${env}`);
}
if (!databaseUrl) errors.push('DATABASE_URL is required for Vercel builds');
else {
  try {
    const url=new URL(databaseUrl);
    if (!['postgres:','postgresql:'].includes(url.protocol)) errors.push('DATABASE_URL must be PostgreSQL');
    if (!url.hostname) errors.push('DATABASE_URL must contain a host');
  } catch { errors.push('DATABASE_URL is not a valid URL'); }
}

for (const key of ['CRON_SECRET','JOB_SECRET']) {
  const value=process.env[key]?.trim();
  if (value && value.length < 32) errors.push(`${key} must contain at least 32 characters`);
  if (!value && env === 'production') warnings.push(`${key} is not configured`);
}

const explicitOrigin=process.env.APP_BASE_URL?.trim() || process.env.BETTER_AUTH_URL?.trim();
if (env === 'production' && !explicitOrigin) warnings.push('Set APP_BASE_URL and BETTER_AUTH_URL to the final production https:// domain after the first Vercel deployment.');

if (errors.length) {
  console.error('VERCEL-PREFLIGHT-FAIL');
  for (const item of errors) console.error(`- ${item}`);
  process.exit(1);
}
console.log(`VERCEL-PREFLIGHT-PASS environment=${env}`);
for (const item of warnings) console.warn(`WARN: ${item}`);
