import type { RecommendationStatus, RecommendationType } from '@/domain/types';
import type { RecommendationRecord, RecommendationReasonCode } from './recommendation';

export interface AdvisorFeedInput {
  status?: RecommendationStatus;
  type?: RecommendationType;
  priority?: number;
  page?: number;
  pageSize?: number;
}

export interface AdvisorFeedItem extends RecommendationRecord {
  supportingSummary: string;
}

export interface AdvisorFeedResult {
  items: AdvisorFeedItem[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
}

export type AdvisorNextActionCode = 'OPEN_OBLIGATIONS' | 'OPEN_PLAN_REVISION' | 'OPEN_GOAL_EDIT' | 'OPEN_SAVING_TRANSFER' | 'NO_AUTOMATIC_ACTION';

export interface AdvisorSuggestedAction {
  code: AdvisorNextActionCode;
  label: string;
  href: string | null;
  description: string;
}

export interface AdvisorRelatedEntity {
  kind: 'CATEGORY' | 'GOAL' | 'OBLIGATION' | 'CYCLE' | 'NONE';
  id: string | null;
  label: string | null;
}

export interface RecommendationDetailsResult {
  recommendation: AdvisorFeedItem;
  reasonCode: RecommendationReasonCode;
  reasonData: Record<string, unknown>;
  whyThisRecommendation: string;
  relatedEntity: AdvisorRelatedEntity;
  suggestedActions: AdvisorSuggestedAction[];
}
