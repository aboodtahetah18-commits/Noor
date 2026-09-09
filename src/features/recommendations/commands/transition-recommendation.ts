import type { RecommendationEvent } from '@/domain/types';
import { recommendationRepository } from '@/repositories/recommendation-repository';
export function transitionRecommendation(userId: string, recommendationId: string, event: RecommendationEvent) { return recommendationRepository.transition(userId,recommendationId,event); }
