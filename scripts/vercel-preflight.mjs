import process from 'node:process';

const errors=[];
const warnings=[];
const env=process.env.VERCEL_ENV || process.env.APP_ENV || 'development';
const onVercel=process.env.VERCEL === '1';
const deployedRuntime=onVercel && ['production','preview'].includes(env);
const databaseUrl=process.env.DATABASE_URL?.trim() || process.env.DATABASEURL?.trim();
const betterAuthSecret=process.env.BETTER_AUTH_SECRET?.trim();
const buildOnlySecret='namaa-build-only-secret-not-for-runtime-20260916';
const strictRuntimeEnv=process.env.NAMAA_STRICT_RUNTIME_ENV === '1';

if (onVercel && !['production','preview','development'].includes(env)) {
  errors.push(`Unexpected Vercel environment: ${env}`);
}
if (!databaseUrl) errors.push('DATABASE_URL is required for Vercel builds and runtime');
else {
  try {
    const url=new URL(databaseUrl);
    if (!['postgres:','postgresql:'].includes(url.protocol)) errors.push('DATABASE_URL must be PostgreSQL');
    if (!url.hostname) errors.push('DATABASE_URL must contain a host');
    if (deployedRuntime && ['localhost','127.0.0.1'].includes(url.hostname)) errors.push('DATABASE_URL must not target localhost for Vercel Preview/Production');
  } catch { errors.push('DATABASE_URL is not a valid URL'); }
}

/*
 * This script runs during Vercel BUILD, before the final UI build command injects
 * isolated build-only auth/database placeholders. Missing runtime credentials must
 * not block a visual/build preview. Production runtime validation remains available
 * by setting NAMAA_STRICT_RUNTIME_ENV=1 in the deployment environment.
 */
if (deployedRuntime) {
  if (!betterAuthSecret) {
    const message='BETTER_AUTH_SECRET is not configured for Vercel runtime';
    if (strictRuntimeEnv) errors.push(message); else warnings.push(message);
  } else {
    if (betterAuthSecret.length < 32) errors.push('BETTER_AUTH_SECRET must contain at least 32 characters');
    if (betterAuthSecret === buildOnlySecret || betterAuthSecret.includes('build-only')) {
      errors.push('BETTER_AUTH_SECRET must be a real deployment secret, not the build-only placeholder');
    }
  }
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
      if (!url.hostname || ['localhost','127.0.0.1'].includes(url.hostname)) errors.push('BETTER_AUTH_URL must use a public hostname in production');
    } catch { errors.push('BETTER_AUTH_URL is not a valid URL'); }
  }

  const resendApiKey=process.env.RESEND_API_KEY?.trim();
  const smtpUser=process.env.SMTP_USER?.trim();
  const smtpPassword=process.env.SMTP_PASSWORD?.trim();
  const smtpConfigured=Boolean(smtpUser && smtpPassword);
  const authEmailFrom=process.env.AUTH_EMAIL_FROM?.trim();
  if (!resendApiKey && !smtpConfigured) {
    const message='Account email provider is not configured; set RESEND_API_KEY or SMTP_USER + SMTP_PASSWORD';
    if (strictRuntimeEnv) errors.push(message); else warnings.push(message);
  }
  if (!authEmailFrom) {
    const message='AUTH_EMAIL_FROM is not configured; verification/password recovery email is unavailable at runtime';
    if (strictRuntimeEnv) errors.push(message); else warnings.push(message);
  } else if (!authEmailFrom.includes('@')) errors.push('AUTH_EMAIL_FROM must contain a valid sender email address');
}

if (errors.length) {
  console.error('VERCEL-PREFLIGHT-FAIL');
  for (const item of errors) console.error(`- ${item}`);
  process.exit(1);
}
console.log(`VERCEL-PREFLIGHT-PASS environment=${env} strictRuntimeEnv=${strictRuntimeEnv ? 'on' : 'off'}`);
for (const item of warnings) console.warn(`WARN: ${item}`);
