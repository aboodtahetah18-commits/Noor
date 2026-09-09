import { recommendationRepository } from '@/repositories/recommendation-repository';
import { getAdvisorExplanation } from '@/features/recommendations/ai/get-advisor-explanation';

export type RecommendationNextAction =
  | 'OPEN_PLAN_REVISION'
  | 'OPEN_GOAL_EDIT'
  | 'OPEN_SAVING_TRANSFER'
  | 'OPEN_OBLIGATIONS'
  | 'OPEN_BUDGET'
  | 'REVIEW_DASHBOARD';

export interface SuggestedAction {
  code: RecommendationNextAction;
  label: string;
  href: string;
}

const actionsByReason: Record<string, SuggestedAction[]> = {
  OBLIGATION_OVERDUE: [{ code: 'OPEN_OBLIGATIONS', label: 'مراجعة الالتزامات', href: '/obligations' }],
  OBLIGATION_UPCOMING: [{ code: 'OPEN_OBLIGATIONS', label: 'مراجعة الالتزام القادم', href: '/obligations' }],
  GOAL_UNREALISTIC: [{ code: 'OPEN_GOAL_EDIT', label: 'مراجعة الهدف', href: '/goals' }],
  SURPLUS_AVAILABLE: [
    { code: 'OPEN_SAVING_TRANSFER', label: 'مراجعة الادخار', href: '/savings' },
    { code: 'OPEN_PLAN_REVISION', label: 'مراجعة الخطة', href: '/budget/revise' },
  ],
  OVER_BUDGET: [
    { code: 'OPEN_BUDGET', label: 'مراجعة الميزانية', href: '/budget' },
    { code: 'OPEN_PLAN_REVISION', label: 'فتح تعديل الخطة', href: '/budget/revise' },
  ],
  DEFICIT_RISK: [{ code: 'OPEN_PLAN_REVISION', label: 'مراجعة الخطة', href: '/budget/revise' }],
  SAFE_TO_SPEND_ZERO: [{ code: 'REVIEW_DASHBOARD', label: 'مراجعة الوضع المالي', href: '/dashboard' }],
};

export async function getRecommendationDetails(userId: string, recommendationId: string) {
  const result = await recommendationRepository.getById(userId, recommendationId);
  if (!result) return null;
  const advisorExplanation = await getAdvisorExplanation(result.recommendation.reasonCode, result.recommendation.reasonData);
  return {
    recommendation: result.recommendation,
    reasonCode: result.recommendation.reasonCode,
    reasonData: result.recommendation.reasonData,
    relatedEntity: result.relatedLabel
      ? { label: result.relatedLabel }
      : null,
    advisorExplanation,
    suggestedActions: actionsByReason[result.recommendation.reasonCode] ?? [
      { code: 'REVIEW_DASHBOARD' as const, label: 'مراجعة لوحة التحكم', href: '/dashboard' },
    ],
  };
}

export function getAcceptedNextAction(reasonCode: string): SuggestedAction {
  const actions = actionsByReason[reasonCode];
  return actions?.[0] ?? { code: 'REVIEW_DASHBOARD', label: 'مراجعة لوحة التحكم', href: '/dashboard' };
}
