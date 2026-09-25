import { describe, expect, it } from 'vitest';
import { buildFinancialLearningTimeline } from '../../src/lib/finance/financial-learning-timeline';
import type { FinancialLearningLifecycleStore } from '../../src/lib/finance/financial-learning-lifecycle';

function store():FinancialLearningLifecycleStore{
  return {
    version:1,
    updatedAt:'2026-09-25T10:00:00.000Z',
    items:{
      'expense-baseline-calibration':{
        key:'expense-baseline-calibration',
        title:'معايرة خط أساس المصروفات',
        kind:'EXPENSE_BASELINE',
        parameterKey:'forecast.expenseBaselineFactor',
        ownerBank:'hilal',
        confidence:82,
        proposedValue:1.1,
        baselineErrorPercent:12,
        candidateErrorPercent:4,
        improvementPercent:66.7,
        status:'ACTIVE',
        createdAt:'2026-09-20T10:00:00.000Z',
        reviewedAt:'2026-09-21T10:00:00.000Z',
        approvedAt:'2026-09-22T10:00:00.000Z',
        activatedAt:'2026-09-23T10:00:00.000Z',
        rejectedAt:null,
        rolledBackAt:null,
        previousActiveValue:1,
        sourceCycleIds:['c1','c2','c3','c4'],
        learningSummary:'المصروف الفعلي أعلى من الخطة بصورة متكررة.',
        learningEvidence:['c1: 4400 مقابل 4000','c2: 4500 مقابل 4000'],
        backtestSampleSize:4,
        monitoring:{
          state:'IMPROVED',
          sampleSize:2,
          baselineMaePercent:10,
          activeMaePercent:3,
          changePercent:70,
          reason:'المعايرة حسنت الدقة في الدورات الجديدة.',
          evaluatedAt:'2026-09-25T10:00:00.000Z',
        },
        history:[
          {at:'2026-09-20T10:00:00.000Z',action:'SYNC',actorRole:'financial-learning-engine',note:'نجح الاختبار الخلفي.',from:null,to:'BACKTEST_PASSED'},
          {at:'2026-09-21T10:00:00.000Z',action:'SUBMIT_REVIEW',actorRole:'central-bank-manager',note:'إحالة للمراجعة.',from:'BACKTEST_PASSED',to:'IN_REVIEW'},
          {at:'2026-09-22T10:00:00.000Z',action:'APPROVE',actorRole:'central-governor',note:'تم الاعتماد.',from:'IN_REVIEW',to:'APPROVED'},
          {at:'2026-09-23T10:00:00.000Z',action:'ACTIVATE',actorRole:'central-bank-manager',note:'تم التفعيل.',from:'APPROVED',to:'ACTIVE'},
        ],
      },
    },
  };
}

describe('السجل الزمني المؤسسي للتعلم',()=>{
  it('يعرض ذاكرة مستقلة لكل خوارزمية مع الدورات والأدلة',()=>{
    const timeline=buildFinancialLearningTimeline(store());
    expect(timeline.algorithms).toHaveLength(1);
    expect(timeline.algorithms[0]?.algorithmName).toContain('المصروفات');
    expect(timeline.algorithms[0]?.sourceCycleIds).toEqual(['c1','c2','c3','c4']);
    expect(timeline.entries.some(entry=>entry.phase==='MONITORING')).toBe(true);
    expect(timeline.entries.some(entry=>entry.evidence.length>0)).toBe(true);
  });

  it('يسجل نتيجة التحسن بعد التفعيل كذاكرة مؤسسية لا كمعامل مخفي فقط',()=>{
    const timeline=buildFinancialLearningTimeline(store());
    expect(timeline.summary.improved).toBe(1);
    expect(timeline.algorithms[0]?.currentOutcome).toBe('IMPROVED');
    const monitoring=timeline.entries.find(entry=>entry.phase==='MONITORING');
    expect(monitoring?.baselineErrorPercent).toBe(10);
    expect(monitoring?.candidateErrorPercent).toBe(3);
    expect(monitoring?.improvementPercent).toBe(70);
  });

  it('يحافظ على ترتيب الأحداث من الأحدث إلى الأقدم',()=>{
    const timeline=buildFinancialLearningTimeline(store());
    expect(timeline.entries[0]?.phase).toBe('MONITORING');
    expect(timeline.entries.at(-1)?.action).toBe('SYNC');
  });
});
