import {describe,expect,it} from 'vitest';
import {smartAllocate,predictiveCashFlow,dynamicRebalance} from '../../src/features/bank-governance/smart-financial-allocation';

describe('governed financial allocation',()=>{
  it('prioritizes operations then protected reserve before investing',()=>{
    const p=smartAllocate({incomeHalalas:100000,operatingNeedHalalas:50000,operatingCashHalalas:10000,reserveCashHalalas:10000,protectedReserveHalalas:50000,reserveTargetHalalas:70000});
    expect(p.allocations).toEqual({OPERATIONS:40000,RESERVE:60000,INVESTMENTS:0});
    expect(p.requiresApproval).toBe(true);
  });
  it('invests only verified surplus and preserves exact halala total',()=>{
    const p=smartAllocate({incomeHalalas:100000,operatingNeedHalalas:20000,operatingCashHalalas:10000,reserveCashHalalas:60000,protectedReserveHalalas:50000,reserveTargetHalalas:70000});
    expect(p.allocations).toEqual({OPERATIONS:10000,RESERVE:10000,INVESTMENTS:80000});
  });
  it('does not invest while the safety reserve is still short',()=>{
    expect(dynamicRebalance({incomingSurplusHalalas:30000,reserveCashHalalas:1000,protectedReserveHalalas:50000,reserveTargetHalalas:50000,proposedInvestmentHalalas:30000})).toMatchObject({reserveReplenishmentHalalas:30000,investmentAllocationHalalas:0,reserveBelowSafetyFloor:true,requiresApproval:true});
  });
  it('forecasts shortfalls from three-month weighted spending',()=>{
    const f=predictiveCashFlow({history:[{incomeHalalas:10000,spendingHalalas:10000},{incomeHalalas:10000,spendingHalalas:20000},{incomeHalalas:10000,spendingHalalas:30000}],currentOperatingCashHalalas:10000,expectedMonthlyIncomeHalalas:10000,knownNextMonthObligationsHalalas:5000,operatingSafetyFloorHalalas:10000});
    expect(f.estimatedMonthlySpendingHalalas).toBe(23333);
    expect(f.likelyLiquidityShortfallHalalas).toBe(18333);
    expect(f.confidence).toBe('MEDIUM');
    expect(f.requiresApproval).toBe(true);
  });
  it('returns low-confidence forecast with no historic data and rejects invalid money',()=>{
    expect(predictiveCashFlow({history:[],currentOperatingCashHalalas:100,expectedMonthlyIncomeHalalas:0,knownNextMonthObligationsHalalas:0,operatingSafetyFloorHalalas:0}).confidence).toBe('LOW');
    expect(()=>smartAllocate({incomeHalalas:-1,operatingNeedHalalas:0,operatingCashHalalas:0,reserveCashHalalas:0,protectedReserveHalalas:0,reserveTargetHalalas:0})).toThrow('INVALID_HALALAS');
  });
});
