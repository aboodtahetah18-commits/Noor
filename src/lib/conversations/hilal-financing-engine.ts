import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import { getProtectionSnapshot } from './solvency-engine';
import { computeHilalFinanceLimit, HILAL_ELIGIBILITY_WEIGHTS, HILAL_POLICY_VERSION, evaluateHilalEligibility } from './hilal-policy';
import { evaluateHilalFactorEvidence } from './hilal-factor-evaluator';
import { computeApprovedRepaymentInstallmentBand, scoreHilalFactorEvidence } from './hilal-calibration';
import { getHilalRepaymentCapacity } from './hilal-repayment-capacity';
import type { ConversationMessageKind } from './store';
import { governedRooms } from './store';

export type FinancingDecisionState = 'NEEDS_DATA' | 'BLOCKED' | 'PASSES_PROTECTION_GATE' | 'UNDER_REVIEW';

type FinancingDraft = {
  purpose?: string;
  requested_amount?: number;
  expected_installment?: number;
  repayment_cycles?: number;
  repayment_source?: string;
  income_pattern?: 'STABLE' | 'VARIABLE' | 'SEASONAL';
  funded_item_importance?: 'ESSENTIAL' | 'IMPORTANT' | 'DISCRETIONARY';
  updated_at?: string;
};

type HilalMetadata = Record<string, unknown> & {
  financing_state?: {
    active_request?: FinancingDraft;
    repayment_capacity?: number;
    policy_cap?: number;
  };
};

type BaselineState = {
  monthly_net_income_confirmed?: number;
  monthly_net_income_verified?: boolean;
  recurring_core_obligations_total?: number;
};

type AgentReply = {
  id: string;
  sender_type: 'agent';
  sender_key: string;
  sender_name: string;
  message_kind: ConversationMessageKind;
  body: string;
  structured_data: Record<string, unknown>;
  created_at?: string;
};

const arabicDigits: Record<string, string> = {
  '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
  '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9',
};

function normalizeDigits(value: string) {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => arabicDigits[digit] ?? digit);
}

function purposeFrom(text: string) {
  const patterns = [
    /(?:الغرض|السبب|لأجل|لاجل|لـ)\s*[:\-]?\s*([^،,\n\d]{2,100})/i,
    /(?:تمويل|أمول|امول)\s+([^،,\n\d]{2,100}?)(?=\s+\d|$)/i,
  ];
  for (const pattern of patterns) {
    const value = text.match(pattern)?.[1]?.trim();
    if (value) return value.replace(/\s+/g, ' ').slice(0, 100);
  }
  return null;
}

function requestedAmountFrom(text: string) {
  const explicit = /(?:مبلغ|تمويل|احتاج|أحتاج|أبغى|ابغى)[^\d٠-٩۰-۹]{0,20}([\d٠-٩۰-۹,.]+)/i.exec(text);
  if (explicit?.[1]) {
    const value = Number(normalizeDigits(explicit[1]).replace(/,/g, ''));
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

function installmentFrom(text: string) {
  const explicit = /(?:قسط|القسط|سداد|السداد)\s*(?:المتوقع|الشهري)?[^\d٠-٩۰-۹]{0,20}([\d٠-٩۰-۹,.]+)/i.exec(text);
  if (!explicit?.[1]) return null;
  const value = Number(normalizeDigits(explicit[1]).replace(/,/g, ''));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function cyclesFrom(text: string) {
  const match = /([\d٠-٩۰-۹]+)\s*(?:شهر|أشهر|اشهر|دورة|دورات)/i.exec(text);
  if (!match?.[1]) return null;
  const value = Number(normalizeDigits(match[1]));
  return Number.isInteger(value) && value > 0 ? value : null;
}

function repaymentSourceFrom(text: string) {
  const patterns = [
    /(?:مصدر\s+السداد|السداد\s+من)\s*[:\-]?\s*([^،,\n]{2,120})/i,
    /(?:بسدد|سأسدد|سوف\s+أسدد)\s+من\s+([^،,\n]{2,120})/i,
  ];
  for (const pattern of patterns) {
    const value = text.match(pattern)?.[1]?.trim();
    if (value) return value.replace(/\s+/g, ' ').slice(0, 120);
  }
  return null;
}

function incomePatternFrom(text: string): FinancingDraft['income_pattern'] | null {
  if (/(الدخل|راتبي|الراتب).*(ثابت|منتظم)/i.test(text)) return 'STABLE';
  if (/(الدخل|راتبي|الراتب).*(متغير|غير\s+ثابت)/i.test(text)) return 'VARIABLE';
  if (/(الدخل|راتبي|الراتب).*(موسمي|موسمية)/i.test(text)) return 'SEASONAL';
  return null;
}

function importanceFrom(text: string): FinancingDraft['funded_item_importance'] | null {
  if (/(الغرض|البند|التمويل).*(أساسي|اساسي|ضروري|ضرورة)/i.test(text)) return 'ESSENTIAL';
  if (/(الغرض|البند|التمويل).*(مهم)/i.test(text)) return 'IMPORTANT';
  if (/(الغرض|البند|التمويل).*(اختياري|كمالي|كماليات)/i.test(text)) return 'DISCRETIONARY';
  return null;
}

function isFinancingMessage(text: string) {
  return /(تمويل|قرض|قسط|سداد|أمول|امول)/i.test(text);
}

function isCancellation(text: string) {
  const normalized = text.trim().replace(/[.!؟?]+$/g, '');
  return /^(الغاء|إلغاء|ألغي|الغي|اتراجع|أتراجع|رفض|ارفض|أرفض)$/i.test(normalized);
}

function formatSar(value: number) {
  return new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 }).format(value);
}

export function parseFinancingDraft(text: string, previous: FinancingDraft = {}): FinancingDraft {
  const purpose = purposeFrom(text);
  const requested = requestedAmountFrom(text);
  const installment = installmentFrom(text);
  const cycles = cyclesFrom(text);
  const repaymentSource = repaymentSourceFrom(text);
  const incomePattern = incomePatternFrom(text);
  const importance = importanceFrom(text);
  return {
    ...previous,
    ...(purpose ? { purpose } : {}),
    ...(requested !== null ? { requested_amount: requested } : {}),
    ...(installment !== null ? { expected_installment: installment } : {}),
    ...(cycles !== null ? { repayment_cycles: cycles } : {}),
    ...(repaymentSource ? { repayment_source: repaymentSource } : {}),
    ...(incomePattern ? { income_pattern: incomePattern } : {}),
    ...(importance ? { funded_item_importance: importance } : {}),
    updated_at: new Date().toISOString(),
  };
}

function missingFields(draft: FinancingDraft, baseline: BaselineState) {
  const missing: string[] = [];
  if (!draft.purpose) missing.push('financing_purpose');
  if (typeof draft.requested_amount !== 'number') missing.push('requested_amount');
  if (typeof draft.expected_installment !== 'number') missing.push('expected_installment');
  if (typeof baseline.monthly_net_income_confirmed !== 'number') missing.push('monthly_net_income');
  if (typeof baseline.recurring_core_obligations_total !== 'number') missing.push('recurring_core_obligations');
  return missing;
}

async function readContext(userId: string) {
  const sql = getRawSql();
  const rows = await sql`select room_key,metadata from public.conversation_threads where user_id=${userId} and room_key in ('central','hilal')`;
  const central = rows.find((row) => row.room_key === 'central');
  const hilal = rows.find((row) => row.room_key === 'hilal');
  const centralMetadata = central?.metadata && typeof central.metadata === 'object' ? central.metadata as Record<string, unknown> : {};
  const hilalMetadata = hilal?.metadata && typeof hilal.metadata === 'object' ? hilal.metadata as HilalMetadata : {};
  const baseline = centralMetadata.financial_baseline && typeof centralMetadata.financial_baseline === 'object'
    ? centralMetadata.financial_baseline as BaselineState
    : {};
  return { baseline, hilalMetadata };
}

async function persistReply(userId: string, metadata: HilalMetadata, body: string, kind: ConversationMessageKind, structured: Record<string, unknown>) {
  const sql = getRawSql();
  const rows = await sql`select id from public.conversation_threads where user_id=${userId} and room_key='hilal' limit 1`;
  const threadId = rows[0]?.id as string | undefined;
  if (!threadId) return null;
  const participant = governedRooms.hilal.participants[0];
  const agent = participant ?? { key: 'hilal-agent', name: governedRooms.hilal.title };
  const result = await sql.transaction([
    sql`insert into public.conversation_messages (id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data)
      values (${randomUUID()},${threadId},${userId},'agent',${agent.key},${agent.name},${kind},${body},${JSON.stringify(structured)}::jsonb)
      returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at`,
    sql`update public.conversation_threads set metadata=${JSON.stringify(metadata)}::jsonb,updated_at=now() where id=${threadId} and user_id=${userId} returning id`,
  ]);
  return (result[0]?.[0] ?? null) as AgentReply | null;
}

export async function createHilalFinancingReply(userId: string, userText: string): Promise<AgentReply | null> {
  const { baseline, hilalMetadata } = await readContext(userId);
  const active = hilalMetadata.financing_state?.active_request;
  if (!active && !isFinancingMessage(userText)) return null;

  if (active && isCancellation(userText)) {
    const nextMetadata: HilalMetadata = { ...hilalMetadata, financing_state: {} };
    return persistReply(userId, nextMetadata, 'تم إلغاء دراسة التمويل. لم ينفذ نماء أي تحويل أو التزام مالي.', 'request', {
      decision_state: 'NEEDS_DATA',
      financing_cancelled: true,
      execution_boundary: 'advisory_only',
    });
  }

  const draft = parseFinancingDraft(userText, active ?? {});
  const nextMetadata: HilalMetadata = {
    ...hilalMetadata,
    financing_state: { active_request: draft },
  };
  const missing = missingFields(draft, baseline);

  if (missing.length) {
    const body = `دراسة التمويل غير مكتملة. أحتاج: ${missing.map((item) => {
      if (item === 'financing_purpose') return 'غرض التمويل';
      if (item === 'requested_amount') return 'مبلغ التمويل';
      if (item === 'expected_installment') return 'القسط أو السداد الشهري المتوقع';
      if (item === 'monthly_net_income') return 'الدخل الشهري المؤكد';
      return 'الالتزامات الأساسية المؤكدة';
    }).join('، ')}. لن أعتمد أي مبلغ قبل اكتمال هذه البيانات.`;
    return persistReply(userId, nextMetadata, body, 'request', {
      decision_state: 'NEEDS_DATA',
      financing_draft: draft,
      missing_fields: missing,
      requires_user_confirmation: false,
      execution_boundary: 'advisory_only',
    });
  }

  const protection = await getProtectionSnapshot(userId);
  if (!protection) {
    return persistReply(userId, nextMetadata, 'بيانات التمويل مكتملة، لكن بنك الملاءة لم يثبت بعد بيانات الحماية والسيولة. حالة الطلب NEEDS_DATA حتى تكتمل الملاءة.', 'request', {
      decision_state: 'NEEDS_DATA',
      financing_draft: draft,
      solvency_required: true,
      execution_boundary: 'advisory_only',
    });
  }

  const requested = draft.requested_amount!;
  const installment = draft.expected_installment!;
  const safeCapacity = protection.protected_pool_safe_capacity;
  const projectedCoreObligations = baseline.recurring_core_obligations_total! + installment;
  const income = baseline.monthly_net_income_confirmed!;
  const obligationRatioAfter = income > 0 ? projectedCoreObligations / income : null;
  const monthlyMarginAfter = income - projectedCoreObligations;
  const factorEvidence = evaluateHilalFactorEvidence({
    monthlyNetIncome: baseline.monthly_net_income_confirmed,
    recurringCoreObligations: baseline.recurring_core_obligations_total,
    repaymentSource: draft.repayment_source,
    repaymentSourceVerified: Boolean(draft.repayment_source && baseline.monthly_net_income_verified === true),
    incomePattern: draft.income_pattern,
    fundedItemImportance: draft.funded_item_importance,
  });
  const policyState = hilalMetadata.financing_state ?? {};
  const repaymentBand = computeApprovedRepaymentInstallmentBand(income, baseline.recurring_core_obligations_total!);
  const repaymentCapacity = await getHilalRepaymentCapacity(userId, {
    confirmedMonthlyIncome: income,
    recurringCoreObligations: baseline.recurring_core_obligations_total!,
    repaymentCycles: draft.repayment_cycles,
  });
  const automaticCalibration = scoreHilalFactorEvidence(factorEvidence);
  const missingEligibility = automaticCalibration.status === 'SCORED' ? [] : automaticCalibration.missing_factors;
  const eligibility = automaticCalibration.status === 'SCORED'
    ? evaluateHilalEligibility(automaticCalibration.scores)
    : null;
  const financeLimit = computeHilalFinanceLimit({
    repaymentCapacity: repaymentCapacity.repayment_capacity ?? undefined,
    policyCap: policyState.policy_cap,
    cashflowSafeLimit: safeCapacity,
  });
  const blockedByPolicyLimit = financeLimit.finance_limit !== null && requested > financeLimit.finance_limit;
  const installmentAboveApprovedBand = installment > repaymentBand.max_installment_from_safe_savings;
  const blocked = requested > safeCapacity || protection.commitment_gap > 0 || blockedByPolicyLimit || installmentAboveApprovedBand;

  if (blocked) {
    const excess = Math.max(requested - safeCapacity, 0);
    return persistReply(userId, nextMetadata,
`حالة الطلب BLOCKED. الطلب يكسر أحد حدود الحماية أو القدرة المعتمدة. السعة القابلة للاختبار ${formatSar(safeCapacity)} ريال، وفجوة الحماية ${formatSar(protection.commitment_gap)} ريال. نطاق القسط المبني على الوفر الآمن هو ${formatSar(repaymentBand.min_installment_from_safe_savings)}–${formatSar(repaymentBand.max_installment_from_safe_savings)} ريال وفق SET-HL-005، والقسط المقترح ${formatSar(installment)} ريال. لا ينتقل الطلب للمراجعة قبل معالجة الحد المتجاوز.`,
      'risk',
      {
        decision_state: 'BLOCKED',
        financing_purpose: draft.purpose,
        requested_amount: requested,
        expected_installment: installment,
        repayment_cycles: draft.repayment_cycles ?? null,
        safe_capacity: safeCapacity,
        excess_over_safe_capacity: excess,
        commitment_gap: protection.commitment_gap,
        near_goal_reserve_total: protection.near_goal_reserve_total,
        reserved_dated_obligations_total: protection.reserved_dated_obligations_total,
        monthly_income: income,
        obligations_before: baseline.recurring_core_obligations_total,
        obligations_after_installment: projectedCoreObligations,
        obligation_ratio_after: obligationRatioAfter,
        monthly_margin_after: monthlyMarginAfter,
        policy_version: HILAL_POLICY_VERSION,
        eligibility_weights: HILAL_ELIGIBILITY_WEIGHTS,
        eligibility_score: eligibility?.weighted_score ?? null,
        eligibility_band: eligibility?.band ?? null,
        missing_eligibility_factors: missingEligibility,
        factor_evidence: factorEvidence.factors,
        raw_evidence_complete: factorEvidence.raw_evidence_complete,
        calibration_required_factors: factorEvidence.calibration_required_factors,
        finance_limit_components: financeLimit,
        repayment_installment_band: repaymentBand,
        repayment_capacity_evidence: repaymentCapacity,
        installment_above_approved_band: installmentAboveApprovedBand,
        calibration_status: automaticCalibration.status,
        calibration_id: automaticCalibration.calibration_id,
        execution_boundary: 'advisory_only',
      },
    );
  }

  if (factorEvidence.missing_evidence_factors.length > 0) {
    const nextFactor = factorEvidence.missing_evidence_factors[0];
    const question = nextFactor === 'repayment_source_clarity'
      ? 'ما مصدر السداد المحدد لهذا التمويل؟ اذكر المصدر بوضوح، ولن أعتبر دخلًا لم يصل أو دخلًا غير موثوق مصدرًا مؤكدًا.'
      : nextFactor === 'income_stability'
        ? 'كيف تصف نمط دخلك الحالي: ثابت، متغير، أم موسمي؟ سأحفظها كإفادة أولية ولا أرفعها إلى دليل موثق دون سجل داعم.'
        : nextFactor === 'funded_item_importance'
          ? 'صنّف الغرض نفسه فقط: أساسي، مهم، أم اختياري؟ لا أستنتج أهمية البند من اسمه وحده.'
          : 'أحتاج استكمال دليل مالي إضافي قبل احتساب أهلية بنك الهلال.';
    return persistReply(userId, nextMetadata, `حالة الطلب UNDER_REVIEW. اجتاز الطلب حاجز الحماية، لكن أهلية الهلال لا تُحسب قبل استكمال أدلة عوامل السياسة. ${question}`, 'request', {
      decision_state: 'UNDER_REVIEW',
      protection_gate_state: 'PASSES_PROTECTION_GATE',
      financing_purpose: draft.purpose,
      requested_amount: requested,
      expected_installment: installment,
      safe_capacity: safeCapacity,
      factor_evidence: factorEvidence.factors,
      missing_eligibility_evidence: factorEvidence.missing_evidence_factors,
      calibration_required_factors: factorEvidence.calibration_required_factors,
      calibration_status: automaticCalibration.status,
      calibration_id: automaticCalibration.calibration_id,
      repayment_installment_band: repaymentBand,
      repayment_capacity_evidence: repaymentCapacity,
      policy_version: HILAL_POLICY_VERSION,
      execution_boundary: 'advisory_only',
    });
  }

  const repaymentNote = repaymentCapacity.repayment_capacity === null
    ? 'تعذر إكمال REPAYMENT_CAPACITY لأن مدة السداد غير محددة أو لا يوجد دخل راتب متحقق في الدورة الحالية.'
    : `قدرة السداد الأولية قبل التسعير ${formatSar(repaymentCapacity.repayment_capacity)} ريال، مبنية على دخل راتب متحقق قدره ${formatSar(repaymentCapacity.realized_salary_income)} ريال وبأساس متحفظ لا يتجاوز الدخل الشهري المؤكد.`;
  const passesBody = eligibility
    ? `حالة الحماية PASSES_PROTECTION_GATE. درجة أهلية بنك الهلال وفق السياسة المعتمدة ${eligibility.weighted_score} من 100 (${eligibility.decision_ar}). ${repaymentNote} يبقى الطلب UNDER_REVIEW حتى يكتمل POLICY_CAP وسقف التمويل النهائي، ولا يعد ذلك تنفيذًا ماليًا.`
    : `حالة الحماية PASSES_PROTECTION_GATE: مبلغ التمويل ${formatSar(requested)} ريال يقع داخل السعة الآمنة الحالية ${formatSar(safeCapacity)} ريال. بعد إضافة قسط متوقع قدره ${formatSar(installment)} ريال تصبح الالتزامات الشهرية ${formatSar(projectedCoreObligations)} ريال والهامش الشهري الحسابي ${formatSar(monthlyMarginAfter)} ريال. ${repaymentNote} تم ربط سياسة بنك الهلال المعتمدة، لكن درجة الأهلية لا تُحسب حتى تكتمل المعايرة الرقمية المعتمدة.`;
  return persistReply(userId, nextMetadata, passesBody, 'recommendation', {
    decision_state: 'UNDER_REVIEW',
    protection_gate_state: 'PASSES_PROTECTION_GATE',
    financing_purpose: draft.purpose,
    requested_amount: requested,
    expected_installment: installment,
    repayment_cycles: draft.repayment_cycles ?? null,
    safe_capacity: safeCapacity,
    remaining_safe_capacity: safeCapacity - requested,
    near_goal_reserve_total: protection.near_goal_reserve_total,
    reserved_dated_obligations_total: protection.reserved_dated_obligations_total,
    monthly_income: income,
    obligations_before: baseline.recurring_core_obligations_total,
    obligations_after_installment: projectedCoreObligations,
    obligation_ratio_after: obligationRatioAfter,
    monthly_margin_after: monthlyMarginAfter,
    policy_version: HILAL_POLICY_VERSION,
    eligibility_weights: HILAL_ELIGIBILITY_WEIGHTS,
    eligibility_score: eligibility?.weighted_score ?? null,
    eligibility_band: eligibility?.band ?? null,
    missing_eligibility_factors: missingEligibility,
    factor_evidence: factorEvidence.factors,
    raw_evidence_complete: factorEvidence.raw_evidence_complete,
    calibration_required_factors: factorEvidence.calibration_required_factors,
    finance_limit_components: financeLimit,
    repayment_installment_band: repaymentBand,
    repayment_capacity_evidence: repaymentCapacity,
    calibration_status: automaticCalibration.status,
    calibration_id: automaticCalibration.calibration_id,
    policy_threshold_applied: eligibility !== null,
    requires_policy_review: eligibility === null || !financeLimit.limit_complete,
    execution_boundary: 'advisory_only',
  });
}
