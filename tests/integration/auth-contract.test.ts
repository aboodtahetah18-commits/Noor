import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('Neon HTTP auth contract', () => {
  it('has no Supabase runtime dependency and keeps official Better Auth password crypto', () => {
    const packageJson = read('package.json');
    expect(packageJson).not.toContain('@supabase/');
    expect(packageJson).toContain('better-auth');
    expect(packageJson).toContain('@neondatabase/serverless');
    expect(read('src/lib/auth/http-auth.ts')).toContain("better-auth/crypto");
  });

  it('keeps credential reads and writes aligned with the auth.account schema', () => {
    const schema = read('src/infrastructure/db/auth-schema.ts');
    const login = read('src/lib/auth/verified-login.ts');
    const accountAccess = read('src/lib/auth/namaa-account-access.ts');
    const lifecycle = read('src/lib/auth/auth-lifecycle.ts');

    expect(schema).toContain("providerId: text('provider_id').notNull()");
    expect(schema).not.toContain("issuer:");
    expect(login).toContain("a.provider_id = 'credential'");
    expect(login).not.toContain('a.issuer');
    expect(accountAccess).not.toContain('issuer');
    expect(lifecycle).not.toContain('issuer');
  });

  it('protects authenticated pages through a server-validated HTTP session', () => {
    expect(read('src/auth/require-authenticated-user.ts')).toContain('getUserBySessionToken');
    expect(read('src/app/(protected)/layout.tsx')).toContain('requireAuthenticatedUser');
  });

  it('keeps root layout free of authentication redirects', () => {
    const root = read('src/app/layout.tsx');
    expect(root).not.toContain('requireAuthenticatedUser');
    expect(root).not.toContain("redirect('/login')");
  });

  it('uses HttpOnly first-party session cookies', () => {
    const cookie = read('src/lib/auth/session-cookie.ts');
    expect(cookie).toContain('httpOnly: true');
    expect(cookie).toContain("sameSite: 'lax'");
  });
});
