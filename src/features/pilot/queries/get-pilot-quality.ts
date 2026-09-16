import { getPilotDashboard } from '@/features/pilot/queries/get-pilot-dashboard';
import { getPilotImpacts } from '@/features/pilot/queries/get-pilot-impact';
import {
  getPilotLongitudinalFollowups,
  type PilotFollowupCheckpoint,
  type PilotFollowupDirection,
} from '@/features/pilot/queries/get-pilot-followups';

export type PilotQualityDimensionStatus = 'SUPPORTED' | 'CONCERN' | 'NEUTRAL' | 'NOT_ASSESSABLE';

export type PilotQualityDimension = {
  key: 'SAFETY' | 'PERSISTENCE' | 'EXPECTATION_CALIBRATION' | 'EXECUTION_FIDELITY' | 'AMOUNT_APPROPRIATENESS' | 'TIMING_QUALITY';
  label: string;
  status: PilotQualityDimensionStatus;
  score: number | null;
  rationale: string;
};

export type PilotRecommendationQuality = {
  recommendationId: string;
  cycleId: string;
  cycleName: string;
  title: string;
  qualityScore: number | null;
  assessableDimensions: number;
  totalDimensions: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  requiresReview: boolean;
  dimensions: PilotQualityDimension[];
};

function finiteNumber(value: string | null | undefined): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function latestAvailableCheckpoint(checkpoints: PilotFollowupCheckpoint[]): PilotFollowupCheckpoint | null {
  const priority = ['DAY_90', 'DAY_30', 'CYCLE_END', 'IMMEDIATE'] as const;
  for (const code of priority) {
    const checkpoint = checkpoints.find((item) => item.code === code && item.snapshotId !== null);
    if (checkpoint) return checkpoint;
  }
  return null;
}

function directionScore(direction: PilotFollowupDirection): number | null {
  if (direction === 'IMPROVED') return 100;
  if (direction === 'NEUTRAL') return 60;
  if (direction === 'DETERIORATED') return 20;
  return null;
}

function statusFromScore(score: number | null): PilotQualityDimensionStatus {
  if (score == null) return 'NOT_ASSESSABLE';
  if (score >= 75) return 'SUPPORTED';
  if (score >= 45) return 'NEUTRAL';
  return 'CONCERN';
}

function safetyDimension(checkpoints: PilotFollowupCheckpoint[]): PilotQualityDimension {
  const available = checkpoints.filter((item) => item.snapshotId !== null);
  if (available.length === 0) {
    return {
      key: 'SAFETY',
      label: 'سلامة الحماية',
      status: 'NOT_ASSESSABLE',
      score: null,
      rationale: 'لا توجد Snapshot لاحقة كافية لقياس أثر القرار على عجز الحماية.',
    };
  }

  const deltas = available
    .map((item) => finiteNumber(item.protectionDeficitDelta))
    .filter((value): value is number => value != null);
  if (deltas.length === 0) {
    return {
      key: 'SAFETY',
      label: 'سلامة الحماية',
      status: 'NOT_ASSESSABLE',
      score: null,
      rationale: 'بيانات عجز الحماية غير مكتملة في نقاط المتابعة المتاحة.',
    };
  }

  const worsened = deltas.some((value) => value > 0.01);
  const improved = deltas.some((value) => value < -0.01);
  const score = worsened ? 20 : improved ? 100 : 80;
  return {
    key: 'SAFETY',
    label: 'سلامة الحماية',
    status: statusFromScore(score),
    score,
    rationale: worsened
      ? 'ظهر ارتفاع في عجز الحماية بعد التنفيذ؛ يحتاج القرار إلى مراجعة سياقية قبل اعتباره ناجحًا.'
      : improved
        ? 'لم يزد عجز الحماية وظهر تحسن في إحدى نقاط المتابعة.'
        : 'لم يظهر تدهور مادي في عجز الحماية ضمن نقاط المتابعة المتاحة.',
  };
}

function persistenceDimension(checkpoints: PilotFollowupCheckpoint[]): PilotQualityDimension {
  const checkpoint = latestAvailableCheckpoint(checkpoints);
  if (!checkpoint) {
    return {
      key: 'PERSISTENCE',
      label: 'استمرار الأثر',
      status: 'NOT_ASSESSABLE',
      score: null,
      rationale: 'لم تتوفر متابعة لاحقة بعد التنفيذ بعد.',
    };
  }
  const score = directionScore(checkpoint.direction);
  return {
    key: 'PERSISTENCE',
    label: 'استمرار الأثر',
    status: statusFromScore(score),
    score,
    rationale: `أحدث نقطة متابعة قابلة للقياس هي ${checkpoint.code} واتجاهها ${checkpoint.direction}. هذا قياس رصدي ولا يثبت السببية.`,
  };
}

function expectationDimension(input: {
  targetScore: string | null;
  expectedSummary: string | null;
  checkpoints: PilotFollowupCheckpoint[];
}): PilotQualityDimension {
  const targetScore = finiteNumber(input.targetScore);
  const checkpoint = latestAvailableCheckpoint(input.checkpoints);
  const actualScore = finiteNumber(checkpoint?.weightedScore ?? null);

  if (targetScore == null || actualScore == null) {
    return {
      key: 'EXPECTATION_CALIBRATION',
      label: 'دقة التوقع',
      status: 'NOT_ASSESSABLE',
      score: null,
      rationale: input.expectedSummary
        ? 'يوجد توقع وصفي، لكن لا توجد قيمة رقمية قابلة للمقارنة بشكل منصف مع النتيجة الحالية.'
        : 'لا توجد قيمة رقمية مستهدفة محفوظة مع التوصية يمكن مقارنتها بالنتيجة.',
    };
  }

  const error = Math.abs(actualScore - targetScore);
  const score = error <= 2 ? 100 : error <= 5 ? 80 : error <= 10 ? 55 : 25;
  return {
    key: 'EXPECTATION_CALIBRATION',
    label: 'دقة التوقع',
    status: statusFromScore(score),
    score,
    rationale: `الدرجة المستهدفة ${targetScore.toFixed(1)} مقابل ${actualScore.toFixed(1)} في أحدث نقطة متابعة؛ الانحراف ${error.toFixed(1)} نقطة.`,
  };
}

function executionFidelityDimension(requestedAmount: string | null, executionAmount: string | null): PilotQualityDimension {
  const requested = finiteNumber(requestedAmount);
  const executed = finiteNumber(executionAmount);
  if (requested == null || executed == null || requested === 0) {
    return {
      key: 'EXECUTION_FIDELITY',
      label: 'مطابقة التنفيذ',
      status: 'NOT_ASSESSABLE',
      score: null,
      rationale: 'لا تتوفر قيمة مطلوبة وقيمة منفذة قابلتان للمقارنة.',
    };
  }
  const deviationPct = Math.abs(executed - requested) / Math.abs(requested) * 100;
  const score = deviationPct <= 1 ? 100 : deviationPct <= 5 ? 80 : deviationPct <= 10 ? 60 : 30;
  return {
    key: 'EXECUTION_FIDELITY',
    label: 'مطابقة التنفيذ',
    status: statusFromScore(score),
    score,
    rationale: `الانحراف بين المبلغ المطلوب والمنفذ ${deviationPct.toFixed(1)}%. هذا يقيس الالتزام بالتنفيذ ولا يثبت وحده جودة التوصية.`,
  };
}

function notAssessableDimension(
  key: 'AMOUNT_APPROPRIATENESS' | 'TIMING_QUALITY',
  label: string,
  rationale: string,
): PilotQualityDimension {
  return { key, label, status: 'NOT_ASSESSABLE', score: null, rationale };
}

export async function getPilotRecommendationQuality(
  userId: string,
  startsAt: string,
  endsAt: string,
): Promise<PilotRecommendationQuality[]> {
  const [dashboard, impacts, followups] = await Promise.all([
    getPilotDashboard(userId, startsAt, endsAt),
    getPilotImpacts(userId, startsAt, endsAt),
    getPilotLongitudinalFollowups(userId, startsAt, endsAt),
  ]);

  const decisionsByRecommendation = new Map(dashboard.decisions.map((item) => [item.recommendationId, item]));
  const impactsByRecommendation = new Map(impacts.map((item) => [item.recommendationId, item]));

  return followups.map((followup) => {
    const decision = decisionsByRecommendation.get(followup.recommendationId);
    const impact = impactsByRecommendation.get(followup.recommendationId);

    const dimensions: PilotQualityDimension[] = [
      safetyDimension(followup.checkpoints),
      persistenceDimension(followup.checkpoints),
      expectationDimension({
        targetScore: impact?.expected.targetScore ?? null,
        expectedSummary: impact?.expected.expectedSummary ?? null,
        checkpoints: followup.checkpoints,
      }),
      executionFidelityDimension(
        decision?.requestedAmount ?? null,
        decision?.executionAmount ?? decision?.reportedAmount ?? null,
      ),
      notAssessableDimension(
        'AMOUNT_APPROPRIATENESS',
        'ملاءمة حجم المبلغ',
        'لا توجد حاليًا قيمة مرجعية أو نطاق مبلغ معتمد محفوظ يمكن استخدامه لإثبات أن الحجم كان مناسبًا؛ لا تُحتسب درجة مصطنعة.',
      ),
      notAssessableDimension(
        'TIMING_QUALITY',
        'جودة التوقيت',
        'لا توجد نافذة توقيت مستهدفة محفوظة مع التوصية تسمح بتقييم التوقيت بمعيار مستقل؛ الأثر الزمني معروض للمتابعة فقط.',
      ),
    ];

    const assessable = dimensions.filter((item) => item.score != null);
    const qualityScore = assessable.length > 0
      ? assessable.reduce((sum, item) => sum + (item.score ?? 0), 0) / assessable.length
      : null;
    const assessableRatio = assessable.length / dimensions.length;
    const confidence: PilotRecommendationQuality['confidence'] = assessableRatio >= 0.75
      ? 'HIGH'
      : assessableRatio >= 0.5
        ? 'MEDIUM'
        : 'LOW';
    const requiresReview = dimensions.some((item) => item.status === 'CONCERN');

    return {
      recommendationId: followup.recommendationId,
      cycleId: followup.cycleId,
      cycleName: followup.cycleName,
      title: followup.title,
      qualityScore,
      assessableDimensions: assessable.length,
      totalDimensions: dimensions.length,
      confidence,
      requiresReview,
      dimensions,
    };
  });
}
