import { recommendationRepository } from '@/repositories/recommendation-repository';
export function listRecommendations(userId: string, cycleId: string) { return recommendationRepository.list(userId, cycleId); }
