import { describe, expect, it } from 'vitest';
import { transactionHistoryFiltersSchema } from '@/features/transactions/schemas/transaction-history';

describe('transaction history filters', () => {
  it('defaults pagination and sorting', () => {
    const value = transactionHistoryFiltersSchema.parse({});
    expect(value.page).toBe(1);
    expect(value.pageSize).toBe(25);
    expect(value.sort).toBe('DATE_DESC');
  });
  it('caps page size at 100', () => {
    expect(() => transactionHistoryFiltersSchema.parse({ pageSize: 101 })).toThrow();
  });
  it('rejects invalid date ranges', () => {
    expect(() => transactionHistoryFiltersSchema.parse({ dateFrom:'2026-09-10', dateTo:'2026-09-01' })).toThrow();
  });
});
