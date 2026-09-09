import { describe, expect, it } from 'vitest';
import { Money } from '@/financial-engine/money';
import { calculateCategoryRemaining, calculateCategoryUtilization } from '@/financial-engine/category';
describe('expense category calculations',()=>{
 it('preserves over-budget actual and negative remaining',()=>{const planned=Money.parse('500');const actual=Money.parse('600');expect(calculateCategoryRemaining(planned,actual).toString()).toBe('-100.00');expect(calculateCategoryUtilization(planned,actual).ratio?.percent).toBe('120.00');});
 it('does not divide by zero',()=>{const r=calculateCategoryUtilization(Money.zero(),Money.parse('10'));expect(r.ratio).toBeNull();expect(r.hasSpendAgainstZeroBudget).toBe(true);});
});
