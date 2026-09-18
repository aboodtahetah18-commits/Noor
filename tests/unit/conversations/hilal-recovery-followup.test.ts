import { describe, expect, it } from 'vitest';
import {
  hasMeaningfulHilalRecoveryChange,
  type HilalRecoveryFollowupSnapshot,
} from '@/lib/conversations/hilal-recovery-followup';

function snapshot(overrides: Partial<HilalRecoveryFollowupSnapshot> = {}): HilalRecoveryFollowupSnapshot {
  return {
    case_id: 'case-1',
    case_title: 'تمويل الوقود',
    category_id: 'cat-1',
    category_name: 'وقود',
    trigger: 'PAYMENT_RECORDED',
    outstanding_exposure: 4000,
    overdue_installment_count: 0,
    overdue_planned_amount: 0,
    financing_frequency: 2,
    repayment_capacity: 12000,
    policy_cap: null,
    policy_cap_status: 'NUMERIC_CALIBRATION_REQUIRED',
    hard_stop: false,
    hard_stop_reason: null,
    refreshed_at: '2026-09-18T00:00:00.000Z',
    ...overrides,
  };
}

describe('Hilal recovery follow-up changes', () => {
  it('detects exposure reduction after repayment', () => {
    const previous = snapshot({ outstanding_exposure: 5000 });
    expect(hasMeaningfulHilalRecoveryChange(previous, snapshot({ outstanding_exposure: 4000 }))).toBe(true);
  });

  it('detects a newly overdue recovery hard stop', () => {
    const previous = snapshot();
    const next = snapshot({
      overdue_installment_count: 1,
      overdue_planned_amount: 700,
      hard_stop: true,
      hard_stop_reason: 'OVERDUE_REPAYMENT',
      policy_cap: 0,
      policy_cap_status: 'HARD_STOP_OVERDUE',
    });
    expect(hasMeaningfulHilalRecoveryChange(previous, next)).toBe(true);
  });

  it('does not create duplicate follow-up messages when only refresh time changes', () => {
    const previous = snapshot({ refreshed_at: '2026-09-17T00:00:00.000Z' });
    const next = snapshot({ refreshed_at: '2026-09-18T00:00:00.000Z' });
    expect(hasMeaningfulHilalRecoveryChange(previous, next)).toBe(false);
  });
});
