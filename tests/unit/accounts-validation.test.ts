import { describe, expect, it } from 'vitest';
import { createAccountSchema } from '@/features/accounts/schemas/account';

const valid = { name: 'الحساب الجاري', accountType: 'BANK', openingBalance: '8200.00', effectiveDate: '2026-09-02' };

describe('accounts validation', () => {
  it('accepts a valid account setup payload', () => {
    expect(createAccountSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects negative or floating-ambiguous opening balances', () => {
    expect(createAccountSchema.safeParse({ ...valid, openingBalance: '-1' }).success).toBe(false);
    expect(createAccountSchema.safeParse({ ...valid, openingBalance: '0.001' }).success).toBe(false);
  });

  it('rejects unsupported account types', () => {
    expect(createAccountSchema.safeParse({ ...valid, accountType: 'CREDIT_CARD' }).success).toBe(false);
  });
});
