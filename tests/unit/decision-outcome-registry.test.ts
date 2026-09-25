import { describe, expect, it } from 'vitest';
import { deriveInitialDecisionOutcome } from '../../src/lib/finance/decision-outcome-registry';

describe('نتائج القرارات',()=>{
  it('يفصل تنفيذ القرار البنكي عن جودة أثره',()=>{
    const result=deriveInitialDecisionOutcome({
      id:'bank:b1',
      source:'BANK_OPERATION',
      externalExecution:true,
      createdAt:'2026-09-25T10:00:00.000Z',
      learning:{outcome:null,algorithmName:null},
    });
    expect(result.effect).toBe('EXECUTED');
    expect(result.quality).toBe('UNDETERMINED');
    expect(result.summary).toContain('جودة الأثر');
  });

  it('يعتبر تحسن التعلم نتيجة إيجابية محققة',()=>{
    const result=deriveInitialDecisionOutcome({
      id:'learning:l1',
      source:'LEARNING',
      externalExecution:false,
      createdAt:'2026-09-25T10:00:00.000Z',
      learning:{outcome:'IMPROVED',algorithmName:'خوارزمية خط أساس المصروفات'},
    });
    expect(result.effect).toBe('ACHIEVED');
    expect(result.quality).toBe('POSITIVE');
    expect(result.assessor).toBe('LEARNING');
  });

  it('يفتح مراجعة عند تدهور معايرة تعلم نشطة',()=>{
    const result=deriveInitialDecisionOutcome({
      id:'learning:l2',
      source:'LEARNING',
      externalExecution:false,
      createdAt:'2026-09-25T10:00:00.000Z',
      learning:{outcome:'REVIEW_REQUIRED',algorithmName:'خوارزمية تحقق الدخل المتوقع'},
    });
    expect(result.effect).toBe('MISSED');
    expect(result.quality).toBe('NEGATIVE');
    expect(result.requiresReview).toBe(true);
  });

  it('يبقي القرار العادي معلقًا حتى يصل دليل لاحق',()=>{
    const result=deriveInitialDecisionOutcome({
      id:'conversation:m1',
      source:'CONVERSATION',
      externalExecution:false,
      createdAt:'2026-09-25T10:00:00.000Z',
      learning:{outcome:null,algorithmName:null},
    });
    expect(result.effect).toBe('PENDING_EVIDENCE');
    expect(result.quality).toBe('UNDETERMINED');
    expect(result.assessedAt).toBeNull();
  });
});
