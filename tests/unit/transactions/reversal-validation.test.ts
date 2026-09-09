import { describe, expect, it } from 'vitest';
import { reverseTransactionSchema } from '@/features/transactions/schemas/reversal';
import { canTransition } from '@/state-machines';

describe('transaction reversal contract', () => {
  it('requires a documented reason and idempotency key', () => {
    expect(reverseTransactionSchema.safeParse({
      transactionId: '11111111-1111-4111-8111-111111111111',
      reason: 'تصحيح عملية مسجلة بالخطأ',
      idempotencyKey: 'reverse-12345678',
    }).success).toBe(true);
  });

  it('rejects an empty reason', () => {
    expect(reverseTransactionSchema.safeParse({
      transactionId: '11111111-1111-4111-8111-111111111111',
      reason: '',
      idempotencyKey: 'reverse-12345678',
    }).success).toBe(false);
  });

  it('allows POSTED -> REVERSED and forbids REVERSED -> POSTED', () => {
    expect(canTransition('TRANSACTION', 'POSTED', 'REVERSE_TRANSACTION')).toBe(true);
    expect(canTransition('TRANSACTION', 'REVERSED', 'POST_TRANSACTION')).toBe(false);
  });
});
