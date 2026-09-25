import { describe, expect, it } from 'vitest';
import {
  buildFinancialLearningProfile,
  type CycleLearningRow,
} from '../../src/lib/finance/financial-continuous-learning-engine';

function row(id:string,overrides:Partial<CycleLearningRow>={}):CycleLearningRow{
  return {
    cycleId:id,
    expectedIncome:8000,
    actualIncome:8000,
    plannedExpense:4000,
    actualExpense:4000,
    plannedSaving:1000,
    actualSaving:1000,
    projectedEndBalance:2000,
    actualEndBalance:2000,
    ...overrides,
  };
}

describe('التعلم المالي المستمر',()=>{
  it('لا يقترح تعلمًا قبل ثلاث دورات',()=>{
    const profile=buildFinancialLearningProfile([
      row('c1',{actualExpense:4400}),
      row('c2',{actualExpense:4500}),
    ]);
    expect(profile.cyclesAnalyzed).toBe(2);
    expect(profile.proposals).toHaveLength(0);
    expect(profile.safeguards.autoApply).toBe(false);
    expect(profile.safeguards.hardRulesMutable).toBe(false);
  });

  it('يقترح مراجعة خط الأساس عند تجاوز المصروف بصورة متكررة',()=>{
    const profile=buildFinancialLearningProfile([
      row('c1',{actualExpense:4500}),
      row('c2',{actualExpense:4600}),
      row('c3',{actualExpense:4400}),
      row('c4',{actualExpense:4550}),
    ]);
    const proposal=profile.proposals.find(item=>item.kind==='EXPENSE_BASELINE');
    expect(proposal).toBeDefined();
    expect(proposal?.autoApply).toBe(false);
    expect(proposal?.confidence).toBeGreaterThanOrEqual(55);
    expect(proposal?.proposedAdjustment).toBeGreaterThan(1);
  });

  it('يتعلم من الادخار دون تعديل التوقع تلقائيًا',()=>{
    const profile=buildFinancialLearningProfile([
      row('c1',{actualSaving:700}),
      row('c2',{actualSaving:680}),
      row('c3',{actualSaving:720}),
    ]);
    const proposal=profile.proposals.find(item=>item.kind==='SAVING_EXPECTATION');
    expect(proposal?.proposedAdjustment).toBeLessThan(1);
    expect(proposal?.status).toBe('PROPOSED');
    expect(profile.safeguards.requiresReview).toBe(true);
  });

  it('يرصد ضعف دقة توقع نهاية الدورة عبر عدة دورات',()=>{
    const profile=buildFinancialLearningProfile([
      row('c1',{projectedEndBalance:2200,actualEndBalance:1000}),
      row('c2',{projectedEndBalance:2400,actualEndBalance:900}),
      row('c3',{projectedEndBalance:2100,actualEndBalance:950}),
    ]);
    const proposal=profile.proposals.find(item=>item.kind==='FORECAST_CALIBRATION');
    expect(proposal).toBeDefined();
    expect(proposal?.unit).toBe('PERCENT');
    expect(proposal?.proposedAdjustment).toBeNull();
  });
});
