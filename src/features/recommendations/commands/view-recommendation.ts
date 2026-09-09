import { recommendationRepository } from '@/repositories/recommendation-repository';
export async function viewRecommendation(userId: string, recommendationId: string) {
  const current = await recommendationRepository.getById(userId, recommendationId);
  if (!current) throw new Error('RECOMMENDATION_NOT_FOUND');
  if (current.recommendation.status !== 'NEW') return current.recommendation;
  return recommendationRepository.transition(userId, recommendationId, 'VIEW_RECOMMENDATION');
}
