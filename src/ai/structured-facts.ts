import type { RecommendationReasonCode } from '@/features/recommendations/types/recommendation';
import type { AdvisorStructuredFacts } from './types';

const allowedKeys: Record<RecommendationReasonCode, readonly string[]> = {
  OBLIGATION_OVERDUE: ['amount', 'dueDate'],
  OBLIGATION_UPCOMING: ['amount', 'dueDate'],
  GOAL_UNREALISTIC: ['targetAmount', 'targetDate'],
  SURPLUS_AVAILABLE: ['expected', 'actual', 'surplus'],
  OVER_BUDGET: ['planned', 'actual'],
  DEFICIT_RISK: [],
  SAFE_TO_SPEND_ZERO: [],
};

function safeScalar(value: unknown): string | number | boolean | null | undefined {
  if (value === null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.slice(0, 80);
  return undefined;
}

export function buildAdvisorStructuredFacts(
  reasonCode: RecommendationReasonCode,
  reasonData: Record<string, unknown>,
): AdvisorStructuredFacts {
  const minimized: Record<string, string | number | boolean | null> = {};
  for (const key of allowedKeys[reasonCode]) {
    const value = safeScalar(reasonData[key]);
    if (value !== undefined) minimized[key] = value;
  }
  return {
    reason_code: reasonCode,
    reason_data: minimized,
    user_language: 'ar',
    desired_tone: 'concise_professional',
  };
}
