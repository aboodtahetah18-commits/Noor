import { describe, expect, it } from 'vitest';
import { calculateAffordableRecoveryRecommendation } from '@/features/internal-funding/services/recommend-affordable-recovery';

describe('internal funding affordability',()=>{
  it('adds ten percent growth exactly and keeps repayment inside the requested and safe caps',()=>{
    const r=calculateAffordableRecoveryRecommendation({approvedAmount:'1000.00',requestedMonthlyCap:'150.00',safeMonthlyCapacity:'120.00'});
    expect(r.totalRepayment).toBe('1100.00');
    expect(r.recoveryCycleCount).toBe(10);
    expect(r.recommendedMonthlyRepayment).toBe('110.00');
    expect(r.feasible).toBe(true);
  });

  it('blocks financing that would require more than 36 safe cycles',()=>{
    const r=calculateAffordableRecoveryRecommendation({approvedAmount:'5000.00',requestedMonthlyCap:'100.00',safeMonthlyCapacity:'100.00'});
    expect(r.recoveryCycleCount).toBeGreaterThan(36);
    expect(r.feasible).toBe(false);
  });
});
