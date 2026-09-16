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

const explicitAppBaseUrl=process.env.APP_BASE_URL?.trim();
const vercelProductionHost=process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
const vercelDeployHost=process.env.VERCEL_URL?.trim();
const derivedAppBaseUrl=explicitAppBaseUrl || (vercelProductionHost ? `https://${vercelProductionHost}` : null) || (vercelDeployHost ? `https://${vercelDeployHost}` : null);
const betterAuthUrl=process.env.BETTER_AUTH_URL?.trim();

if (env === 'production') {
  if (!derivedAppBaseUrl) {
    errors.push('A production application origin is required for email verification and password reset links');
  } else {
    try {
      const url=new URL(derivedAppBaseUrl);
      if (url.protocol !== 'https:') errors.push('Production application origin must use https');
      if (!url.hostname || ['localhost','127.0.0.1'].includes(url.hostname)) errors.push('Production application origin must use a public hostname');
    } catch { errors.push('Production application origin is not a valid URL'); }
  }

  if (betterAuthUrl) {
    try {
      const url=new URL(betterAuthUrl);
      if (url.protocol !== 'https:') errors.push('BETTER_AUTH_URL must use https in production');
    } catch { errors.push('BETTER_AUTH_URL is not a valid URL'); }
  }

  const resendApiKey=process.env.RESEND_API_KEY?.trim();
  const authEmailFrom=process.env.AUTH_EMAIL_FROM?.trim();
  if (!resendApiKey) errors.push('RESEND_API_KEY is required in production for account verification and password recovery');
  if (!authEmailFrom) errors.push('AUTH_EMAIL_FROM is required in production for account verification and password recovery');
  else if (!authEmailFrom.includes('@')) errors.push('AUTH_EMAIL_FROM must contain a valid sender email address');
}

if (errors.length) {
  console.error('VERCEL-PREFLIGHT-FAIL');
  for (const item of errors) console.error(`- ${item}`);
  process.exit(1);
}
console.log(`VERCEL-PREFLIGHT-PASS environment=${env}`);
for (const item of warnings) console.warn(`WARN: ${item}`);
