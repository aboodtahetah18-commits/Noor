import { getPilotRecommendationQuality, type PilotQualityDimension } from '@/features/pilot/queries/get-pilot-quality';

export type PilotAlgorithmReviewSeverity = 'WATCH' | 'REVIEW_REQUIRED';

export type PilotAlgorithmReviewItem = {
  id: string;
  dimensionKey: PilotQualityDimension['key'];
  dimensionLabel: string;
  severity: PilotAlgorithmReviewSeverity;
  evidenceCount: number;
  recommendationCount: number;
  title: string;
  rationale: string;
  proposedAction: string;
  recommendationIds: string[];
  status: 'PENDING_REVIEW';
};

const REVIEW_THRESHOLD = 3;
const WATCH_THRESHOLD = 2;

function proposedActionFor(key: PilotQualityDimension['key']): string {
  const actions: Record<PilotQualityDimension['key'], string> = {
    SAFETY: 'راجع قواعد الحماية والبوابات الصارمة وحدود التخصيص المرتبطة بهذا النوع من التوصيات قبل اقتراح أي تعديل.',
    PERSISTENCE: 'راجع منطق الاستدامة وأفق التوصية؛ تحقق هل الأثر الإيجابي قصير الأجل فقط قبل تعديل الأوزان.',
    EXPECTATION_CALIBRATION: 'راجع معايرة التوقعات والحدود الرقمية المستخدمة في reason_data، ثم اختبر التعديل على بيانات تاريخية قبل اعتماده.',
    EXECUTION_FIDELITY: 'راجع صياغة المبلغ المقترح وحدود المرونة والتعليمات التنفيذية؛ لا تغيّر المنطق المالي قبل استبعاد مشكلة التنفيذ اليدوي.',
    AMOUNT_APPROPRIATENESS: 'أضف أولًا معيارًا صريحًا لنطاق المبلغ المناسب قبل السماح بتقييم هذا البعد أو اقتراح تغيير خوارزمي عليه.',
    TIMING_QUALITY: 'أضف أولًا نافذة توقيت مستهدفة قابلة للقياس قبل تقييم التوقيت أو اقتراح تغيير في منطق التوصية.',
  };
  return actions[key];
}

export async function getPilotAlgorithmReviewQueue(
  userId: string,
  startsAt: string,
  endsAt: string,
): Promise<PilotAlgorithmReviewItem[]> {
  const quality = await getPilotRecommendationQuality(userId, startsAt, endsAt);
  const buckets = new Map<PilotQualityDimension['key'], {
    label: string;
    recommendationIds: Set<string>;
    rationales: string[];
  }>();

  for (const item of quality) {
    for (const dimension of item.dimensions) {
      if (dimension.status !== 'CONCERN') continue;
      const bucket = buckets.get(dimension.key) ?? {
        label: dimension.label,
        recommendationIds: new Set<string>(),
        rationales: [],
      };
      bucket.recommendationIds.add(item.recommendationId);
      bucket.rationales.push(dimension.rationale);
      buckets.set(dimension.key, bucket);
    }
  }

  const result: PilotAlgorithmReviewItem[] = [];
  for (const [key, bucket] of buckets.entries()) {
    const recommendationIds = [...bucket.recommendationIds];
    const count = recommendationIds.length;
    if (count < WATCH_THRESHOLD) continue;

    const severity: PilotAlgorithmReviewSeverity = count >= REVIEW_THRESHOLD ? 'REVIEW_REQUIRED' : 'WATCH';
    result.push({
      id: `${key.toLowerCase()}-${count}`,
      dimensionKey: key,
      dimensionLabel: bucket.label,
      severity,
      evidenceCount: bucket.rationales.length,
      recommendationCount: count,
      title: severity === 'REVIEW_REQUIRED'
        ? `نمط متكرر يحتاج مراجعة: ${bucket.label}`
        : `نمط تحت المراقبة: ${bucket.label}`,
      rationale: `ظهر تقييم CONCERN في ${count} توصيات منفذة ومتحققة. هذا يكفي لفتح مراجعة منهجية، لكنه لا يثبت وحده أن القاعدة أو الوزن الحالي خاطئ.`,
      proposedAction: proposedActionFor(key),
      recommendationIds,
      status: 'PENDING_REVIEW',
    });
  }

  return result.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'REVIEW_REQUIRED' ? -1 : 1;
    return b.recommendationCount - a.recommendationCount;
  });
}
