import { describe, expect, it } from 'vitest';
import {
  composeFinancialDecisionExplanation,
  type FinancialDecisionExplanation,
} from '../../src/lib/finance/financial-decision-explanation';
import type { FinancialDecisionLearningContext } from '../../src/lib/finance/financial-learning-decision-context';

const current:FinancialDecisionExplanation['current']={
  label:'المتاح الحقيقي',
  value:'1,500 ر.س',
  secondary:['استخدام الخطة 82٪'],
  source:'personal-budget-calculation-engine',
};

const memory:FinancialDecisionExplanation['memory']={
  summary:'المستخدم أوضح سابقًا أن ارتفاع المطاعم كان مؤقتًا في عطلة نهاية الأسبوع.',
  at:'2026-09-20T10:00:00.000Z',
  source:'conversation',
};

const learning:FinancialDecisionLearningContext={
  domain:'budget_spending',
  algorithmKey:'expense-baseline-calibration',
  algorithmName:'خوارزمية خط أساس المصروفات',
  kind:'EXPENSE_BASELINE',
  outcome:'IMPROVED',
  learnedWhat:'الإنفاق الفعلي أعلى من الخطة بصورة متكررة.',
  sourceCycleIds:['c1','c2','c3'],
  confidence:84,
  proposedValue:1.1,
  lastEventAt:'2026-09-24T10:00:00.000Z',
  decisionUse:'SUPPORT',
  shortText:'سجل التعلم يدعم هذه القراءة بعد تحسن فعلي.',
};

describe('طبقة تفسير القرار المالي',()=>{
  it('تجمع الرقم والقاعدة والذاكرة والتعلم في تفسير واحد',()=>{
    const result=composeFinancialDecisionExplanation('budget_spending',current,memory,learning);
    expect(result.current.label).toBe('المتاح الحقيقي');
    expect(result.rule.code).toBe('RULE-BUDGET-TRUE-AVAILABLE');
    expect(result.memory.summary).toContain('عطلة نهاية الأسبوع');
    expect(result.learning?.decisionUse).toBe('SUPPORT');
    expect(result.why).toContain('اخترت هذه القراءة');
  });

  it('لا تسمح للتعلم بتجاوز الحقائق الحالية أو القواعد الصارمة',()=>{
    const result=composeFinancialDecisionExplanation('investment',current,{summary:null,at:null,source:'none'},null);
    expect(result.guardrails.externalExecution).toBe(false);
    expect(result.guardrails.hardRulesOverride).toBe(false);
    expect(result.guardrails.learningCanOverrideCurrentFacts).toBe(false);
    expect(result.rule.code).toBe('RULE-INVEST-SURPLUS-ONLY');
  });

  it('يتعامل مع غياب الذاكرة والتعلم دون اختراع سياق',()=>{
    const result=composeFinancialDecisionExplanation('goals',current,{summary:null,at:null,source:'none'},null);
    expect(result.why).toContain('لا يوجد سياق سابق موثق');
    expect(result.why).toContain('لا يوجد تعلم خوارزمي سابق');
  });

  it('يحوّل التعلم التحذيري إلى حذر لا إلى دعم',()=>{
    const caution={...learning,decisionUse:'CAUTION' as const,outcome:'REVIEW_REQUIRED' as const,shortText:'المعايرة تحت مراجعة تراجع.'};
    const result=composeFinancialDecisionExplanation('budget_spending',current,memory,caution);
    expect(result.why).toContain('يفرض الحذر');
  });
});
