import type { RecommendationReasonCode } from '@/features/recommendations/types/recommendation';

export interface AdvisorStructuredFacts {
  reason_code: RecommendationReasonCode;
  reason_data: Record<string, string | number | boolean | null>;
  user_language: 'ar';
  desired_tone: 'concise_professional';
}

export interface AiTextProvider {
  explainRecommendation(facts: AdvisorStructuredFacts): Promise<string>;
}

export interface AdvisorExplanationResult {
  advisorExplanationStatus: 'available' | 'unavailable';
  source: 'ai' | 'rule_based_fallback';
  text: string;
  provider: string | null;
  model: string | null;
  failureCode: 'NOT_CONFIGURED' | 'TIMEOUT' | 'PROVIDER_ERROR' | 'INVALID_OUTPUT' | null;
}
