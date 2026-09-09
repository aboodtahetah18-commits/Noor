import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => fs.readFileSync(path, 'utf8');

describe('V1 goal contribution account-ledger contract', () => {
  it('posts goal contributions as source-account OUT movements', () => {
    const repo = read('src/repositories/goal-repository.ts');
    expect(repo).toContain("'GOAL_CONTRIBUTION','POSTED'");
    expect(repo).toContain("${now},'OUT'");
    expect(repo).toContain("cashLedgerEffect: 'SOURCE_ACCOUNT_DEBIT'");
  });

  it('includes posted goal contributions in authoritative account outflow', () => {
    const migration = read('database/migrations/20260904_065_goal_contribution_account_ledger.sql');
    expect(migration).toContain("transaction_type='GOAL_CONTRIBUTION'");
    expect(migration).toContain("transaction_direction='OUT'");
    expect(migration).toContain("'EMERGENCY_WITHDRAWAL','GOAL_CONTRIBUTION'");
    expect(migration).toContain('create or replace view public.account_balances_v');
  });
});
