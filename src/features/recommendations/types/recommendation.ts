import type { RecommendationStatus, RecommendationType } from '@/domain/types';

export const RECOMMENDATION_REASON_CODES = [
  'DEFICIT_RISK',
  'OBLIGATION_OVERDUE',
  'OBLIGATION_UPCOMING',
  'SAFE_TO_SPEND_ZERO',
  'GOAL_UNREALISTIC',
  'SURPLUS_AVAILABLE',
  'OVER_BUDGET',
] as const;

export type RecommendationReasonCode = (typeof RECOMMENDATION_REASON_CODES)[number];

export interface RecommendationRecord {
  id: string;
  cycleId: string | null;
  type: RecommendationType;
  status: RecommendationStatus;
  priority: number;
  title: string;
  message: string;
  reasonCode: RecommendationReasonCode;
  reasonData: Record<string, unknown>;
  deduplicationKey: string | null;
  relatedCategoryId: string | null;
  relatedGoalId: string | null;
  relatedObligationOccurrenceId: string | null;
  createdAt: string;
}

export interface RecommendationCandidate {
  cycleId: string;
  type: RecommendationType;
  priority: 1;
  title: string;
  message: string;
  reasonCode: RecommendationReasonCode;
  reasonData: Record<string, unknown>;
  deduplicationKey: string;
  relatedCategoryId?: string;
  relatedGoalId?: string;
  relatedObligationOccurrenceId?: string;
}

export interface RecommendationRuleRunResult {
  created: number;
  resolved: number;
  activeReasonCodes: RecommendationReasonCode[];
  blockedRules: Array<{ reasonCode: RecommendationReasonCode; issue: string }>;
}
