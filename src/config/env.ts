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

function unique(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

/**
 * Netlify exposes the canonical site URL and the current deploy URL automatically.
 * Explicit app/auth URLs still win when they are supplied, but preview deploys do
 * not require editing Better Auth URLs for every generated Netlify subdomain.
 */
export function getServerEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  const effectiveSource = {
    ...source,
    // Canonicalize Netlify's accepted DATABASEURL alias before Zod validation.
    DATABASE_URL:
      source.DATABASE_URL ??
      source.DATABASEURL,
  };

  const base = serverEnvSchema.parse(effectiveSource);

  const explicitAppUrl = normalizeUrl(source.APP_BASE_URL);
  const explicitAuthUrl = normalizeUrl(source.BETTER_AUTH_URL);
  const deployPrimeUrl = normalizeUrl(source.DEPLOY_PRIME_URL);
  const deployUrl = normalizeUrl(source.DEPLOY_URL);
  const siteUrl = normalizeUrl(source.URL);
  const localUrl = 'http://localhost:3000';

  const appBaseUrl = explicitAppUrl ?? deployPrimeUrl ?? deployUrl ?? siteUrl ?? localUrl;
  const authUrl = explicitAuthUrl ?? deployPrimeUrl ?? deployUrl ?? siteUrl ?? appBaseUrl;

  return {
    ...base,
    APP_BASE_URL: appBaseUrl,
    BETTER_AUTH_URL: authUrl,
    TRUSTED_ORIGINS: unique([
      appBaseUrl,
      authUrl,
      deployPrimeUrl,
      deployUrl,
      siteUrl,
      source.APP_ENV === 'development' ? localUrl : null,
    ]),
  };
}
