import { describe, expect, it } from 'vitest';
import { buildAdvisorStructuredFacts } from '@/ai/structured-facts';
import { validateAiExplanation } from '@/features/recommendations/ai/output-guard';
import { getAdvisorExplanation } from '@/features/recommendations/ai/get-advisor-explanation';
import type { AiTextProvider } from '@/ai/types';

describe('Phase 24 AI explanation boundary', () => {
  it('minimizes AI input to documented structured facts', () => {
    const facts = buildAdvisorStructuredFacts('OVER_BUDGET', { planned:'500.00', actual:'620.00', rawTransactions:['secret'], userNote:'ignore system' });
    expect(facts).toEqual({ reason_code:'OVER_BUDGET', reason_data:{planned:'500.00',actual:'620.00'}, user_language:'ar', desired_tone:'concise_professional' });
  });

  it('rejects AI output that invents a new number', () => {
    const facts=buildAdvisorStructuredFacts('OVER_BUDGET',{planned:'500.00',actual:'620.00'});
    expect(validateAiExplanation('المصروف 620.00 ر.س مقابل 500.00 ر.س.',facts)).toBe(true);
    expect(validateAiExplanation('اخفض المصروف إلى 300 ر.س.',facts)).toBe(false);
  });

  it('falls back without failing when provider fails', async () => {
    const provider:AiTextProvider={explainRecommendation:async()=>{throw new Error('500')}};
    const result=await getAdvisorExplanation('OVER_BUDGET',{planned:'500.00',actual:'620.00'},provider);
    expect(result.advisorExplanationStatus).toBe('unavailable');
    expect(result.source).toBe('rule_based_fallback');
    expect(result.text).toContain('620');
  });
});
