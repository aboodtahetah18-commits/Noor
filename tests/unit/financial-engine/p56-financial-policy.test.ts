import { describe, expect, it } from 'vitest';
import { Money } from '@/financial-engine/money';
import { resolveBudgetCategoryStatus } from '@/financial-engine/budget-risk';
import { calculateFinancialHealth } from '@/financial-engine/financial-health';
import { rankGoalsForSuggestion } from '@/financial-engine/goal-allocation-policy';
import { calculateEmergencyCoverage } from '@/financial-engine/emergency-coverage';

describe('P56 finalized financial policy', () => {
  it('uses linear pace for AT_RISK and keeps OVER_BUDGET authoritative', () => {
    expect(resolveBudgetCategoryStatus({actualMinorUnits:30000n,budgetMinorUnits:100000n,daysElapsed:5,cycleDays:30})).toBe('AT_RISK');
    expect(resolveBudgetCategoryStatus({actualMinorUnits:110000n,budgetMinorUnits:100000n,daysElapsed:5,cycleDays:30})).toBe('OVER_BUDGET');
  });

  it('calculates health as an equal average of available dimensions', () => {
    const result = calculateFinancialHealth({ expectedDeficit:'0.00', budgetUtilizationPercent:'100', plannedSaving:'1000', actualSaving:'1000', emergencyProgressPercent:'50', overdueObligations:0, unplannedExpensePercent:'0', activeGoals:2, unrealisticGoals:0 });
    expect(result.score).toBe(93);
    expect(result.status).toBe('EXCELLENT');
    expect(result.method).toBe('EQUAL_AVERAGE_AVAILABLE_DIMENSIONS');
  });

  it('never automatically allocates money between goals', () => {
    const result = rankGoalsForSuggestion([{id:'b',priority:2,targetDate:'2027-01-01'},{id:'a',priority:1,targetDate:'2028-01-01'}]);
    expect(result.orderedGoalIds).toEqual(['a','b']);
    expect(result.automaticAllocation).toBe(false);
  });

  it('keeps emergency target owner-defined and reports informational coverage', () => {
    const result = calculateEmergencyCoverage(Money.parse('12000'), Money.parse('3000'));
    expect(result.coverageMonths).toBe('4.00');
    expect(result.targetPolicy).toBe('USER_DEFINED_AMOUNT');
  });
});
