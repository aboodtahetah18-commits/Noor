import { buildAdvisorStructuredFacts } from '@/ai/structured-facts';
import type { AdvisorExplanationResult, AiTextProvider } from '@/ai/types';
import { OpenAiTextProvider } from '@/ai/openai-provider';
import type { RecommendationReasonCode } from '@/features/recommendations/types/recommendation';
import { whyText } from '@/features/recommendations/queries/advisor-presentation';
import { validateAiExplanation } from './output-guard';

function fallback(reasonCode: RecommendationReasonCode, reasonData: Record<string, unknown>, failureCode: AdvisorExplanationResult['failureCode']): AdvisorExplanationResult {
  return {
    advisorExplanationStatus: 'unavailable',
    source: 'rule_based_fallback',
    text: whyText(reasonCode, reasonData),
    provider: null,
    model: null,
    failureCode,
  };
}

export async function getAdvisorExplanation(
  reasonCode: RecommendationReasonCode,
  reasonData: Record<string, unknown>,
  providerOverride?: AiTextProvider,
): Promise<AdvisorExplanationResult> {
  const facts = buildAdvisorStructuredFacts(reasonCode, reasonData);
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-5.6-luna';
  const provider = providerOverride ?? (apiKey ? new OpenAiTextProvider(apiKey, model) : null);
  if (!provider) return fallback(reasonCode, reasonData, 'NOT_CONFIGURED');

  try {
    const text = await provider.explainRecommendation(facts);
    if (!validateAiExplanation(text, facts)) return fallback(reasonCode, reasonData, 'INVALID_OUTPUT');
    return {
      advisorExplanationStatus: 'available',
      source: 'ai',
      text,
      provider: providerOverride ? 'test-provider' : 'openai',
      model: providerOverride ? null : model,
      failureCode: null,
    };
  } catch (error) {
    const failureCode = error instanceof Error && error.name === 'AbortError' ? 'TIMEOUT' : 'PROVIDER_ERROR';
    return fallback(reasonCode, reasonData, failureCode);
  }
}
