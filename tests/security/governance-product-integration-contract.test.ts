import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const repository = readFileSync('src/repositories/governance-case-repository.ts', 'utf8');
const route = readFileSync('src/app/api/governance/cases/route.ts', 'utf8');

describe('governance product integration security contract', () => {
  it('binds every governance read to the authenticated PostgreSQL session context', () => {
    expect(repository).toContain("set_config('app.current_user_id'");
    expect(repository).toContain('sql.transaction([');
    expect(repository).toContain('where contract.user_id = ${userId}::uuid');
  });

  it('reads the governed case API contract instead of rebuilding state in the route', () => {
    expect(repository).toContain('governance.case_api_contract');
    expect(repository).toContain('governance.cases');
  });

  it('requires application authentication and never accepts a caller supplied user id', () => {
    expect(route).toContain('getAuthenticatedUser()');
    expect(route).toContain('listGovernanceCaseContracts(user.id, limit)');
    expect(route).not.toContain("searchParams.get('userId')");
    expect(route).not.toContain("searchParams.get('user_id')");
  });

  it('does not leak internal database errors to the client', () => {
    expect(route).toContain("{ error: 'SYSTEM' }");
    expect(route).not.toContain('error.message');
    expect(route).not.toContain('String(error)');
  });
});
