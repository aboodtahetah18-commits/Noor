import { describe, expect, it } from 'vitest';
import { parseFinancingDraft } from '@/lib/conversations/hilal-financing-engine';

describe('Hilal financing draft parser', () => {
  it('collects purpose amount and expected installment', () => {
    const draft = parseFinancingDraft('تمويل سيارة بمبلغ 40000 ريال، القسط المتوقع 1800 ريال');
    expect(draft).toMatchObject({
      purpose: 'سيارة بمبلغ',
      requested_amount: 40000,
      expected_installment: 1800,
    });
  });

  it('completes a financing study over multiple messages', () => {
    const first = parseFinancingDraft('أحتاج تمويل 25000 ريال لأجل ترميم المنزل');
    const completed = parseFinancingDraft('القسط الشهري 1200 ريال لمدة 24 شهر', first);
    expect(completed.requested_amount).toBe(25000);
    expect(completed.expected_installment).toBe(1200);
    expect(completed.repayment_cycles).toBe(24);
  });

  it('normalizes Arabic digits', () => {
    const draft = parseFinancingDraft('تمويل سيارة ٣٠٠٠٠ ريال والقسط ١٥٠٠ ريال');
    expect(draft.requested_amount).toBe(30000);
    expect(draft.expected_installment).toBe(1500);
  });

  it('collects repayment-source and policy evidence classifications over chat', () => {
    const first = parseFinancingDraft('مصدر السداد: الراتب الشهري');
    const second = parseFinancingDraft('الدخل ثابت ومنتظم', first);
    const completed = parseFinancingDraft('الغرض أساسي', second);
    expect(completed).toMatchObject({
      repayment_source: 'الراتب الشهري',
      income_pattern: 'STABLE',
      funded_item_importance: 'ESSENTIAL',
    });
  });
});
