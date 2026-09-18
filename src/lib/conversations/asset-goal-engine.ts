import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import { goalRepository } from '@/repositories/goal-repository';
import { getProtectionSnapshot } from './solvency-engine';
import type { ConversationMessageKind } from './store';
import { governedRooms } from './store';

type FundingSource = 'PROTECTED_POOL' | 'EXTERNAL_UNPROTECTED';

type GoalDraft = {
  name?: string;
  target_amount?: number;
  target_date?: string;
  funding_source?: FundingSource;
  updated_at?: string;
};

type AssetMetadata = Record<string, unknown> & {
  goal_chat_state?: {
    pending_goal?: GoalDraft;
  };
  goal_funding_sources?: Record<string, FundingSource>;
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

function normalizeDigits(value: string) {
  const digits: Record<string, string> = {
    '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
    '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9',
  };
  return value.replace(/[٠-٩۰-۹]/g, (digit) => digits[digit] ?? digit);
}

function firstAmount(text: string) {
  const normalized = normalizeDigits(text).replace(/,/g, '');
  const match = normalized.match(/(?:^|\s)(\d+(?:\.\d+)?)(?=\s|$|\s*(?:ريال|ر\.س))/);
  if (!match?.[1]) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function normalizedDate(text: string) {
  const normalized = normalizeDigits(text);
  const match = normalized.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (!match?.[1] || !match[2] || !match[3]) return null;
  const month = match[2].padStart(2, '0');
  const day = match[3].padStart(2, '0');
  const value = `${match[1]}-${month}-${day}`;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : value;
}

function goalName(text: string) {
  const normalized = normalizeDigits(text);
  const patterns = [
    /(?:هدف(?:ي)?|الهدف)\s*[:\-]?\s*([^\d،,]{2,80}?)(?=\s+\d|\s+(?:بمبلغ|بقيمة|بتاريخ|موعد|حتى)|$)/i,
    /(?:شراء|ادخار\s+ل(?:شراء)?)\s+([^\d،,]{2,80}?)(?=\s+\d|\s+(?:بمبلغ|بقيمة|بتاريخ|موعد|حتى)|$)/i,
    /اسم\s+الهدف\s*[:\-]\s*([^،,\n]{2,80})/i,
  ];
  for (const pattern of patterns) {
    const value = normalized.match(pattern)?.[1]?.trim();
    if (value) return value.replace(/\s+/g, ' ').slice(0, 80);
  }
  return null;
}

function fundingSource(text: string): FundingSource | null {
  if (/(خارج\s+أموال\s+الحماية|دخل\s+مستقبلي|دخل\s+قادم|راتب\s+قادم|مكافأة|مصدر\s+خارجي)/i.test(text)) return 'EXTERNAL_UNPROTECTED';
  if (/(من\s+(?:السيولة|الاحتياط|الاحتياطي|أموال\s+الحماية)|السيولة\s+الحالية|احتياطي\s+الطوارئ)/i.test(text)) return 'PROTECTED_POOL';
  return null;
}

function isConfirmation(text: string) {
  const normalized = text.trim().replace(/[.!؟?]+$/g, '');
  return /^(نعم|اي|إي|ايوه|أيوه|صحيح|تأكيد|اكد|أكد|اعتمد|موافق|تمام|صح)$/i.test(normalized);
}

function isRejection(text: string) {
  const normalized = text.trim().replace(/[.!؟?]+$/g, '');
  return /^(لا|غير صحيح|خطأ|غلط|ارفض|أرفض|رفض|الغاء|إلغاء)$/i.test(normalized);
}

function isGoalMessage(text: string) {
  return /(هدف|أهداف|اهداف|ادخار|أدخر|اوفر|أوفر|شراء)/i.test(text);
}

function formatSar(value: number) {
  return new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 }).format(value);
}

function sourceLabel(source: FundingSource) {
  return source === 'PROTECTED_POOL' ? 'أموال الحماية/السيولة الحالية' : 'مصدر خارجي أو دخل مستقبلي غير محقق بعد';
}

export function parseGoalDraft(text: string, previous: GoalDraft = {}): GoalDraft {
  const amount = firstAmount(text);
  const date = normalizedDate(text);
  const name = goalName(text);
  const source = fundingSource(text);
  return {
    ...previous,
    ...(name ? { name } : {}),
    ...(amount !== null ? { target_amount: amount } : {}),
    ...(date ? { target_date: date } : {}),
    ...(source ? { funding_source: source } : {}),
    updated_at: new Date().toISOString(),
  };
}

function missingFields(draft: GoalDraft) {
  const missing: string[] = [];
  if (!draft.name) missing.push('اسم الهدف');
  if (typeof draft.target_amount !== 'number') missing.push('قيمة الهدف');
  if (!draft.target_date) missing.push('تاريخ الحاجة للمال');
  if (!draft.funding_source) missing.push('مصدر تمويل الهدف');
  return missing;
}

async function persistAssetReply(
  userId: string,
  metadata: AssetMetadata,
  body: string,
  kind: ConversationMessageKind,
  structured: Record<string, unknown>,
) {
  const sql = getRawSql();
  const rows = await sql`select id from public.conversation_threads where user_id=${userId} and room_key='assets' limit 1`;
  const threadId = rows[0]?.id as string | undefined;
  if (!threadId) return null;
  const participant = governedRooms.assets.participants[0];
  const agent = participant ?? { key: 'assets-agent', name: governedRooms.assets.title };
  const result = await sql.transaction([
    sql`insert into public.conversation_messages (id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data)
      values (${randomUUID()},${threadId},${userId},'agent',${agent.key},${agent.name},${kind},${body},${JSON.stringify(structured)}::jsonb)
      returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at`,
    sql`update public.conversation_threads set metadata=${JSON.stringify(metadata)}::jsonb,updated_at=now() where id=${threadId} and user_id=${userId} returning id`,
  ]);
  return (result[0]?.[0] ?? null) as AgentReply | null;
}

async function readAssetMetadata(userId: string): Promise<AssetMetadata> {
  const sql = getRawSql();
  const rows = await sql`select metadata from public.conversation_threads where user_id=${userId} and room_key='assets' limit 1`;
  return rows[0]?.metadata && typeof rows[0].metadata === 'object' ? rows[0].metadata as AssetMetadata : {};
}

export async function createAssetGoalReply(userId: string, userText: string): Promise<AgentReply | null> {
  const metadata = await readAssetMetadata(userId);
  const pending = metadata.goal_chat_state?.pending_goal;

  if (!pending && !isGoalMessage(userText)) return null;

  if (pending && isRejection(userText)) {
    const nextMetadata: AssetMetadata = { ...metadata, goal_chat_state: {} };
    return persistAssetReply(userId, nextMetadata, 'تم إلغاء مسودة الهدف ولم أحجز أي مبلغ. يمكنك إنشاء هدف جديد في أي وقت.', 'request', {
      goal_reservation_cancelled: true,
      execution_boundary: 'advisory_only',
    });
  }

  if (pending && isConfirmation(userText)) {
    const missing = missingFields(pending);
    if (missing.length) {
      return persistAssetReply(userId, metadata, `لا أستطيع اعتماد الهدف بعد. البيانات الناقصة: ${missing.join('، ')}.`, 'request', {
        goal_draft: pending,
        missing_fields: missing,
        requires_user_confirmation: true,
        execution_boundary: 'advisory_only',
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    if (pending.target_date! < today) {
      return persistAssetReply(userId, metadata, 'تاريخ الهدف المدخل مضى بالفعل. أرسل تاريخًا مستقبليًا صحيحًا قبل الاعتماد.', 'request', {
        goal_draft: pending,
        invalid_target_date: true,
        execution_boundary: 'advisory_only',
      });
    }

    const protectionBefore = await getProtectionSnapshot(userId);
    const goalId = await goalRepository.create(userId, {
      name: pending.name!,
      targetAmount: pending.target_amount!.toFixed(2),
      openingBalance: '0.00',
      startDate: today,
      targetDate: pending.target_date!,
      idempotencyKey: `chat-goal-${randomUUID()}`,
    });
    const status = await goalRepository.applyEvent(userId, goalId, 'ACTIVATE_GOAL', 'Created and confirmed through governed assets conversation.');
    const sources = { ...(metadata.goal_funding_sources ?? {}), [goalId]: pending.funding_source! };
    const protectionAfter = await getProtectionSnapshot(userId, { [goalId]: pending.funding_source! });
    const safeBefore = protectionBefore?.protected_pool_safe_capacity ?? null;
    const safeAfter = protectionAfter?.protected_pool_safe_capacity ?? null;
    const capacityReduction = typeof safeBefore === 'number' && typeof safeAfter === 'number' ? Math.max(safeBefore - safeAfter, 0) : null;
    const nextMetadata: AssetMetadata = {
      ...metadata,
      goal_chat_state: {},
      goal_funding_sources: sources,
    };
    const body = pending.funding_source === 'PROTECTED_POOL'
      ? `تم إنشاء الهدف «${pending.name}» بقيمة ${formatSar(pending.target_amount!)} ريال وتاريخ ${pending.target_date}. مصدره أموال الحماية/السيولة الحالية، لذلك سيدخل فورًا في حساب الحجوزات إذا كان موعده قريبًا، وقد يخفض السعة المتاحة للاستثمار أو التمويل.`
      : `تم إنشاء الهدف «${pending.name}» بقيمة ${formatSar(pending.target_amount!)} ريال وتاريخ ${pending.target_date}. سجلت مصدره كمصدر خارجي أو دخل مستقبلي غير محقق بعد؛ لن أعتبر هذا الدخل سيولة متاحة الآن، ولن أسحبه تلقائيًا من أموال الحماية.`;
    return persistAssetReply(userId, nextMetadata, body, 'decision', {
      goal_id: goalId,
      goal_status: status,
      goal_name: pending.name,
      target_amount: pending.target_amount,
      target_date: pending.target_date,
      funding_source: pending.funding_source,
      user_confirmed: true,
      external_execution: false,
      safe_capacity_before_goal: safeBefore,
      safe_capacity_after_goal: safeAfter,
      safe_capacity_reduction: capacityReduction,
      reserved_near_goal_total_after: protectionAfter?.near_goal_reserve_total ?? null,
      commitment_gap_after: protectionAfter?.commitment_gap ?? null,
      execution_boundary: 'advisory_only',
    });
  }

  const draft = parseGoalDraft(userText, pending ?? {});
  const missing = missingFields(draft);
  const nextMetadata: AssetMetadata = {
    ...metadata,
    goal_chat_state: { pending_goal: draft },
  };

  if (missing.length) {
    return persistAssetReply(userId, nextMetadata, `بدأت مسودة الهدف. أحتاج استكمال: ${missing.join('، ')}. اذكر البيانات الناقصة، ولن أحجز المبلغ قبل تأكيدك النهائي.`, 'request', {
      goal_draft: draft,
      missing_fields: missing,
      requires_user_confirmation: true,
      execution_boundary: 'advisory_only',
    });
  }

  return persistAssetReply(userId, nextMetadata,
    `مسودة الهدف جاهزة: «${draft.name}»، بقيمة ${formatSar(draft.target_amount!)} ريال، بتاريخ ${draft.target_date}، ومصدر التمويل: ${sourceLabel(draft.funding_source!)}. اكتب «تأكيد» لإنشاء الهدف واعتماده في الحسابات، أو أرسل التصحيح.`,
    'request',
    {
      goal_draft: draft,
      requires_user_confirmation: true,
      ready_to_create: true,
      execution_boundary: 'advisory_only',
    },
  );
}
