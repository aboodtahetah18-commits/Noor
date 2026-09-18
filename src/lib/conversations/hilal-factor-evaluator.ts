import type { HilalEligibilityFactor } from './hilal-policy';

export type HilalFactorEvidenceStatus = 'READY_RAW' | 'NEEDS_EVIDENCE' | 'NEEDS_CALIBRATION';

export type HilalFactorEvidence = {
  factor: HilalEligibilityFactor;
  status: HilalFactorEvidenceStatus;
  raw_value: number | string | null;
  evidence_source: string | null;
  note: string;
};

export type HilalFactorContext = {
  monthlyNetIncome?: number;
  recurringCoreObligations?: number;
  repaymentSource?: string;
  repaymentSourceVerified?: boolean;
  incomeHistoryVerified?: boolean;
  fundedItemImportance?: 'ESSENTIAL' | 'IMPORTANT' | 'DISCRETIONARY';
};

export type HilalFactorEvaluation = {
  factors: Record<HilalEligibilityFactor, HilalFactorEvidence>;
  missing_evidence_factors: HilalEligibilityFactor[];
  calibration_required_factors: HilalEligibilityFactor[];
  raw_evidence_complete: boolean;
};

export function evaluateHilalFactorEvidence(context: HilalFactorContext): HilalFactorEvaluation {
  const income = typeof context.monthlyNetIncome === 'number' ? Math.max(context.monthlyNetIncome, 0) : null;
  const obligations = typeof context.recurringCoreObligations === 'number' ? Math.max(context.recurringCoreObligations, 0) : null;
  const surplus = income !== null && obligations !== null ? income - obligations : null;
  const obligationRatio = income !== null && obligations !== null && income > 0 ? obligations / income : null;

  const factors: Record<HilalEligibilityFactor, HilalFactorEvidence> = {
    repayment_source_clarity: context.repaymentSource && context.repaymentSourceVerified
      ? {
          factor: 'repayment_source_clarity',
          status: 'NEEDS_CALIBRATION',
          raw_value: context.repaymentSource,
          evidence_source: 'verified_repayment_source',
          note: 'مصدر السداد موثق، لكن تحويل وضوح المصدر إلى درجة 0–100 يحتاج معايرة رقمية معتمدة.',
        }
      : {
          factor: 'repayment_source_clarity',
          status: 'NEEDS_EVIDENCE',
          raw_value: context.repaymentSource ?? null,
          evidence_source: context.repaymentSource ? 'user_declared_unverified' : null,
          note: 'سياسة الهلال لا تعتبر دخلًا غير موثوق أو مبلغًا لم يصل مصدر سداد مؤكدًا.',
        },
    surplus_after_essentials: surplus !== null
      ? {
          factor: 'surplus_after_essentials',
          status: 'NEEDS_CALIBRATION',
          raw_value: surplus,
          evidence_source: 'confirmed_baseline',
          note: 'الفائض بعد الأساسيات محسوب من الدخل والالتزامات المؤكدة، لكن حدود تحويله إلى درجة أهلية لم تُعتمد رقميًا.',
        }
      : {
          factor: 'surplus_after_essentials',
          status: 'NEEDS_EVIDENCE',
          raw_value: null,
          evidence_source: null,
          note: 'يلزم دخل شهري والتزامات أساسية مؤكدة.',
        },
    income_stability: context.incomeHistoryVerified
      ? {
          factor: 'income_stability',
          status: 'NEEDS_CALIBRATION',
          raw_value: 'VERIFIED_HISTORY_AVAILABLE',
          evidence_source: 'verified_income_history',
          note: 'تاريخ الدخل الموثق متاح، لكن نطاقات الاستقرار الرقمية لم تُعتمد بعد.',
        }
      : {
          factor: 'income_stability',
          status: 'NEEDS_EVIDENCE',
          raw_value: null,
          evidence_source: null,
          note: 'لا توجد بعد سلسلة دخل تاريخية موثقة كافية لتقييم الاستقرار.',
        },
    current_obligation_burden: obligationRatio !== null
      ? {
          factor: 'current_obligation_burden',
          status: 'NEEDS_CALIBRATION',
          raw_value: obligationRatio,
          evidence_source: 'confirmed_baseline',
          note: 'نسبة الالتزامات إلى الدخل محسوبة، لكن حدود تحويل النسبة إلى درجة 0–100 غير معايرة.',
        }
      : {
          factor: 'current_obligation_burden',
          status: 'NEEDS_EVIDENCE',
          raw_value: null,
          evidence_source: null,
          note: 'يلزم دخل والتزامات مؤكدة لحساب عبء الالتزامات.',
        },
    funded_item_importance: context.fundedItemImportance
      ? {
          factor: 'funded_item_importance',
          status: 'NEEDS_CALIBRATION',
          raw_value: context.fundedItemImportance,
          evidence_source: 'user_confirmed_purpose_classification',
          note: 'أهمية الغرض مصنفة، لكن تحويل الفئة إلى درجة 0–100 يحتاج معايرة معتمدة.',
        }
      : {
          factor: 'funded_item_importance',
          status: 'NEEDS_EVIDENCE',
          raw_value: null,
          evidence_source: null,
          note: 'يلزم تصنيف الغرض إلى أساسي أو مهم أو اختياري.',
        },
  };

  const entries = Object.values(factors);
  const missingEvidence = entries.filter((item) => item.status === 'NEEDS_EVIDENCE').map((item) => item.factor);
  const calibrationRequired = entries.filter((item) => item.status === 'NEEDS_CALIBRATION').map((item) => item.factor);

  return {
    factors,
    missing_evidence_factors: missingEvidence,
    calibration_required_factors: calibrationRequired,
    raw_evidence_complete: missingEvidence.length === 0,
  };
}
