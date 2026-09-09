import { z } from 'zod';

const serverEnvSchema = z.object({
  APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL or DATABASEURL is required'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema> & {
  APP_BASE_URL: string;
  BETTER_AUTH_URL: string;
  TRUSTED_ORIGINS: string[];
};

function normalizeUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return null;
  }
}

function normalizeHttpsHost(value: string | undefined): string | null {
  if (!value) return null;
  const candidate = value.includes('://') ? value : `https://${value}`;
  return normalizeUrl(candidate);
}

function unique(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

/**
 * Resolves the canonical application/auth URL while accepting both Netlify and
 * Vercel deployment origins. Explicit URLs remain authoritative, but the
 * current Vercel production/branch/deploy host is always trusted so a newly
 * generated *.vercel.app domain cannot be rejected by the mutation-origin
 * guard before APP_BASE_URL / BETTER_AUTH_URL are updated.
 */
export function getServerEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  const effectiveSource = {
    ...source,
    DATABASE_URL: source.DATABASE_URL ?? source.DATABASEURL,
  };

  const base = serverEnvSchema.parse(effectiveSource);

  const explicitAppUrl = normalizeUrl(source.APP_BASE_URL);
  const explicitAuthUrl = normalizeUrl(source.BETTER_AUTH_URL);

  // Vercel exposes hostnames without a scheme.
  const vercelProductionUrl = normalizeHttpsHost(source.VERCEL_PROJECT_PRODUCTION_URL);
  const vercelBranchUrl = normalizeHttpsHost(source.VERCEL_BRANCH_URL);
  const vercelDeployUrl = normalizeHttpsHost(source.VERCEL_URL);

  // Netlify exposes full URLs.
  const deployPrimeUrl = normalizeUrl(source.DEPLOY_PRIME_URL);
  const deployUrl = normalizeUrl(source.DEPLOY_URL);
  const siteUrl = normalizeUrl(source.URL);
  const localUrl = 'http://localhost:3000';

  const platformCanonicalUrl =
    vercelProductionUrl ??
    vercelDeployUrl ??
    deployPrimeUrl ??
    deployUrl ??
    siteUrl;

  const appBaseUrl = explicitAppUrl ?? platformCanonicalUrl ?? localUrl;
  const authUrl = explicitAuthUrl ?? appBaseUrl;

  return {
    ...base,
    APP_BASE_URL: appBaseUrl,
    BETTER_AUTH_URL: authUrl,
    TRUSTED_ORIGINS: unique([
      appBaseUrl,
      authUrl,
      explicitAppUrl,
      explicitAuthUrl,
      vercelProductionUrl,
      vercelBranchUrl,
      vercelDeployUrl,
      deployPrimeUrl,
      deployUrl,
      siteUrl,
      source.APP_ENV === 'development' ? localUrl : null,
    ]),
  };
}
