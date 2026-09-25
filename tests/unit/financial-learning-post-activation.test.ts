import { describe, expect, it } from 'vitest';
import { evaluateFinancialLearningPostActivation } from '../../src/lib/finance/financial-learning-post-activation';

const row=(cycleId:string,plannedExpense:number,actualExpense:number)=>({
  cycleId,
  plannedExpense,
  actualExpense,
  plannedSaving:1000,
  actualSaving:1000,
  expectedIncome:8000,
  actualIncome:8000,
});

describe('مراقبة التعلم بعد التفعيل',()=>{
  it('لا يحكم على المعايرة قبل اكتمال دورتين جديدتين',()=>{
    const result=evaluateFinancialLearningPostActivation({
      rows:[row('c1',4000,4400)],
      kind:'EXPENSE_BASELINE',
      activeFactor:1.1,
    });
    expect(result.state).toBe('INSUFFICIENT_DATA');
  });

  it('يرصد تحسن المعايرة على الدورات الجديدة',()=>{
    const result=evaluateFinancialLearningPostActivation({
      rows:[
        row('c1',4000,4400),
        row('c2',4000,4450),
        row('c3',4000,4420),
      ],
      kind:'EXPENSE_BASELINE',
      activeFactor:1.1,
    });
    expect(result.state).toBe('IMPROVED');
    expect(result.activeMaePercent!).toBeLessThan(result.baselineMaePercent!);
  });

  it('يفتح مراجعة تراجع إذا زاد الخطأ بأكثر من الحد',()=>{
    const result=evaluateFinancialLearningPostActivation({
      rows:[
        row('c1',4000,4000),
        row('c2',4000,4050),
        row('c3',4000,3980),
      ],
      kind:'EXPENSE_BASELINE',
      activeFactor:1.25,
      rollbackReviewThresholdPercent:10,
    });
    expect(result.state).toBe('ROLLBACK_REVIEW_REQUIRED');
    expect(result.activeMaePercent!).toBeGreaterThan(result.baselineMaePercent!);
  });

  it('لا يتراجع تلقائيًا عند تدهور بسيط دون الحد',()=>{
    const result=evaluateFinancialLearningPostActivation({
      rows:[
        row('c1',4000,4100),
        row('c2',4000,4120),
      ],
      kind:'EXPENSE_BASELINE',
      activeFactor:1.04,
      rollbackReviewThresholdPercent:50,
    });
    expect(result.state).not.toBe('ROLLBACK_REVIEW_REQUIRED');
  });
});
