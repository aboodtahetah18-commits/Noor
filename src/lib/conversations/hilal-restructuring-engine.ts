import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import { getHilalRepaymentCapacity } from './hilal-repayment-capacity';
import {
  getHilalCaseAppliedRestructuringCount,
  recordHilalRestructuringEvent,
} from './hilal-restructuring-ledger';
import type { ConversationMessageKind } from './store';
import { governedRooms } from './store';

type RestructuringDraft = {
  case_id?: string;
  case_title?: string;
  category_id?: string | null;
  root_cause?: string;
  requested_monthly_cap?: number;
  requested_cycles?: number;
  request_event_recorded?: boolean;
  proposal?: {
    remaining_amount: number;
    current_remaining_installments: number;
    current_next_installment_amount: number | null;
    proposed_monthly_repayment: number;
    proposed_cycles: number;
    safe_monthly_capacity: number;
    feasible: boolean;
    reason: string;
  };
  updated_at?: string;
};

type HilalMetadata = Record<string, unknown> & {
  restructuring_state?: {
    active_request?: RestructuringDraft;
    last_approved?: Record<string, unknown>;
  };
};

type BaselineState = {
  monthly_net_income_confirmed?: number;
  recurring_core_obligations_total?: number;
};

type FundingCase = {
  id: string;
  title: string;
  status: string;
  category_id: string | null;
  category_name: string | null;
  remaining_amount: number;
  remaining_installments: number;
  next_installment_number: number | null;
  next_installment_amount: number | null;
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

function normalizeArabic(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[إأآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\u0600-\u06FFa-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ');
}

function isRestructuringIntent(text: string) {
  return /(إعادة\s*جدول|اعادة\s*جدول|جدولة|تعثر|متعثر|تأخر|متأخر|تعديل\s+(?:القسط|السداد)|خفض\s+القسط|تخفيف\s+القسط)/i.test(text);
}

function isConfirmation(text: string) {
  const normalized = text.trim().replace(/[.!؟?]+$/g, '');
  return /^(تأكيد|اكد|أكد|اعتمد|موافق|نعم|تمام)$/i.test(normalized);
}

function isCancellation(text: string) {
  const normalized = text.trim().replace(/[.!؟?]+$/g, '');
  return /^(الغاء|إلغاء|ألغي|الغي|اتراجع|أتراجع|رفض|ارفض|أرفض)$/i.test(normalized);
}

function extractRootCause(text: string) {
  const patterns = [
    /(?:السبب|بسبب|سبب\s+التعثر|سبب\s+التأخر)\s*[:\-]?\s*([^،,\n]{3,180})/i,
    /(?:تعثر|تأخرت|متأخر)\s+(?:لأن|لان|بسبب)\s+([^،,\n]{3,180})/i,
  ];
  for (const pattern of patterns) {
    const value = text.match(pattern)?.[1]?.trim();
    if (value) return value.replace(/\s+/g, ' ').slice(0, 180);
  }
  return null;
}

function extractMonthlyCap(text: string) {
  const match = /(?:قسط|القسط|حد\s+شهري|سداد\s+شهري|أقدر\s+أسدد|اقدر\s+اسدد)[^\d٠-٩۰-۹]{0,20}([\d٠-٩۰-۹,.]+)/i.exec(text);
  if (!match?.[1]) return null;
  const value = Number(normalizeDigits(match[1]).replace(/,/g, ''));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function extractCycles(text: string) {
  const match = /([\d٠-٩۰-۹]+)\s*(?:شهر|أشهر|اشهر|دورة|دورات)/i.exec(text);
  if (!match?.[1]) return null;
  const value = Number(normalizeDigits(match[1]));
  return Number.isInteger(value) && value > 0 ? value : null;
}

function formatSar(value: number) {
  return new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 }).format(value);
}

function chooseCase(text: string, cases: FundingCase[]) {
  if (!cases.length) return null;
  if (cases.length === 1) return cases[0] ?? null;
  const normalized = normalizeArabic(text);
  const ranked = cases
    .map((item) => {
      const title = normalizeArabic(item.title);
      const category = normalizeArabic(item.category_name ?? '');
      let score = 0;
      if (title && normalized.includes(title)) score += 100;
      if (category && normalized.includes(category)) score += 80;
      return { item, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  if (!ranked[0] || (ranked[1] && ranked[1].score === ranked[0].score)) return null;
  return ranked[0].item;
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

async function listCases(userId: string): Promise<FundingCase[]> {
  const sql = getRawSql();
  const rows = await sql`
    with case_schedule as (
      select
        rs.case_id,
        coalesce(sum(rs.total_amount) filter(where rs.status='PLANNED'),0) as remaining_amount,
        count(distinct rs.installment_number) filter(where rs.status='PLANNED')::int as remaining_installments,
        min(rs.installment_number) filter(where rs.status='PLANNED')::int as next_installment_number
      from public.internal_funding_recovery_schedule rs
      where rs.user_id=${userId}
      group by rs.case_id
    ),
    next_installment as (
      select
        rs.case_id,
        rs.installment_number,
        sum(rs.total_amount) as next_installment_amount
      from public.internal_funding_recovery_schedule rs
      join case_schedule cs on cs.case_id=rs.case_id and cs.next_installment_number=rs.installment_number
      where rs.user_id=${userId} and rs.status='PLANNED'
      group by rs.case_id,rs.installment_number
    )
    select
      c.id::text,
      c.title,
      c.status,
      c.target_category_id::text as category_id,
      bc.name as category_name,
      coalesce(cs.remaining_amount,0)::text as remaining_amount,
      coalesce(cs.remaining_installments,0)::int as remaining_installments,
      cs.next_installment_number,
      ni.next_installment_amount::text as next_installment_amount
    from public.internal_funding_cases c
    left join public.budget_categories bc on bc.id=c.target_category_id and bc.user_id=c.user_id
    left join case_schedule cs on cs.case_id=c.id
    left join next_installment ni on ni.case_id=c.id
    where c.user_id=${userId}
      and c.status in ('ACTIVE','RECOVERY')
    order by case when c.status='RECOVERY' then 0 else 1 end,c.created_at desc
    limit 20
  `;
  return rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    status: String(row.status),
    category_id: row.category_id ? String(row.category_id) : null,
    category_name: row.category_name ? String(row.category_name) : null,
    remaining_amount: Number(row.remaining_amount ?? 0),
    remaining_installments: Number(row.remaining_installments ?? 0),
    next_installment_number: row.next_installment_number == null ? null : Number(row.next_installment_number),
    next_installment_amount: row.next_installment_amount == null ? null : Number(row.next_installment_amount),
  }));
}

async function persistReply(
  userId: string,
  metadata: HilalMetadata,
  body: string,
  kind: ConversationMessageKind,
  structured: Record<string, unknown>,
) {
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

export function buildHilalRestructuringProposal(
  selectedCase: FundingCase,
  safeMonthlyCapacity: number,
  requestedMonthlyCap?: number,
  requestedCycles?: number,
) {
  const remaining = Math.max(selectedCase.remaining_amount, 0);
  if (remaining <= 0) {
    return {
      remaining_amount: 0,
      current_remaining_installments: selectedCase.remaining_installments,
      current_next_installment_amount: selectedCase.next_installment_amount,
      proposed_monthly_repayment: 0,
      proposed_cycles: 0,
      safe_monthly_capacity: safeMonthlyCapacity,
      feasible: false,
      reason: 'لا يوجد رصيد استرداد قائم يحتاج إعادة جدولة.',
    };
  }
  if (safeMonthlyCapacity <= 0) {
    return {
      remaining_amount: remaining,
      current_remaining_installments: selectedCase.remaining_installments,
      current_next_installment_amount: selectedCase.next_installment_amount,
      proposed_monthly_repayment: 0,
      proposed_cycles: 0,
      safe_monthly_capacity: 0,
      feasible: false,
      reason: 'لا توجد سعة شهرية آمنة مثبتة حاليًا لبناء خطة جديدة.',
    };
  }

  let monthly = requestedMonthlyCap ? Math.min(requestedMonthlyCap, safeMonthlyCapacity) : safeMonthlyCapacity;
  let cycles = requestedCycles ?? Math.ceil(remaining / monthly);

  if (requestedCycles) {
    cycles = requestedCycles;
    monthly = Math.ceil((remaining / cycles) * 100) / 100;
  }

  if (!Number.isInteger(cycles) || cycles < 1 || cycles > 36) {
    return {
      remaining_amount: remaining,
      current_remaining_installments: selectedCase.remaining_installments,
      current_next_installment_amount: selectedCase.next_installment_amount,
      proposed_monthly_repayment: monthly,
      proposed_cycles: cycles,
      safe_monthly_capacity: safeMonthlyCapacity,
      feasible: false,
      reason: 'الخطة تتجاوز حد 36 دورة أو تحتوي مدة غير صالحة.',
    };
  }

  if (monthly > safeMonthlyCapacity) {
    return {
      remaining_amount: remaining,
      current_remaining_installments: selectedCase.remaining_installments,
      current_next_installment_amount: selectedCase.next_installment_amount,
      proposed_monthly_repayment: monthly,
      proposed_cycles: cycles,
      safe_monthly_capacity: safeMonthlyCapacity,
      feasible: false,
      reason: 'القسط الناتج يتجاوز السعة الشهرية الآمنة الحالية.',
    };
  }

  return {
    remaining_amount: remaining,
    current_remaining_installments: selectedCase.remaining_installments,
    current_next_installment_amount: selectedCase.next_installment_amount,
    proposed_monthly_repayment: monthly,
    proposed_cycles: cycles,
    safe_monthly_capacity: safeMonthlyCapacity,
    feasible: true,
    reason: 'الخطة المقترحة تبقي القسط داخل السعة الشهرية الآمنة ولا تعد تنفيذًا ماليًا.',
  };
}

export async function createHilalRestructuringReply(userId: string, userText: string): Promise<AgentReply | null> {
  const { baseline, hilalMetadata } = await readContext(userId);
  const active = hilalMetadata.restructuring_state?.active_request;
  if (!active && !isRestructuringIntent(userText)) return null;

  if (active && isCancellation(userText)) {
    if (active.case_id && active.request_event_recorded) {
      try {
        await recordHilalRestructuringEvent(userId, {
          caseId: active.case_id,
          categoryId: active.category_id,
          eventType: 'CANCELLED',
          rootCause: active.root_cause,
          proposedPlan: active.proposal ?? null,
          reason: 'Cancelled by user in Hilal governed conversation.',
        });
      } catch {
        // Clearing the conversational draft must not execute or fabricate a ledger write.
      }
    }
    const nextMetadata: HilalMetadata = {
      ...hilalMetadata,
      restructuring_state: { ...hilalMetadata.restructuring_state, active_request: undefined },
    };
    return persistReply(userId, nextMetadata, 'تم إلغاء دراسة إعادة الجدولة. لم أعدل جدول السداد ولم أنفذ أي حركة مالية.', 'request', {
      restructuring_state: 'CANCELLED',
      execution_boundary: 'advisory_only',
    });
  }

  const cases = await listCases(userId);
  if (!cases.length) {
    return persistReply(userId, hilalMetadata, 'لا يوجد تمويل نشط أو تحت الاسترداد يمكن إعادة جدولته حاليًا.', 'request', {
      restructuring_state: 'NO_ACTIVE_FUNDING',
      execution_boundary: 'advisory_only',
    });
  }

  const selected = active?.case_id
    ? cases.find((item) => item.id === active.case_id) ?? null
    : chooseCase(userText, cases);

  if (!selected) {
    return persistReply(userId, hilalMetadata,
      `يوجد أكثر من تمويل قائم. حدد التمويل المقصود بالاسم أو البند: ${cases.map((item) => item.category_name ? `${item.title} (${item.category_name})` : item.title).join('، ')}.`,
      'request',
      {
        restructuring_state: 'CASE_SELECTION_REQUIRED',
        available_cases: cases.map((item) => ({
          case_id: item.id,
          title: item.title,
          category_name: item.category_name,
          status: item.status,
          remaining_amount: item.remaining_amount,
        })),
        execution_boundary: 'advisory_only',
      },
    );
  }

  const caseCount = await getHilalCaseAppliedRestructuringCount(userId, selected.id);
  if (caseCount.precautionary_cap_reached) {
    return persistReply(userId, hilalMetadata,
      'هذا التمويل بلغ ثلاث إعادات جدولة مطبقة، وهو السقف الاحترازي المعتمد. لا أوصي بخطة إعادة جدولة جديدة قبل مراجعة سبب العجز هيكليًا وتصعيد الحالة.',
      'risk',
      {
        restructuring_state: 'PRECAUTIONARY_CAP_REACHED',
        case_id: selected.id,
        case_title: selected.title,
        applied_restructuring_count: caseCount.applied_count,
        precautionary_cap: 3,
        execution_boundary: 'advisory_only',
      },
    );
  }

  const rootCause = extractRootCause(userText) ?? active?.root_cause;
  const monthlyCap = extractMonthlyCap(userText) ?? active?.requested_monthly_cap;
  const cycles = extractCycles(userText) ?? active?.requested_cycles;

  let draft: RestructuringDraft = {
    ...active,
    case_id: selected.id,
    case_title: selected.title,
    category_id: selected.category_id,
    ...(rootCause ? { root_cause: rootCause } : {}),
    ...(monthlyCap ? { requested_monthly_cap: monthlyCap } : {}),
    ...(cycles ? { requested_cycles: cycles } : {}),
    updated_at: new Date().toISOString(),
  };

  if (!draft.root_cause) {
    const nextMetadata: HilalMetadata = {
      ...hilalMetadata,
      restructuring_state: { ...hilalMetadata.restructuring_state, active_request: draft },
    };
    return persistReply(userId, nextMetadata,
      `تم تحديد التمويل «${selected.title}». ما السبب الجذري الذي جعل جدول السداد الحالي غير مناسب أو أدى إلى التأخر؟ لن أعتمد إعادة الجدولة بدون سبب مسجل.`,
      'request',
      {
        restructuring_state: 'ROOT_CAUSE_REQUIRED',
        case_id: selected.id,
        case_title: selected.title,
        remaining_amount: selected.remaining_amount,
        execution_boundary: 'advisory_only',
      },
    );
  }

  if (typeof baseline.monthly_net_income_confirmed !== 'number' || typeof baseline.recurring_core_obligations_total !== 'number') {
    const nextMetadata: HilalMetadata = {
      ...hilalMetadata,
      restructuring_state: { ...hilalMetadata.restructuring_state, active_request: draft },
    };
    return persistReply(userId, nextMetadata,
      'أحتاج الدخل الشهري والالتزامات الأساسية المؤكدة قبل بناء خطة إعادة جدولة آمنة.',
      'request',
      {
        restructuring_state: 'BASELINE_REQUIRED',
        case_id: selected.id,
        execution_boundary: 'advisory_only',
      },
    );
  }

  const repayment = await getHilalRepaymentCapacity(userId, {
    confirmedMonthlyIncome: baseline.monthly_net_income_confirmed,
    recurringCoreObligations: baseline.recurring_core_obligations_total,
  });
  const proposal = buildHilalRestructuringProposal(selected, repayment.max_monthly_repayment, monthlyCap, cycles);
  draft = { ...draft, proposal };

  if (!proposal.feasible) {
    const nextMetadata: HilalMetadata = {
      ...hilalMetadata,
      restructuring_state: { ...hilalMetadata.restructuring_state, active_request: draft },
    };
    return persistReply(userId, nextMetadata,
      `لا أستطيع اعتماد إعادة الجدولة بهذه الصورة. ${proposal.reason}`,
      'risk',
      {
        restructuring_state: 'PROPOSAL_NOT_FEASIBLE',
        case_id: selected.id,
        case_title: selected.title,
        root_cause: draft.root_cause,
        previous_plan: {
          remaining_amount: selected.remaining_amount,
          remaining_installments: selected.remaining_installments,
          next_installment_amount: selected.next_installment_amount,
        },
        proposed_plan: proposal,
        repayment_capacity_evidence: repayment,
        execution_boundary: 'advisory_only',
      },
    );
  }

  if (!draft.request_event_recorded && caseCount.ledger_status === 'AVAILABLE') {
    await recordHilalRestructuringEvent(userId, {
      caseId: selected.id,
      categoryId: selected.category_id,
      eventType: 'REQUESTED',
      rootCause: draft.root_cause,
      previousPlan: {
        remaining_amount: selected.remaining_amount,
        remaining_installments: selected.remaining_installments,
        next_installment_number: selected.next_installment_number,
        next_installment_amount: selected.next_installment_amount,
      },
      proposedPlan: proposal,
      evidence: {
        safe_monthly_capacity: repayment.max_monthly_repayment,
        realized_salary_income: repayment.realized_salary_income,
      },
      reason: 'Created through governed Hilal restructuring conversation.',
    });
    draft = { ...draft, request_event_recorded: true };
  }

  if (isConfirmation(userText)) {
    if (caseCount.ledger_status !== 'AVAILABLE') {
      const nextMetadata: HilalMetadata = {
        ...hilalMetadata,
        restructuring_state: { ...hilalMetadata.restructuring_state, active_request: draft },
      };
      return persistReply(userId, nextMetadata,
        'الخطة جاهزة، لكن سجل إعادة الجدولة Canonical لم يُفعّل بعد في قاعدة البيانات. لن أسجل اعتمادًا غير قابل للتتبع قبل تطبيق الترحيل المطلوب.',
        'request',
        {
          restructuring_state: 'MIGRATION_REQUIRED',
          case_id: selected.id,
          proposed_plan: proposal,
          required_migration: '20260918_073_hilal_restructuring_events.sql',
          execution_boundary: 'advisory_only',
        },
      );
    }

    await recordHilalRestructuringEvent(userId, {
      caseId: selected.id,
      categoryId: selected.category_id,
      eventType: 'APPROVED',
      rootCause: draft.root_cause,
      previousPlan: {
        remaining_amount: selected.remaining_amount,
        remaining_installments: selected.remaining_installments,
        next_installment_number: selected.next_installment_number,
        next_installment_amount: selected.next_installment_amount,
      },
      proposedPlan: proposal,
      evidence: {
        safe_monthly_capacity: repayment.max_monthly_repayment,
        realized_salary_income: repayment.realized_salary_income,
      },
      reason: 'Approved internally by user confirmation; not yet applied to payment schedule.',
    });

    const approval = {
      case_id: selected.id,
      case_title: selected.title,
      root_cause: draft.root_cause,
      proposed_plan: proposal,
      approved_at: new Date().toISOString(),
      application_status: 'NOT_APPLIED',
    };
    const nextMetadata: HilalMetadata = {
      ...hilalMetadata,
      restructuring_state: {
        active_request: undefined,
        last_approved: approval,
      },
    };
    return persistReply(userId, nextMetadata,
      `تم اعتماد توصية إعادة الجدولة داخليًا للتمويل «${selected.title}»: ${formatSar(proposal.proposed_monthly_repayment)} ريال تقريبًا لكل دورة لمدة ${proposal.proposed_cycles} دورة. لم أعدل جدول السداد الفعلي ولم أنفذ أي تحويل. التطبيق ينتظر إجراء المستخدم وإثبات التنفيذ.`,
      'decision',
      {
        restructuring_state: 'APPROVED_NOT_APPLIED',
        case_id: selected.id,
        case_title: selected.title,
        root_cause: draft.root_cause,
        previous_plan: {
          remaining_amount: selected.remaining_amount,
          remaining_installments: selected.remaining_installments,
          next_installment_amount: selected.next_installment_amount,
        },
        proposed_plan: proposal,
        user_confirmed: true,
        execution_required_from_user: true,
        evidence_required_after_execution: true,
        execution_boundary: 'advisory_only',
      },
    );
  }

  const nextMetadata: HilalMetadata = {
    ...hilalMetadata,
    restructuring_state: { ...hilalMetadata.restructuring_state, active_request: draft },
  };
  return persistReply(userId, nextMetadata,
    `مقترح إعادة الجدولة للتمويل «${selected.title}»: الرصيد المتبقي ${formatSar(proposal.remaining_amount)} ريال. الخطة الحالية بها ${proposal.current_remaining_installments} دفعات متبقية، والقسط التالي ${proposal.current_next_installment_amount === null ? 'غير محدد' : `${formatSar(proposal.current_next_installment_amount)} ريال`}. المقترح الجديد ${formatSar(proposal.proposed_monthly_repayment)} ريال تقريبًا لكل دورة لمدة ${proposal.proposed_cycles} دورة، داخل سعة شهرية آمنة قدرها ${formatSar(proposal.safe_monthly_capacity)} ريال. اكتب «تأكيد» لاعتماد التوصية داخليًا فقط؛ لن يتم تعديل السداد أو تنفيذ أي تحويل تلقائيًا.`,
    'recommendation',
    {
      restructuring_state: 'PROPOSAL_READY',
      case_id: selected.id,
      case_title: selected.title,
      root_cause: draft.root_cause,
      applied_restructuring_count: caseCount.applied_count,
      precautionary_cap: 3,
      previous_plan: {
        remaining_amount: selected.remaining_amount,
        remaining_installments: selected.remaining_installments,
        next_installment_number: selected.next_installment_number,
        next_installment_amount: selected.next_installment_amount,
      },
      proposed_plan: proposal,
      repayment_capacity_evidence: repayment,
      ledger_status: caseCount.ledger_status,
      requires_user_confirmation: true,
      execution_boundary: 'advisory_only',
    },
  );
}
