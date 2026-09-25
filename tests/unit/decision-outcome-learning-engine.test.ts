import { describe, expect, it } from 'vitest';
import { buildDecisionOutcomeLearningProfile } from '../../src/lib/finance/decision-outcome-learning-engine';
import type { DecisionOutcomeRecord } from '../../src/lib/finance/decision-outcome-registry';

function outcome(id:string,quality:DecisionOutcomeRecord['quality']):DecisionOutcomeRecord{
  return {
    decisionId:id,
    source:'CONVERSATION',
    effect:quality==='POSITIVE'?'ACHIEVED':quality==='NEGATIVE'?'MISSED':'PARTIAL',
    quality,
    summary:'نتيجة مسجلة',
    assessedAt:'2026-09-25T10:00:00.000Z',
    assessor:'USER',
    evidence:[],
    changedAfterDecision:false,
    requiresReview:quality==='NEGATIVE',
  };
}

const metadata=[
  {decisionId:'conversation:1',domain:'budget_spending' as const,ruleCode:'RULE-BUDGET-TRUE-AVAILABLE',actorKey:'budget-spending-owner',action:'recommendation'},
  {decisionId:'conversation:2',domain:'budget_spending' as const,ruleCode:'RULE-BUDGET-TRUE-AVAILABLE',actorKey:'budget-spending-owner',action:'recommendation'},
  {decisionId:'conversation:3',domain:'budget_spending' as const,ruleCode:'RULE-BUDGET-TRUE-AVAILABLE',actorKey:'budget-spending-owner',action:'recommendation'},
];

describe('التعلم من نتائج القرارات',()=>{
  it('يدعم نوع التوصية بعد نتائج إيجابية متكررة',()=>{
    const profile=buildDecisionOutcomeLearningProfile(metadata,{
      'conversation:1':outcome('conversation:1','POSITIVE'),
      'conversation:2':outcome('conversation:2','POSITIVE'),
      'conversation:3':outcome('conversation:3','POSITIVE'),
    });
    expect(profile.assessedDecisions).toBe(3);
    expect(profile.patterns[0]?.stance).toBe('SUPPORT');
    expect(profile.patterns[0]?.positiveRate).toBe(1);
    expect(profile.safeguards.changesHardRules).toBe(false);
    expect(profile.safeguards.autoExecute).toBe(false);
  });

  it('يخفض الاعتماد عند تكرار نتائج سلبية',()=>{
    const profile=buildDecisionOutcomeLearningProfile(metadata,{
      'conversation:1':outcome('conversation:1','NEGATIVE'),
      'conversation:2':outcome('conversation:2','NEGATIVE'),
      'conversation:3':outcome('conversation:3','NEGATIVE'),
    });
    expect(profile.patterns[0]?.stance).toBe('CAUTION');
    expect(profile.patterns[0]?.negativeRate).toBe(1);
    expect(profile.patterns[0]?.summary).toContain('طلب سياق إضافي');
  });

  it('لا يتعلم اتجاهًا من عينة أقل من ثلاثة قرارات',()=>{
    const profile=buildDecisionOutcomeLearningProfile(metadata.slice(0,2),{
      'conversation:1':outcome('conversation:1','POSITIVE'),
      'conversation:2':outcome('conversation:2','POSITIVE'),
    });
    expect(profile.patterns[0]?.stance).toBe('INSUFFICIENT');
  });

  it('يتجاهل النتائج غير المحسومة عند حساب فعالية التوصية',()=>{
    const profile=buildDecisionOutcomeLearningProfile(metadata,{
      'conversation:1':outcome('conversation:1','POSITIVE'),
      'conversation:2':outcome('conversation:2','UNDETERMINED'),
      'conversation:3':outcome('conversation:3','NEGATIVE'),
    });
    expect(profile.patterns[0]?.sampleSize).toBe(2);
    expect(profile.patterns[0]?.stance).toBe('INSUFFICIENT');
  });
});
