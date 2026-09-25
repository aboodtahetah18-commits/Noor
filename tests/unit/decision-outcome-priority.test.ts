import { describe, expect, it } from 'vitest';
import {
  outcomeLearningPriorityAdjustment,
  type ProactiveCandidate,
} from '../../src/lib/conversations/daily-conversation-orchestrator';
import type { DecisionOutcomeLearningContext } from '../../src/lib/finance/decision-outcome-learning-engine';

const base:ProactiveCandidate={
  key:'k',
  roomKey:'hilal',
  senderKey:'budget-spending-owner',
  senderName:'مسؤول الميزانية والإنفاق',
  kind:'followup',
  basePriority:100,
  cooldownDays:3,
  requestedFact:null,
  title:'توصية',
  body:'نص',
  reason:'سبب',
};

function context(stance:DecisionOutcomeLearningContext['stance']):DecisionOutcomeLearningContext{
  return {
    domain:'budget_spending',
    stance,
    sampleSize:4,
    confidence:80,
    positiveRate:stance==='SUPPORT'?0.75:0.25,
    negativeRate:stance==='CAUTION'?0.75:0.25,
    ruleCode:'RULE-BUDGET-TRUE-AVAILABLE',
    actorKey:'budget-spending-owner',
    action:'recommendation',
    decisionIds:['1','2','3','4'],
    shortText:'سياق',
  };
}

describe('ضبط أولوية التوصية من نتائج القرارات السابقة',()=>{
  it('يرفع التوصية قليلًا إذا نجح هذا النوع سابقًا',()=>{
    expect(outcomeLearningPriorityAdjustment(base,context('SUPPORT'))).toBe(6);
  });

  it('يخفض التوصية غير الحرجة إذا تكررت نتائج سلبية',()=>{
    expect(outcomeLearningPriorityAdjustment(base,context('CAUTION'))).toBe(-10);
  });

  it('لا يخفض خطرًا حاليًا بسبب تاريخ توصيات سابقة',()=>{
    const risk={...base,kind:'risk' as const,basePriority:145};
    expect(outcomeLearningPriorityAdjustment(risk,context('CAUTION'))).toBe(0);
  });

  it('لا يؤثر على طلبات البيانات أو العينة غير الكافية',()=>{
    const request={...base,kind:'request' as const};
    expect(outcomeLearningPriorityAdjustment(request,context('SUPPORT'))).toBe(0);
    expect(outcomeLearningPriorityAdjustment(base,context('INSUFFICIENT'))).toBe(0);
  });
});
