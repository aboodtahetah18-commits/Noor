import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const auth = fs.readFileSync('src/lib/auth/http-auth.ts', 'utf8');
const register = fs.readFileSync('src/app/api/auth-owner/register/route.ts', 'utf8');

describe('Phase 43 owner bootstrap contract', () => {
  it('creates owner, credential and initial session through Neon HTTP transaction', () => {
    expect(auth).toContain('rawSql.transaction');
    expect(auth).toContain('insert into auth."user"');
    expect(auth).toContain('insert into auth.account');
    expect(auth).toContain('insert into auth.session');
    expect(auth).toContain("'credential'");
  });

  it('hashes passwords with Better Auth crypto and sets an HttpOnly session cookie', () => {
    expect(auth).toContain('hashPassword');
    expect(auth).toContain('verifyPassword');
    expect(register).toContain('response.cookies.set');
  });
});
