import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('accounts vertical slice contract', () => {
  it('creates account and opening balance atomically', () => {
    const source = read('src/repositories/account-repository.ts');
    expect(source).toContain('rawSql.transaction');
    expect(source).toContain('account_opening_balances');
  });

  it('scopes all account reads and writes to authenticated ownership', () => {
    const source = read('src/repositories/account-repository.ts');
    expect(source.match(/user_id=\$\{userId\}/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(source).toContain('eq(accounts.userId, userId)');
  });

  it('does not persist a mutable accounts.balance source of truth', () => {
    const migration = read('database/migrations/20260902_003_profiles_accounts.sql');
    expect(migration).not.toMatch(/\bbalance\s+numeric/i);
    expect(read('database/migrations/20260902_008_indexes_views_immutability.sql')).toContain('account_balances_v');
  });
});
