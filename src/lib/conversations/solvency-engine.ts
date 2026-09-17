import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import type { ConversationMessageKind, ConversationRoomKey } from './store';
import { governedRooms } from './store';

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

type BaselineState = {
  monthly_net_income_confirmed?: number;
  recurring_core_obligations_total?: number;
};

type SolvencyPending =
  | { type: 'emergency_reserve'; value: number; raw_text: string }
  | { type: 'available_liquidity'; value: number; raw_text: string };

type SolvencyState = {
  emergency_reserve_candidate?: number;
  emergency_reserve_confirmed?: number;
  available_liquidity_candidate?: number;
  available_liquidity_confirmed?: number;
  pending_confirmation?: SolvencyPending;
  updated_at?: string;
};

const arabicDigits: Record<string, string> = {
  '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
  '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9',
};

function normalizeDigits(value: string) {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => arabicDigits[digit] ?? digit);
}

function numbersFrom(text: string) {
  const normalized = normalizeDigits(text).replace(/,/g, '');
  return [...normalized.matchAll(/(?:^|\s)(\d+(?:\.\d+)?)(?=\s|$|\s*(?:ريال|ر\.س))/g)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value >= 0);
}

function isConfirmation(text: string) {
  const normalized = text.trim().replace(/[.!؟?]+$/g, '');
  return /^(نعم|اي|إي|ايوه|أيوه|صحيح|تأكيد|اكد|أكد|اعتمد|موافق|تمام|صح)$/i.test(normalized);
}

function isRejection(text: string) {
  const normalized = text.trim().replace(/[.!؟?]+$/g, '');
  return /^(لا|غير صحيح|خطأ|غلط|ارفض|أرفض|رفض)$/i.test(normalized);
}

function wantsReserve(text: string) {
  return /(احتياط|احتياطي|طوارئ|حماية)/i.test(text);
}

function wantsLiquidity(text: string) {
  return /(سيولة|متاح|متاحة|كاش|نقد)/i.test(text);
}

function formatSar(value: number) {
  return new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 }).format(value);
}

function solvencyMetrics(baseline: BaselineState, state: SolvencyState) {
  const obligations = baseline.recurring_core_obligations_total;
  const reserve = state.emergency_reserve_confirmed;
  const liquidity = state.available_liquidity_confirmed;
  if (typeof obligations !== 'number' || typeof reserve !== 'number' || typeof liquidity !== 'number') return null;
  const protectedPool = reserve + liquidity;
  const coverageMonths = obligations > 0 ? protectedPool / obligations : null;
  const basicCycleGap = Math.max(obligations - protectedPool, 0);
  const basicCycleSurplus = Math.max(protectedPool - obligations, 0);
  const protectionStatus = protectedPool < obligations ? 'BELOW_CORE_CYCLE' : 'COVERS_CORE_CYCLE';
  return {
    emergency_reserve: reserve,
    available_liquidity: liquidity,
    protected_liquidity_total: protectedPool,
    recurring_core_obligations_total: obligations,
    coverage_months: coverageMonths,
    basic_cycle_gap: basicCycleGap,
    basic_cycle_surplus: basicCycleSurplus,
    protection_status: protectionStatus,
  };
}

async function readStates(userId: string) {
  const sql = getRawSql();
  const rows = await sql`
    select room_key, metadata
    from public.conversation_threads
    where user_id=${userId} and room_key in ('central','solvency')
  `;
  const central = rows.find((row) => row.room_key === 'central');
  const solvency = rows.find((row) => row.room_key === 'solvency');
  const centralMetadata = central?.metadata && typeof central.metadata === 'object' ? central.metadata as Record<string, unknown> : {};
  const solvencyMetadata = solvency?.metadata && typeof solvency.metadata === 'object' ? solvency.metadata as Record<string, unknown> : {};
  const baseline = centralMetadata.financial_baseline && typeof centralMetadata.financial_baseline === 'object'
    ? centralMetadata.financial_baseline as BaselineState
    : {};
  const state = solvencyMetadata.solvency_state && typeof solvencyMetadata.solvency_state === 'object'
    ? solvencyMetadata.solvency_state as SolvencyState
    : {};
  return { baseline, state, solvencyMetadata };
}

async function saveReply(userId: string, state: SolvencyState, metadata: Record<string, unknown>, body: string, kind: ConversationMessageKind, structured: Record<string, unknown>) {
  const sql = getRawSql();
  const threadRows = await sql`select id from public.conversation_threads where user_id=${userId} and room_key='solvency' limit 1`;
  const threadId = threadRows[0]?.id as string | undefined;
  if (!threadId) return null;
  const agent = governedRooms.solvency.participants[0];
  const id = randomUUID();
  const nextMetadata = { ...metadata, solvency_state: state };
  const rows = await sql.transaction([
    sql`insert into public.conversation_messages (id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data) values (${id},${threadId},${userId},'agent',${agent.key},${agent.name},${kind},${body},${JSON.stringify(structured)}::jsonb) returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at`,
    sql`update public.conversation_threads set updated_at=now(), metadata=${JSON.stringify(nextMetadata)}::jsonb where id=${threadId} and user_id=${userId} returning id`,
  ]);
  return (rows[0]?.[0] ?? null) as AgentReply | null;
}

export async function createSolvencyReply(userId: string, userText: string): Promise<AgentReply | null> {
  const { baseline, state: currentState, solvencyMetadata } = await readStates(userId);
  let state = { ...currentState };
  const amounts = numbersFrom(userText);
  let body: string;
  let kind: ConversationMessageKind = 'request';
  let confidence = 0.55;

  if (isConfirmation(userText) && state.pending_confirmation) {
    const pending = state.pending_confirmation;
    if (pending.type === 'emergency_reserve') state.emergency_reserve_confirmed = pending.value;
    if (pending.type === 'available_liquidity') state.available_liquidity_confirmed = pending.value;
    delete state.pending_confirmation;
    state.updated_at = new Date().toISOString();
    confidence = 1;

    const metrics = solvencyMetrics(baseline, state);
    if (metrics) {
      kind = 'risk';
      body = metrics.protection_status === 'BELOW_CORE_CYCLE'
        ? `تم تثبيت بيانات الملاءة. إجمالي أموال الحماية والسيولة المؤكدة ${formatSar(metrics.protected_liquidity_total)} ريال، مقابل التزامات أساسية شهرية مؤكدة قدرها ${formatSar(metrics.recurring_core_obligations_total)} ريال. التغطية الحالية تعادل ${metrics.coverage_months?.toFixed(2)} شهر، ويوجد عجز عن تغطية دورة أساسية كاملة قدره ${formatSar(metrics.basic_cycle_gap)} ريال. لذلك أي استخدام من أموال الحماية للاستثمار أو التمويل يجب أن يتوقف حتى تُغطى الالتزامات الأساسية أولًا.`
        : `تم تثبيت بيانات الملاءة. إجمالي أموال الحماية والسيولة المؤكدة ${formatSar(metrics.protected_liquidity_total)} ريال، مقابل التزامات أساسية شهرية قدرها ${formatSar(metrics.recurring_core_obligations_total)} ريال. التغطية الحالية تعادل ${metrics.coverage_months?.toFixed(2)} شهر، والفائض فوق تغطية دورة أساسية واحدة ${formatSar(metrics.basic_cycle_surplus)} ريال. هذه النتيجة لا تعني تلقائيًا أن الفائض قابل للاستثمار؛ أي استخدام لاحق سيخضع لاختبار حماية قبل التوصية.`;
      return saveReply(userId, state, solvencyMetadata, body, kind, { confidence, ...metrics, execution_boundary: 'advisory_only' });
    }

    if (typeof baseline.recurring_core_obligations_total !== 'number') {
      body = 'تم تثبيت قيمة الملاءة، لكن لا يمكن حساب التغطية قبل تثبيت الالتزامات الأساسية الشهرية في البنك المركزي.';
    } else if (typeof state.emergency_reserve_confirmed !== 'number') {
      body = 'تم تثبيت السيولة المتاحة. الآن أرسل قيمة احتياطي الطوارئ المحمي وسأعرضها عليك للتأكيد.';
    } else {
      body = 'تم تثبيت احتياطي الطوارئ. الآن أرسل قيمة السيولة المتاحة خارج الاحتياطي، وسأعرضها عليك للتأكيد.';
    }
    return saveReply(userId, state, solvencyMetadata, body, kind, { confidence, missing: true, execution_boundary: 'advisory_only' });
  }

  if (isRejection(userText) && state.pending_confirmation) {
    delete state.pending_confirmation;
    state.updated_at = new Date().toISOString();
    body = 'تم إلغاء القيمة المرشحة ولم أعتمدها. أرسل القيمة الصحيحة مع توضيح هل هي احتياطي طوارئ أم سيولة متاحة خارج الاحتياطي.';
    return saveReply(userId, state, solvencyMetadata, body, 'request', { confidence: 1, execution_boundary: 'advisory_only' });
  }

  if (amounts.length && wantsReserve(userText)) {
    const value = amounts[0];
    state = {
      ...state,
      emergency_reserve_candidate: value,
      pending_confirmation: { type: 'emergency_reserve', value, raw_text: userText },
      updated_at: new Date().toISOString(),
    };
    body = `التقطت احتياطي طوارئ بقيمة ${formatSar(value)} ريال. لن أعتمده قبل تأكيدك. هل أعتمد هذه القيمة كاحتياطي طوارئ محمي؟`;
    confidence = 0.93;
    return saveReply(userId, state, solvencyMetadata, body, 'request', { confidence, candidate_type: 'emergency_reserve', candidate_value: value, requires_user_confirmation: true, execution_boundary: 'advisory_only' });
  }

  if (amounts.length && wantsLiquidity(userText)) {
    const value = amounts[0];
    state = {
      ...state,
      available_liquidity_candidate: value,
      pending_confirmation: { type: 'available_liquidity', value, raw_text: userText },
      updated_at: new Date().toISOString(),
    };
    body = `التقطت سيولة متاحة خارج الاحتياطي بقيمة ${formatSar(value)} ريال. لن أعتمدها قبل تأكيدك. هل أعتمد هذه القيمة؟`;
    confidence = 0.9;
    return saveReply(userId, state, solvencyMetadata, body, 'request', { confidence, candidate_type: 'available_liquidity', candidate_value: value, requires_user_confirmation: true, execution_boundary: 'advisory_only' });
  }

  const metrics = solvencyMetrics(baseline, state);
  if (metrics) {
    body = `التغطية الحالية المحسوبة من البيانات المؤكدة هي ${metrics.coverage_months?.toFixed(2)} شهر، وإجمالي أموال الحماية والسيولة ${formatSar(metrics.protected_liquidity_total)} ريال. ${metrics.protection_status === 'BELOW_CORE_CYCLE' ? `يوجد عجز قدره ${formatSar(metrics.basic_cycle_gap)} ريال عن تغطية دورة أساسية كاملة.` : `الفائض فوق تغطية دورة أساسية واحدة ${formatSar(metrics.basic_cycle_surplus)} ريال.`}`;
    return saveReply(userId, state, solvencyMetadata, body, 'risk', { confidence: 1, ...metrics, execution_boundary: 'advisory_only' });
  }

  if (typeof baseline.recurring_core_obligations_total !== 'number') {
    body = 'قبل تقييم الملاءة أحتاج تثبيت الالتزامات الأساسية الشهرية في البنك المركزي. لن أحسب تغطية أو أوصي باستخدام أموال الحماية قبل اكتمال هذا الرقم.';
  } else if (typeof state.emergency_reserve_confirmed !== 'number') {
    body = `الالتزامات الأساسية الشهرية المؤكدة حاليًا ${formatSar(baseline.recurring_core_obligations_total)} ريال. أرسل الآن قيمة احتياطي الطوارئ المحمي.`;
  } else {
    body = 'تم تثبيت احتياطي الطوارئ. أرسل قيمة السيولة المتاحة خارج الاحتياطي حتى أحسب إجمالي التغطية.';
  }
  return saveReply(userId, state, solvencyMetadata, body, 'request', { confidence, execution_boundary: 'advisory_only' });
}

export async function createProtectionGuardReply(userId: string, roomKey: ConversationRoomKey, userText: string): Promise<AgentReply | null> {
  if (roomKey !== 'assets' && roomKey !== 'hilal') return null;
  const amounts = numbersFrom(userText);
  if (!amounts.length) return null;
  const requestedAmount = amounts[0];
  const { baseline, state, solvencyMetadata } = await readStates(userId);
  const metrics = solvencyMetrics(baseline, state);
  if (!metrics) return null;

  const projectedProtected = metrics.protected_liquidity_total - requestedAmount;
  if (projectedProtected >= metrics.recurring_core_obligations_total) return null;

  const sql = getRawSql();
  const threadRows = await sql`select id from public.conversation_threads where user_id=${userId} and room_key=${roomKey} limit 1`;
  const threadId = threadRows[0]?.id as string | undefined;
  if (!threadId) return null;
  const agent = governedRooms[roomKey].participants[0];
  const id = randomUUID();
  const shortfall = metrics.recurring_core_obligations_total - Math.max(projectedProtected, 0);
  const body = roomKey === 'assets'
    ? `لا يمكن التوصية باستخدام ${formatSar(requestedAmount)} ريال من أموال الحماية الآن، لأن ذلك سيخفض الأموال المحمية إلى ${formatSar(Math.max(projectedProtected, 0))} ريال، وهي أقل من الالتزامات الأساسية لدورة واحدة البالغة ${formatSar(metrics.recurring_core_obligations_total)} ريال. الفجوة المتوقعة ${formatSar(shortfall)} ريال. ابحث أولًا عن مبلغ استثماري من خارج أموال الحماية أو ارفع التغطية.`
    : `لا يمكن اعتماد تمويل أو تخصيص بقيمة ${formatSar(requestedAmount)} ريال إذا كان سيُستهلك من أموال الحماية ويخفضها إلى ${formatSar(Math.max(projectedProtected, 0))} ريال، أي أقل من التزامات الدورة الأساسية البالغة ${formatSar(metrics.recurring_core_obligations_total)} ريال. الفجوة المتوقعة ${formatSar(shortfall)} ريال.`;

  const structured = {
    hard_guard: 'CORE_COVERAGE_FLOOR',
    blocked: true,
    requested_amount: requestedAmount,
    protected_liquidity_before: metrics.protected_liquidity_total,
    protected_liquidity_after: Math.max(projectedProtected, 0),
    core_cycle_floor: metrics.recurring_core_obligations_total,
    projected_gap: shortfall,
    requires_user_confirmation: false,
    execution_boundary: 'advisory_only',
  };
  const rows = await sql.transaction([
    sql`insert into public.conversation_messages (id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data) values (${id},${threadId},${userId},'agent',${agent.key},${agent.name},'risk',${body},${JSON.stringify(structured)}::jsonb) returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at`,
    sql`update public.conversation_threads set updated_at=now() where id=${threadId} and user_id=${userId} returning id`,
  ]);
  void solvencyMetadata;
  return (rows[0]?.[0] ?? null) as AgentReply | null;
}
