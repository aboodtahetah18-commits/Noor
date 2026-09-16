import { getPilotAlgorithmReviewQueue, type PilotAlgorithmReviewItem } from '@/features/pilot/queries/get-pilot-algorithm-review-queue';

export type PilotChangeProposalTarget = 'POLICY' | 'WEIGHTS' | 'THRESHOLDS' | 'ENGINE_LOGIC' | 'MEASUREMENT_CONTRACT';
export type PilotChangeProposalStage = 'EVIDENCE_COLLECTION' | 'SPEC_REQUIRED' | 'BACKTEST_REQUIRED' | 'DECISION_BLOCKED';
export type PilotBacktestStatus = 'NOT_ELIGIBLE' | 'BLOCKED_SPEC_REQUIRED' | 'READY_WHEN_SPECIFIED';

export type PilotAlgorithmChangeProposal = {
  id: string;
  reviewItemId: string;
  title: string;
  dimensionKey: PilotAlgorithmReviewItem['dimensionKey'];
  dimensionLabel: string;
  target: PilotChangeProposalTarget;
  stage: PilotChangeProposalStage;
  currentVersion: string;
  proposedVersion: string | null;
  requiredSpec: string;
  evidenceCount: number;
  recommendationCount: number;
  recommendationIds: string[];
  rationale: string;
  proposedAction: string;
  backtestStatus: PilotBacktestStatus;
  backtestRequirement: string;
  approvalStatus: 'BLOCKED';
  approvalBlocker: string;
  rollbackRequirement: string;
};

const CURRENT_VERSIONS = {
  POLICY: 'namaa-central-policy-v1',
  WEIGHTS: 'namaa-central-weights-v1',
  THRESHOLDS: 'namaa-central-thresholds-v1',
  ENGINE_LOGIC: 'P2.9-v1',
  MEASUREMENT_CONTRACT: 'pilot-measurement-v1',
} as const satisfies Record<PilotChangeProposalTarget, string>;

function targetFor(key: PilotAlgorithmReviewItem['dimensionKey']): PilotChangeProposalTarget {
  if (key === 'SAFETY') return 'THRESHOLDS';
  if (key === 'PERSISTENCE') return 'WEIGHTS';
  if (key === 'EXPECTATION_CALIBRATION') return 'POLICY';
  if (key === 'EXECUTION_FIDELITY') return 'POLICY';
  return 'MEASUREMENT_CONTRACT';
}

function specFor(key: PilotAlgorithmReviewItem['dimensionKey']): string {
  if (key === 'SAFETY') return 'حدد البوابة أو حد الحماية المراد تعديله بالقيمة الحالية والقيمة المقترحة وشروط التفعيل.';
  if (key === 'PERSISTENCE') return 'حدد المحور/الوزن المراد تغييره، الوزن الحالي، الوزن المقترح، وكيف ستُعاد موازنة بقية الأوزان إلى 100%.';
  if (key === 'EXPECTATION_CALIBRATION') return 'حدد معادلة أو نطاق التوقع الحالي والمقترح، بما يشمل سيناريو الصعود والهبوط وحدود الثقة.';
  if (key === 'EXECUTION_FIDELITY') return 'حدد قاعدة المبلغ أو نطاق المرونة في التنفيذ قبل اعتبار اختلاف التنفيذ مشكلة خوارزمية.';
  if (key === 'AMOUNT_APPROPRIATENESS') return 'عرّف أولًا نطاق مبلغ مرجعي قابل للقياس قبل اقتراح تعديل خوارزمي.';
  return 'عرّف أولًا نافذة توقيت مستهدفة قابلة للقياس قبل اقتراح تعديل خوارزمي.';
}

function backtestRequirementFor(target: PilotChangeProposalTarget): string {
  if (target === 'WEIGHTS') return 'أعد حساب الحالات التاريخية نفسها بالوزن المقترح وقارن الدرجة والحالة والبوابات والتوصيات مع النسخة الحالية، دون الكتابة فوق النتائج الأصلية.';
  if (target === 'THRESHOLDS') return 'أعد تشغيل الحالات التاريخية على الحدود المقترحة وسجل false positives/false negatives وأثرها على الحماية والنقد الحر.';
  if (target === 'POLICY') return 'أعد توليد التوصيات للحالات التاريخية وفق السياسة المقترحة وقارن نوع التوصية، المبلغ، الثقة، وسيناريوهات المخاطر بالنسخة الحالية.';
  if (target === 'ENGINE_LOGIC') return 'شغّل محركًا معزولًا على snapshots تاريخية مثبتة وقارن كل المخرجات الأساسية قبل السماح بأي إصدار جديد.';
  return 'اختبر عقد القياس الجديد على البيانات التاريخية وتأكد أنه لا يعيد تصنيف النتائج القديمة بصورة غير مفسرة.';
}

export async function getPilotAlgorithmChangeProposals(
  userId: string,
  startsAt: string,
  endsAt: string,
): Promise<PilotAlgorithmChangeProposal[]> {
  const queue = await getPilotAlgorithmReviewQueue(userId, startsAt, endsAt);

  return queue.map((item) => {
    const target = targetFor(item.dimensionKey);
    const specRequired = specFor(item.dimensionKey);
    const stage: PilotChangeProposalStage = item.severity === 'WATCH' ? 'EVIDENCE_COLLECTION' : 'SPEC_REQUIRED';
    const backtestStatus: PilotBacktestStatus = item.severity === 'WATCH' ? 'NOT_ELIGIBLE' : 'BLOCKED_SPEC_REQUIRED';
    const approvalBlocker = item.severity === 'WATCH'
      ? 'النمط ما زال تحت المراقبة ولم يصل حد المراجعة المطلوبة.'
      : 'لا يوجد Spec خوارزمي قابل للتنفيذ ولا Backtest مقارن محفوظ؛ الاعتماد محظور.';

    return {
      id: `proposal-${item.id}`,
      reviewItemId: item.id,
      title: `مقترح تغيير: ${item.dimensionLabel}`,
      dimensionKey: item.dimensionKey,
      dimensionLabel: item.dimensionLabel,
      target,
      stage,
      currentVersion: CURRENT_VERSIONS[target],
      proposedVersion: null,
      requiredSpec: specRequired,
      evidenceCount: item.evidenceCount,
      recommendationCount: item.recommendationCount,
      recommendationIds: item.recommendationIds,
      rationale: item.rationale,
      proposedAction: item.proposedAction,
      backtestStatus,
      backtestRequirement: backtestRequirementFor(target),
      approvalStatus: 'BLOCKED',
      approvalBlocker,
      rollbackRequirement: 'أي إصدار معتمد مستقبلًا يجب أن يحتفظ بالنسخة السابقة وبمعرّف الإصدار ونتيجة الـBacktest بحيث يمكن الرجوع إليها دون فقدان السجل التاريخي.',
    };
  });
}
