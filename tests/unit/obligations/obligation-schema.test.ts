import { describe, expect, it } from 'vitest';
import { createObligationTemplateSchema, payObligationSchema } from '@/features/obligations/schemas/obligation';

describe('Phase 17 obligation validation', () => {
  it('accepts a recurring template with a due date', () => {
    const result = createObligationTemplateSchema.safeParse({
      name: 'فاتورة الإنترنت', defaultAmount: '250.00', recurrence: 'MONTHLY', firstDueDate: '2026-09-10', idempotencyKey: 'obl-create-1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects zero amounts', () => {
    const result = createObligationTemplateSchema.safeParse({
      name: 'التزام', defaultAmount: '0.00', recurrence: 'ONCE', firstDueDate: '2026-09-10', idempotencyKey: 'obl-create-2',
    });
    expect(result.success).toBe(false);
  });

  it('requires payment identity, account, amount and date', () => {
    const result = payObligationSchema.safeParse({
      obligationOccurrenceId: '11111111-1111-4111-8111-111111111111',
      accountId: '22222222-2222-4222-8222-222222222222',
      amount: '250.00', transactionDate: '2026-09-10', idempotencyKey: 'obl-pay-1',
    });
    expect(result.success).toBe(true);
  });
});
