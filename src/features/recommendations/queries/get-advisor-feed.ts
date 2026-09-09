import type { RecommendationStatus, RecommendationType } from '@/domain/types';
import { recommendationRepository } from '@/repositories/recommendation-repository';

export interface AdvisorFeedInput {
  status?: RecommendationStatus;
  type?: RecommendationType;
  priority?: number;
  page?: number;
  pageSize?: number;
}

export interface AdvisorFeedItem {
  id: string;
  recommendationType: RecommendationType;
  status: RecommendationStatus;
  priority: number;
  title: string;
  message: string;
  reasonCode: string;
  supportingSummary: string;
  createdAt: string;
}

function valueLabel(value: unknown): string | null {
  if (typeof value === 'number') return new Intl.NumberFormat('ar-SA-u-nu-latn', { maximumFractionDigits: 2 }).format(value);
  if (typeof value === 'string' && value.trim()) return value;
  return null;
}

export function buildSupportingSummary(reasonData: Record<string, unknown>): string {
  const preferred = ['amount', 'remainingAmount', 'overdueAmount', 'actual', 'planned', 'surplusAmount', 'requiredContribution', 'availableFinancialCapacity'];
  const parts = preferred
    .map((key) => {
      const value = valueLabel(reasonData[key]);
      return value ? `${key}: ${value}` : null;
    })
    .filter((part): part is string => Boolean(part));
  if (parts.length) return parts.slice(0, 3).join(' • ');
  const first = Object.entries(reasonData).find(([, value]) => valueLabel(value));
  return first ? `${first[0]}: ${valueLabel(first[1])}` : 'تستند إلى بياناتك المالية المسجلة في الدورة الحالية.';
}

export async function getAdvisorFeed(userId: string, input: AdvisorFeedInput = {}) {
  const page = Math.max(1, Math.trunc(input.page ?? 1));
  const pageSize = Math.min(50, Math.max(1, Math.trunc(input.pageSize ?? 20)));
  const result = await recommendationRepository.listFeed(userId, {
    status: input.status,
    type: input.type,
    priority: input.priority,
    page,
    pageSize,
  });
  return {
    recommendations: result.rows.map((r): AdvisorFeedItem => ({
      id: r.id,
      recommendationType: r.type,
      status: r.status,
      priority: r.priority,
      title: r.title,
      message: r.message,
      reasonCode: r.reasonCode,
      supportingSummary: buildSupportingSummary(r.reasonData),
      createdAt: r.createdAt,
    })),
    page,
    pageSize,
    total: result.total,
    totalPages: Math.max(1, Math.ceil(result.total / pageSize)),
  };
}
