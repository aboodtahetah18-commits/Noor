import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import { getProtectionSnapshot } from './solvency-engine';
import type { ConversationMessageKind } from './store';
import { governedRooms } from './store';

export type FinancingDecisionState = 'NEEDS_DATA' | 'BLOCKED' | 'PASSES_PROTECTION_GATE' | 'UNDER_REVIEW';

type FinancingDraft = {
  purpose?: string;
  requested_amount?: number;
  expected_installment?: number;
  repayment_cycles?: number;
  updated_at?: string;
};

type HilalMetadata = Record<string, unknown> & {
  financing_state?: {
    active_request?: FinancingDraft;
  };
};

type BaselineState = {
  monthly_net_income_confirmed?: number;
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

function amounts(text: string) {
  const normalized = normalizeDigits(text).replace(/,/g, '');
  return [...normalized.matchAll(/(?:^|\s)(\d+(?:\.\d+)?)(?=\s|$|\s*(?:ريال|ر\.س))/g)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value > 0);
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
  const values = amounts(text);
  if (!values.length) return null;
  const explicit = /(?:مبلغ|تمويل|احتاج|أحتاج|أبغى|ابغى)[^\d٠-٩۰-۹]{0,20}([\d٠-٩۰-۹,.]+)/i.exec(text);
  if (explicit?.[1]) {
    const value = Number(normalizeDigits(explicit[1]).replace(/,/g, ''));
    if (Number.isFinite(value) && value > 0) return value;
  }
  return values[0] ?? null;
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
  return {
    ...previous,
    ...(purpose ? { purpose } : {}),
    ...(requested !== null ? { requested_amount: requested } : {}),
    ...(installment !== null ? { expected_installment: installment } : {}),
    ...(cycles !== null ? { repayment_cycles: cycles } : {}),
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
  const blocked = requested > safeCapacity || protection.commitment_gap > 0;

  if (blocked) {
    const excess = Math.max(requested - safeCapacity, 0);
    return persistReply(userId, nextMetadata,
      `حالة الطلب BLOCKED. مبلغ التمويل ${formatSar(requested)} ريال يتجاوز السعة الآمنة الحالية أو توجد فجوة حماية قائمة. السعة القابلة للاختبار ${formatSar(safeCapacity)} ريال، وفجوة الحماية ${formatSar(protection.commitment_gap)} ريال. لا ينتقل الطلب للمراجعة قبل معالجة ذلك.`,
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
        execution_boundary: 'advisory_only',
      },
    );
  }

  const passesBody = `حالة الحماية PASSES_PROTECTION_GATE: مبلغ التمويل ${formatSar(requested)} ريال يقع داخل السعة الآمنة الحالية ${formatSar(safeCapacity)} ريال. بعد إضافة قسط متوقع قدره ${formatSar(installment)} ريال تصبح الالتزامات الشهرية ${formatSar(projectedCoreObligations)} ريال والهامش الشهري الحسابي ${formatSar(monthlyMarginAfter)} ريال. هذا لا يعني اعتماد التمويل؛ ينتقل الطلب الآن إلى UNDER_REVIEW لأننا لم نضع حد قدرة سداد اعتباطيًا دون سياسة معتمدة.`;
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
    policy_threshold_applied: false,
    requires_policy_review: true,
    execution_boundary: 'advisory_only',
  });
}
