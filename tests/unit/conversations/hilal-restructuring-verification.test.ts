import { describe, expect, it } from 'vitest';
import {
  isHilalExecutionEvidenceIntent,
  parseHilalExecutionEvidence,
} from '@/lib/conversations/hilal-restructuring-verification';

describe('Hilal human execution evidence parsing', () => {
  it('extracts reference, amount, date, and account from Arabic evidence text', () => {
    const evidence = parseHilalExecutionEvidence(
      'تم التنفيذ، رقم المرجع ABC-7788، المبلغ ١٢٠٠ ريال، بتاريخ 2026-09-18، من حساب الراجحي الجاري',
    );
    expect(evidence).toMatchObject({
      reference: 'ABC-7788',
      amount: 1200,
      date: '2026-09-18',
      account_ref: 'الراجحي الجاري',
      statement_row_id: null,
    });
  });

  it('accepts a canonical bank-statement row id as strong evidence selector', () => {
    const evidence = parseHilalExecutionEvidence(
      'إثبات التنفيذ، صف الكشف: 11111111-1111-4111-8111-111111111111',
    );
    expect(evidence.statement_row_id).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('recognizes execution evidence intent without treating ordinary financing text as evidence', () => {
    expect(isHilalExecutionEvidenceIntent('سددت القسط ورقم المرجع PAY-55')).toBe(true);
    expect(isHilalExecutionEvidenceIntent('أحتاج تمويل 5000 ريال')).toBe(false);
  });
});
