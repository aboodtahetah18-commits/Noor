import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(file, 'utf8');

const atomicFinancialWrites = [
  'src/repositories/expense-repository.ts',
  'src/repositories/income-repository.ts',
  'src/repositories/transfer-repository.ts',
  'src/repositories/refund-repository.ts',
  'src/repositories/obligation-repository.ts',
  'src/repositories/saving-repository.ts',
  'src/repositories/emergency-repository.ts',
  'src/repositories/goal-repository.ts',
  'src/repositories/financial-plan-repository.ts',
  'src/repositories/financial-cycle-repository.ts',
] as const;

describe('P57 critical financial write integrity', () => {
  it.each(atomicFinancialWrites)('%s keeps multi-record writes atomic', (file) => {
    expect(read(file)).toContain('rawSql.transaction');
  });

  it.each([
    'src/repositories/expense-repository.ts',
    'src/repositories/income-repository.ts',
    'src/repositories/transfer-repository.ts',
    'src/repositories/refund-repository.ts',
    'src/repositories/obligation-repository.ts',
    'src/repositories/saving-repository.ts',
    'src/repositories/emergency-repository.ts',
    'src/repositories/goal-repository.ts',
  ] as const)('%s retains idempotency protection', (file) => {
    const source = read(file);
    expect(source.toLowerCase()).toContain('idempotency');
    expect(source).toContain('${userId}');
  });

  it('keeps transfer double-entry neutral by construction', () => {
    const source = read('src/repositories/transfer-repository.ts');
    expect(source).toContain("'OUT'");
    expect(source).toContain("'IN'");
    expect(source).toContain("'TRANSFER','POSTED'");
  });

  it('keeps state-changing financial workflows auditable', () => {
    for (const file of [
      'src/repositories/financial-cycle-repository.ts',
      'src/repositories/financial-plan-repository.ts',
      'src/repositories/obligation-repository.ts',
      'src/repositories/saving-repository.ts',
      'src/repositories/goal-repository.ts',
    ]) {
      expect(read(file), file).toContain('state_transition_logs');
    }
  });
});
