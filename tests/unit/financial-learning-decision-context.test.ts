import { describe, expect, it } from 'vitest';
import {
  buildFinancialDecisionLearningContextFromTimeline,
  financialLearningDomainForRole,
} from '../../src/lib/finance/financial-learning-decision-context';
import type { FinancialLearningTimeline } from '../../src/lib/finance/financial-learning-timeline';

function timeline(outcome:'IMPROVED'|'ROLLED_BACK'|'REVIEW_REQUIRED'):FinancialLearningTimeline{
  return {
    generatedAt:'2026-09-25T10:00:00.000Z',
    summary:{
      algorithmsLearned:1,
      active:outcome==='IMPROVED'?1:0,
      improved:outcome==='IMPROVED'?1:0,
      rollbackReviewRequired:outcome==='REVIEW_REQUIRED'?1:0,
      rolledBack:outcome==='ROLLED_BACK'?1:0,
      rejected:0,
    },
    entries:[],
    algorithms:[{
      algorithmKey:'expense-baseline-calibration',
      algorithmName:'خوارزمية خط أساس المصروفات',
      kind:'EXPENSE_BASELINE',
      parameterKey:'forecast.expenseBaselineFactor',
      currentStatus:outcome==='ROLLED_BACK'?'ROLLED_BACK':'ACTIVE',
      learnedWhat:'الإنفاق الفعلي أعلى من الخطة بصورة متكررة.',
      sourceCycleIds:['c1','c2','c3','c4'],
      confidence:84,
      proposedValue:1.1,
      currentOutcome:outcome,
      entries:[{
        id:'e1',
        algorithmKey:'expense-baseline-calibration',
        algorithmName:'خوارزمية خط أساس المصروفات',
        kind:'EXPENSE_BASELINE',
        parameterKey:'forecast.expenseBaselineFactor',
        ownerBank:'hilal',
        at:'2026-09-25T09:00:00.000Z',
        phase:'MONITORING',
        action:'POST_ACTIVATION_EVALUATION',
        title:'تقييم الأداء بعد التفعيل',
        learnedWhat:'الإنفاق الفعلي أعلى من الخطة بصورة متكررة.',
        why:'اختبار الأداء بعد التفعيل.',
        sourceCycleIds:['c1','c2','c3','c4'],
        evidence:['أربع دورات مرجعية'],
        confidence:84,
        proposedValue:1.1,
        previousValue:1,
        resultingValue:1.1,
        baselineErrorPercent:10,
        candidateErrorPercent:3,
        improvementPercent:70,
        monitoringState:outcome==='REVIEW_REQUIRED'?'ROLLBACK_REVIEW_REQUIRED':outcome==='IMPROVED'?'IMPROVED':null,
        outcome,
      }],
    }],
  };
}

describe('سياق ذاكرة التعلم للقرار',()=>{
  it('يربط مسؤول الميزانية بمجال تعلم الإنفاق',()=>{
    expect(financialLearningDomainForRole('budget-spending-owner')).toBe('budget_spending');
    expect(financialLearningDomainForRole('investment-owner')).toBe('investment');
  });

  it('يستخدم التعلم الذي تحسن فعليًا كدليل مساعد للقرار',()=>{
    const context=buildFinancialDecisionLearningContextFromTimeline(timeline('IMPROVED'),'budget_spending');
    expect(context?.decisionUse).toBe('SUPPORT');
    expect(context?.sourceCycleIds).toHaveLength(4);
    expect(context?.shortText).toContain('تحسن فعلي');
  });

  it('يعامل التراجع كسابقة تحذيرية لا كقاعدة قرار',()=>{
    const context=buildFinancialDecisionLearningContextFromTimeline(timeline('ROLLED_BACK'),'budget_spending');
    expect(context?.decisionUse).toBe('CAUTION');
    expect(context?.shortText).toContain('تم التراجع');
  });

  it('يمنع الاعتماد المنفرد على معايرة تحت مراجعة تراجع',()=>{
    const context=buildFinancialDecisionLearningContextFromTimeline(timeline('REVIEW_REQUIRED'),'budget_spending');
    expect(context?.decisionUse).toBe('CAUTION');
    expect(context?.shortText).toContain('لن أعتمد عليها وحدها');
  });
});
