import { describe, expect, it } from 'vitest';
import { parseGoalDraft } from '@/lib/conversations/asset-goal-engine';

describe('assets chat goal draft parser', () => {
  it('collects goal amount date and protected funding source', () => {
    const draft = parseGoalDraft('هدفي سيارة 30000 ريال بتاريخ 2026-12-15 من السيولة الحالية');
    expect(draft).toMatchObject({
      name: 'سيارة',
      target_amount: 30000,
      target_date: '2026-12-15',
      funding_source: 'PROTECTED_POOL',
    });
  });

  it('can complete a draft over multiple messages', () => {
    const first = parseGoalDraft('هدفي سفر 8000 ريال');
    const completed = parseGoalDraft('بتاريخ 2026/11/20 من دخل قادم', first);
    expect(completed).toMatchObject({
      name: 'سفر',
      target_amount: 8000,
      target_date: '2026-11-20',
      funding_source: 'EXTERNAL_UNPROTECTED',
    });
  });

  it('does not treat a future external income as protected liquidity', () => {
    const draft = parseGoalDraft('هدف منزل 100000 ريال بتاريخ 2027-06-01 من مصدر خارجي');
    expect(draft.funding_source).toBe('EXTERNAL_UNPROTECTED');
  });
});
