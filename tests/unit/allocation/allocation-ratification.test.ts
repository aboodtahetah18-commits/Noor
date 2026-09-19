import { describe, expect, it } from 'vitest';
import { isExplicitAllocationRatification, isExplicitAllocationRejection } from '@/lib/allocation/allocation-ratification';

describe('allocation ratification commands',()=>{
  it('requires an explicit allocation approval phrase',()=>{
    expect(isExplicitAllocationRatification('اعتماد التوزيع')).toBe(true);
    expect(isExplicitAllocationRatification('موافق على التوزيع')).toBe(true);
    expect(isExplicitAllocationRatification('موافق')).toBe(false);
    expect(isExplicitAllocationRatification('تمام')).toBe(false);
  });
  it('recognizes an explicit rejection without confusing general disagreement',()=>{
    expect(isExplicitAllocationRejection('رفض التوزيع')).toBe(true);
    expect(isExplicitAllocationRejection('لا أوافق على التوزيع')).toBe(true);
    expect(isExplicitAllocationRejection('لا')).toBe(false);
  });
});
