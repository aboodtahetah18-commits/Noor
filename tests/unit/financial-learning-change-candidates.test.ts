import { describe, expect, it } from 'vitest';
import { buildFinancialLearningProfile, type CycleLearningRow } from '../../src/lib/finance/financial-continuous-learning-engine';
import { buildFinancialLearningChangeCandidates, reviewEligibleFinancialLearningCandidates } from '../../src/lib/finance/financial-learning-change-candidates';

function row(id:string,actualExpense:number):CycleLearningRow{
  return {
    cycleId:id,
    expectedIncome:8000,
    actualIncome:8000,
    plannedExpense:4000,
    actualExpense,
    plannedSaving:1000,
    actualSaving:1000,
    projectedEndBalance:2000,
    actualEndBalance:2000,
  };
}

describe('مرشحات تغييرات التعلم المالي',()=>{
  it('لا يجعل أي مقترح قابلًا للمراجعة إذا فشل الاختبار الخلفي',()=>{
    const profile=buildFinancialLearningProfile([
      row('c1',2000),
      row('c2',6000),
      row('c3',4000),
      row('c4',6500),
    ]);
    const candidates=buildFinancialLearningChangeCandidates(profile);
    expect(candidates.some(item=>item.status==='ELIGIBLE_FOR_REVIEW')).toBe(false);
  });

  it('يعرض قبل وبعد ويمنع التطبيق التلقائي للمرشح الناجح',()=>{
    const profile=buildFinancialLearningProfile([
      row('c1',4400),
      row('c2',4500),
      row('c3',4480),
      row('c4',4520),
    ]);
    const eligible=reviewEligibleFinancialLearningCandidates(profile);
    expect(eligible.length).toBeGreaterThan(0);
    expect(eligible[0]?.before.meanAbsoluteErrorPercent).not.toBeNull();
    expect(eligible[0]?.after.meanAbsoluteErrorPercent).not.toBeNull();
    expect(eligible[0]?.safeguards.autoApply).toBe(false);
    expect(eligible[0]?.safeguards.requiresReview).toBe(true);
    expect(eligible[0]?.parameterKey).toBe('forecast.expenseBaselineFactor');
  });
});
