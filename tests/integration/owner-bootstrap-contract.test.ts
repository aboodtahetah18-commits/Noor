import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const auth = fs.readFileSync('src/lib/auth/http-auth.ts', 'utf8');
const legacyRegister = fs.readFileSync('src/app/api/auth-owner/register/route.ts', 'utf8');
const login = fs.readFileSync('src/app/api/auth/login/route.ts', 'utf8');

describe('Phase 43 owner bootstrap contract', () => {
  it('keeps owner credential/session primitives available for authenticated flows', () => {
    expect(auth).toContain('rawSql.transaction');
    expect(auth).toContain('insert into auth."user"');
    expect(auth).toContain('insert into auth.account');
    expect(auth).toContain('insert into auth.session');
    expect(auth).toContain("'credential'");
  });

  it('hashes passwords, disables legacy direct registration, and only sets cookies from verified login', () => {
    expect(auth).toContain('hashPassword');
    expect(auth).toContain('verifyPassword');
    expect(legacyRegister).toContain('AUTH_LEGACY_REGISTRATION_DISABLED');
    expect(legacyRegister).not.toContain('response.cookies.set');
    expect(login).toContain('signInVerifiedWithPassword');
    expect(login).toContain('response.cookies.set');
  });
});
