import { describe, expect, it } from 'vitest';
import { supportingSummary, suggestedActions, whyText } from '@/features/recommendations/queries/advisor-presentation';
import type { RecommendationRecord } from '@/features/recommendations/types/recommendation';

const base: RecommendationRecord = {
  id:'00000000-0000-0000-0000-000000000001', cycleId:'00000000-0000-0000-0000-000000000002', type:'WARNING', status:'VIEWED', priority:1,
  title:'تجاوز', message:'اختبار', reasonCode:'OVER_BUDGET', reasonData:{planned:'100.00',actual:'140.00'}, deduplicationKey:'x',
  relatedCategoryId:'00000000-0000-0000-0000-000000000003', relatedGoalId:null, relatedObligationOccurrenceId:null, createdAt:'2026-09-02T12:00:00Z'
};

describe('Phase 23 advisor presentation',()=>{
  it('explains the deterministic reason without AI',()=>{ expect(whyText(base.reasonCode,base.reasonData)).toContain('تجاوز'); expect(supportingSummary(base)).toContain('140'); });
  it('returns navigation only and never executes a financial action',()=>{ const actions=suggestedActions(base); expect(actions[0]?.code).toBe('OPEN_PLAN_REVISION'); expect(actions[0]?.href).toBe('/budget/revise'); });
});
