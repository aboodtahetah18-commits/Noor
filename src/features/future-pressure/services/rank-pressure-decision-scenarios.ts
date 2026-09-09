import type { PressureDecisionScenario } from '../queries/get-pressure-decision-scenarios';
import type { PressureDecisionLearningSummary } from '../queries/get-pressure-decision-learning';
import { Money } from '@/financial-engine/money';

export type DecisionLearningBand =
  | 'FAVORABLE_ASSOCIATION'
  | 'LIMITED_HISTORY'
  | 'MIXED_ASSOCIATION'
  | 'CAUTION_ASSOCIATION';

export type PressureScenarioLearningEvidence = {
  observations: number;
  beneficialPackages: number;
  shiftedPackages: number;
  worsenedPackages: number;
  mixedPackages: number;
  band: DecisionLearningBand;
  explanation: string;
  attribution: 'CO_OCCURRENCE';
};

export type RankedPressureDecisionScenario = PressureDecisionScenario & {
  recommendationOrder: number;
  learningEvidence: PressureScenarioLearningEvidence;
};

function reliefAmount(scenario: PressureDecisionScenario): Money {
  return Money.parse(scenario.committedDeficitRelief).add(Money.parse(scenario.tripGapReliefAtCurrentDeadline));
}

function evidenceFor(summary: PressureDecisionLearningSummary | undefined): PressureScenarioLearningEvidence {
  if (!summary || summary.observations < 2) {
    const observations = summary?.observations ?? 0;
    return {
      observations,
      beneficialPackages: (summary?.resolvedPackages ?? 0) + (summary?.reducedPackages ?? 0),
      shiftedPackages: summary?.shiftedPackages ?? 0,
      worsenedPackages: summary?.worsenedPackages ?? 0,
      mixedPackages: summary?.mixedPackages ?? 0,
      band: 'LIMITED_HISTORY',
      explanation: observations
        ? `لدى النظام ${observations} ملاحظة فقط لهذا النوع؛ لا تكفي لتغيير الترتيب اعتمادًا على التاريخ.`
        : 'لا يوجد تاريخ كافٍ لهذا النوع بعد؛ يحتفظ بترتيبه وفق أثره المالي الحالي.',
      attribution: 'CO_OCCURRENCE',
    };
  }

  const beneficialPackages = summary.resolvedPackages + summary.reducedPackages;
  const adversePackages = summary.shiftedPackages + summary.worsenedPackages;
  let band: DecisionLearningBand = 'MIXED_ASSOCIATION';
  if (beneficialPackages > adversePackages) band = 'FAVORABLE_ASSOCIATION';
  else if (beneficialPackages < adversePackages) band = 'CAUTION_ASSOCIATION';

  const base = `ظهر هذا النوع داخل ${beneficialPackages} حزمة حلت/خففت الضغط، و${summary.shiftedPackages} نقلته زمنيًا، و${summary.worsenedPackages} ساءت نتيجتها، من أصل ${summary.observations} ملاحظات.`;
  const suffix = band === 'FAVORABLE_ASSOCIATION'
    ? ' يستخدم ذلك كدليل ترتيب استرشادي فقط.'
    : band === 'CAUTION_ASSOCIATION'
      ? ' لذلك يخفض النظام ترتيبه عند وجود بديل مباشر مماثل.'
      : ' النتيجة التاريخية غير حاسمة، لذلك لا يمنحه النظام أفضلية تلقائية.';

  return {
    observations: summary.observations,
    beneficialPackages,
    shiftedPackages: summary.shiftedPackages,
    worsenedPackages: summary.worsenedPackages,
    mixedPackages: summary.mixedPackages,
    band,
    explanation: `${base}${suffix} لا يوجد ادعاء بأن هذا الإجراء كان السبب المنفرد لأن الإسناد مشاركة داخل حزمة مركبة.`,
    attribution: 'CO_OCCURRENCE',
  };
}

function bandOrder(band: DecisionLearningBand) {
  if (band === 'FAVORABLE_ASSOCIATION') return 0;
  if (band === 'LIMITED_HISTORY') return 1;
  if (band === 'MIXED_ASSOCIATION') return 2;
  return 3;
}

/**
 * Conservative ordering policy:
 * 1) Real relief always precedes timing-only shifts.
 * 2) Historical learning only orders alternatives inside the same financial meaning tier.
 * 3) Learning is co-occurrence evidence, never causal proof and never an execution command.
 */
export function rankPressureDecisionScenarios(
  scenarios: PressureDecisionScenario[],
  learning: PressureDecisionLearningSummary[],
): RankedPressureDecisionScenario[] {
  const byKind = new Map(learning.map((item) => [item.scenarioKind, item]));
  const enriched = scenarios.map((scenario) => ({
    ...scenario,
    recommendationOrder: 0,
    learningEvidence: evidenceFor(byKind.get(scenario.kind)),
  }));

  enriched.sort((a, b) => {
    if (a.timingShiftOnly !== b.timingShiftOnly) return a.timingShiftOnly ? 1 : -1;

    const band = bandOrder(a.learningEvidence.band) - bandOrder(b.learningEvidence.band);
    if (band !== 0) return band;

    if (a.learningEvidence.band === 'FAVORABLE_ASSOCIATION') {
      const aRate = a.learningEvidence.beneficialPackages / a.learningEvidence.observations;
      const bRate = b.learningEvidence.beneficialPackages / b.learningEvidence.observations;
      if (aRate !== bRate) return bRate - aRate;
      const aAdverse = (a.learningEvidence.shiftedPackages + a.learningEvidence.worsenedPackages) / a.learningEvidence.observations;
      const bAdverse = (b.learningEvidence.shiftedPackages + b.learningEvidence.worsenedPackages) / b.learningEvidence.observations;
      if (aAdverse !== bAdverse) return aAdverse - bAdverse;
      if (a.learningEvidence.observations !== b.learningEvidence.observations) return b.learningEvidence.observations - a.learningEvidence.observations;
    }

    const relief = reliefAmount(b).compare(reliefAmount(a));
    if (relief !== 0) return relief;
    return a.id.localeCompare(b.id);
  });

  return enriched.map((scenario, index) => ({ ...scenario, recommendationOrder: index + 1 }));
}
