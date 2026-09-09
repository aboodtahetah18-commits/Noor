import { describe, expect, it } from 'vitest';
import { canTransition } from '@/state-machines';
import { readFileSync } from 'node:fs';

describe('Cycle closing contract', () => {
  it('supports only the documented cycle closing transitions', () => {
    expect(canTransition('FINANCIAL_CYCLE', 'ACTIVE', 'START_CLOSING')).toBe(true);
    expect(canTransition('FINANCIAL_CYCLE', 'CLOSING', 'COMPLETE_CLOSING')).toBe(true);
    expect(canTransition('FINANCIAL_CYCLE', 'DRAFT', 'COMPLETE_CLOSING')).toBe(false);
  });

  it('requires an active financial buffer policy before operational close', () => {
    const closing = readFileSync('src/features/cycles/services/cycle-closing-service.ts', 'utf8');
    expect(closing).toContain('getActiveFinancialBufferPolicy');
    expect(closing).toContain('BUFFER_POLICY_REQUIRED');
    expect(closing).toContain('FINAL_SAFE_TO_SPEND_AVAILABLE');
  });

  it('persists the finalized financial health score in the immutable cycle snapshot', () => {
    const rollover = readFileSync('src/features/cycles/services/cycle-rollover-service.ts', 'utf8');
    expect(rollover).toContain('calculateFinancialHealth');
    expect(rollover).toContain('financial_health_score');
    expect(rollover).toContain("source:'FINALIZED_FINANCIAL_SNAPSHOT'");
  });

});
