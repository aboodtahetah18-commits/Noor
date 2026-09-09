import { recommendationRepository } from '@/repositories/recommendation-repository';
export async function dismissRecommendation(userId: string, recommendationId: string) {
  const current = await recommendationRepository.getById(userId, recommendationId);
  if (!current) throw new Error('RECOMMENDATION_NOT_FOUND');
  if (current.recommendation.status === 'DISMISSED') return current.recommendation;
  return recommendationRepository.transition(userId, recommendationId, 'DISMISS_RECOMMENDATION');
}
