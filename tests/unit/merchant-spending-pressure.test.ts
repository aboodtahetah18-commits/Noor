import { describe, expect, it } from 'vitest';
import { assessMerchantSpending } from '@/financial-engine/merchant-spending-pressure';

describe('merchant spending pressure from verified ledger totals', () => {
  it('reports an exact increase without labeling the merchant itself insolvent or wasteful', () => {
    const signal=assessMerchantSpending({
      currentAmount:'18000.00',previousAmount:'10000.00',
      currentTransactionCount:8,categoryBudgetStatus:'AT_RISK',
    });
    expect(signal.changePercent).toBe('+80.00');
    expect(signal.trend).toBe('INCREASED');
    expect(signal.pressure).toBe('CATEGORY_AT_RISK');
    expect(signal.evidence).toBe('MATCHED_POSTED_TRANSACTIONS');
  });

  it('does not invent growth when the previous period has no baseline', () => {
    const signal=assessMerchantSpending({
      currentAmount:'1000.00',previousAmount:'0.00',
      currentTransactionCount:1,categoryBudgetStatus:null,
    });
    expect(signal.changePercent).toBeNull();
    expect(signal.trend).toBe('NO_BASELINE');
    expect(signal.pressure).toBe('NO_VERIFIED_PRESSURE');
  });

  it('records a decreasing trend with no spurious pressure classification', () => {
    const signal=assessMerchantSpending({
      currentAmount:'750.00',previousAmount:'1000.00',
      currentTransactionCount:2,categoryBudgetStatus:'NORMAL',
    });
    expect(signal.changePercent).toBe('-25.00');
    expect(signal.trend).toBe('DECREASED');
    expect(signal.pressure).toBe('NO_VERIFIED_PRESSURE');
  });

  it('does not attribute a category budget breach to a net refund-only merchant period', () => {
    const signal=assessMerchantSpending({
      currentAmount:'-300.00',previousAmount:'100.00',
      currentTransactionCount:0,categoryBudgetStatus:'OVER_BUDGET',
    });
    expect(signal.currentAmount).toBe('-300.00');
    expect(signal.pressure).toBe('NO_VERIFIED_PRESSURE');
  });

  it('handles very large exact decimal amounts without floating-point errors', () => {
    const signal=assessMerchantSpending({
      currentAmount:'99999999999999.99',previousAmount:'50000000000000.00',
      currentTransactionCount:3,categoryBudgetStatus:'OVER_BUDGET',
    });
    expect(signal.changePercent).toBe('+100.00');
    expect(signal.pressure).toBe('CATEGORY_OVER_BUDGET');
  });

  it('rejects invalid transaction counts', () => {
    expect(()=>assessMerchantSpending({
      currentAmount:'2.00',previousAmount:'1.00',
      currentTransactionCount:-1,categoryBudgetStatus:null,
    })).toThrow('MERCHANT_SPEND_INVALID_TRANSACTION_COUNT');
  });
});
