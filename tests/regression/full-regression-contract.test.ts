import { existsSync, readFileSync } from 'node:fs';
import { DeterministicForecastEngine } from '@/forecast/deterministic-forecast-engine';
import { describe, expect, it } from 'vitest';

const required = [
  'tests/unit/financial-engine/money.test.ts',
  'tests/unit/financial-engine/core-calculations.test.ts',
  'tests/unit/state-machines/workflow-state-machine.test.ts',
  'tests/integration/income-slice-contract.test.ts',
  'tests/integration/expense-slice-contract.test.ts',
  'tests/integration/transaction-reversal-contract.test.ts',
  'tests/integration/transfer.test.ts',
  'tests/integration/refund-contract.test.ts',
  'tests/integration/obligation-slice-contract.test.ts',
  'tests/integration/savings-slice-contract.test.ts',
  'tests/integration/goals-slice-contract.test.ts',
  'tests/integration/cycle-closing-contract.test.ts',
  'tests/security/security-hardening-contract.test.ts',
  'tests/accessibility/accessibility-audit-contract.test.ts',
  'tests/integration/mobile-hardening-contract.test.ts',
  'tests/unit/tablet/tablet-hardening-contract.test.ts',
  'tests/unit/desktop/desktop-hardening-contract.test.ts',
  'tests/rtl-audit-contract.test.ts',
  'tests/database/migration-contract.test.ts',
];

describe('full product regression contract', () => {
  it('keeps regression coverage for every critical layer', () => {
    for (const file of required) expect(existsSync(file), file).toBe(true);
  });

  it('keeps the deterministic current-cycle forecast behavior and requires an explicit closing buffer policy', () => {
    const result = new DeterministicForecastEngine().forecast({
      cycleId: 'regression-cycle',
      asOfDate: '2026-09-08',
      currentLiquidity: '1000.00',
      actualSpending: '100.00',
      daysElapsed: 10,
      remainingDays: 10,
      upcomingObligations: '200.00',
      expectedEssentialSpending: '100.00',
      historicalPatterns: [{ cycleId: 'history', actualSpending: '9000.00', cycleDays: 30 }],
    });
    expect(result.status).toBe('FINALIZED');
    expect(result.projectedEndBalance).toBe('600.00');
    expect(result.expectedDeficit).toBe('0.00');

    const closing = readFileSync('src/features/cycles/services/cycle-closing-service.ts', 'utf8');
    expect(closing).toContain('getActiveFinancialBufferPolicy');
    expect(closing).toContain('BUFFER_POLICY_REQUIRED');
  });

  it('keeps transaction history paginated', () => {
    const schema = readFileSync('src/features/transactions/schemas/transaction-history.ts', 'utf8');
    expect(schema).toContain('pageSize');
    expect(schema).toContain('100');
  });
});
