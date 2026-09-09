import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase 14 reversal source contract', () => {
  const source = fs.readFileSync(path.join(process.cwd(),'src/repositories/transaction-repository.ts'),'utf8');
  const migration = fs.readFileSync(path.join(process.cwd(),'database/migrations/20260902_012_transaction_reversal.sql'),'utf8');

  it('only reverses POSTED transactions owned by the authenticated user', () => {
    expect(source).toContain("t.status='POSTED'");
    expect(source).toContain('t.user_id=${userId}');
  });

  it('writes REVERSED, reversed_at and a documented reason', () => {
    expect(source).toContain("status='REVERSED'");
    expect(source).toContain('reversed_at=${transitionTime}');
    expect(source).toContain('reversal_reason=${input.reason}');
    expect(migration).toContain('reversal_reason');
  });

  it('writes immutable transition audit', () => {
    expect(source).toContain("'POSTED','REVERSED','REVERSE_TRANSACTION'");
    expect(source).toContain('state_transition_logs');
  });

  it('uses idempotency records and preserves retry result', () => {
    expect(source).toContain("operation_type='REVERSE_TRANSACTION'");
    expect(source).toContain("status='COMPLETED'");
    expect(source).toContain('loadReversalResult');
    expect(source).toContain("throw new Error('IDEMPOTENCY_KEY_REUSED')");
  });

  it('protects closing and closed cycles', () => {
    expect(source).toContain("['CLOSING','CLOSED']");
    expect(source).toContain("c.status in ('CLOSING','CLOSED')");
  });

  it('blocks generic reversal for specialized transaction types', () => {
    expect(source).toContain("new Set<TransactionType>(['INCOME', 'EXPENSE'])");
    expect(source).toContain("throw new Error('REVERSAL_HANDLER_REQUIRED')");
  });

  it('reports derived impact instead of mutating stored balances', () => {
    expect(source).toContain('account_balances_v');
    expect(source).toContain("x.status='POSTED'");
    expect(source).toContain("safeToSpendStatus: 'BUFFER_POLICY_REQUIRED'");
    expect(source).toContain("? (actualMoney.compare(plannedMoney) === 1 ? 'OVER_BUDGET' : 'NORMAL')");
  });
});
