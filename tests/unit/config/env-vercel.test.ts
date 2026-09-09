import { describe, expect, it } from 'vitest';
import { getServerEnv } from '@/config/env';

const base: NodeJS.ProcessEnv = {
  ...process.env,
  NODE_ENV: 'production',
  APP_ENV: 'production',
  DATABASE_URL: 'postgresql://user:pass@example.invalid/db',
};

describe('Vercel origin compatibility', () => {
  it('trusts current, branch and production Vercel hosts', () => {
    const env = getServerEnv({
      ...base,
      VERCEL_URL: 'noor-w7wp.vercel.app',
      VERCEL_BRANCH_URL: 'noor-git-main-example.vercel.app',
      VERCEL_PROJECT_PRODUCTION_URL: 'noor.vercel.app',
    });

    expect(env.APP_BASE_URL).toBe('https://noor.vercel.app');
    expect(env.BETTER_AUTH_URL).toBe('https://noor.vercel.app');
    expect(env.TRUSTED_ORIGINS).toEqual(expect.arrayContaining([
      'https://noor.vercel.app',
      'https://noor-w7wp.vercel.app',
      'https://noor-git-main-example.vercel.app',
    ]));
  });

  it('keeps explicit canonical URLs while still trusting the active Vercel deployment', () => {
    const env = getServerEnv({
      ...base,
      APP_BASE_URL: 'https://finance.example.com/path',
      BETTER_AUTH_URL: 'https://auth.example.com/anything',
      VERCEL_URL: 'noor-preview.vercel.app',
    });

    expect(env.APP_BASE_URL).toBe('https://finance.example.com');
    expect(env.BETTER_AUTH_URL).toBe('https://auth.example.com');
    expect(env.TRUSTED_ORIGINS).toContain('https://noor-preview.vercel.app');
  });
});

