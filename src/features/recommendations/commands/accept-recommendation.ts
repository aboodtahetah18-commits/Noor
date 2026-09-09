import { recommendationRepository } from '@/repositories/recommendation-repository';
import { suggestedActions } from '@/features/recommendations/queries/advisor-presentation';

export async function acceptRecommendation(userId: string, recommendationId: string) {
  const before = await recommendationRepository.getById(userId, recommendationId);
  if (!before) throw new Error('RECOMMENDATION_NOT_FOUND');
  const rec = before.recommendation.status === 'ACCEPTED'
    ? before.recommendation
    : await recommendationRepository.transition(userId, recommendationId, 'ACCEPT_RECOMMENDATION');
  return { recommendation: rec, nextAction: suggestedActions(rec)[0] ?? null };
}
