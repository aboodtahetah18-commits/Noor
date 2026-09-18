import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import { computeProtectionCapacity } from './protection-capacity';
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

type SolvencyMetrics = {
  emergency_reserve: number;
  available_liquidity: number;
  protected_liquidity_total: number;
  recurring_core_obligations_total: number;
  coverage_months: number | null;
  basic_cycle_gap: number;
  basic_cycle_surplus: number;
  protection_status: 'BELOW_CORE_CYCLE' | 'COVERS_CORE_CYCLE';
  protected_pool_safe_capacity: number;
};

type CommitmentReservations = {
  active_cycle_end: string | null;
  reserved_dated_obligations_total: number;
  reserved_dated_obligation_count: number;
  near_goal_reserve_total: number;
  near_goal_count: number;
  external_near_goal_total: number;
  external_near_goal_count: number;
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

function firstAmount(amounts: number[]) {
  const value = amounts[0];
  return typeof value === 'number' ? value : null;
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

function solvencyMetrics(baseline: BaselineState, state: SolvencyState): SolvencyMetrics | null {
  const obligations = baseline.recurring_core_obligations_total;
  const reserve = state.emergency_reserve_confirmed;
  const liquidity = state.available_liquidity_confirmed;
  if (typeof obligations !== 'number' || typeof reserve !== 'number' || typeof liquidity !== 'number') return null;
  const protectedPool = reserve + liquidity;
  const coverageMonths = obligations > 0 ? protectedPool / obligations : null;
  const basicCycleGap = Math.max(obligations - protectedPool, 0);
  const basicCycleSurplus = Math.max(protectedPool - obligations, 0);
  return {
    emergency_reserve: reserve,
    available_liquidity: liquidity,
    protected_liquidity_total: protectedPool,
    recurring_core_obligations_total: obligations,
    coverage_months: coverageMonths,
    basic_cycle_gap: basicCycleGap,
    basic_cycle_surplus: basicCycleSurplus,
    protection_status: protectedPool < obligations ? 'BELOW_CORE_CYCLE' : 'COVERS_CORE_CYCLE',
    protected_pool_safe_capacity: basicCycleSurplus,
  };
}

async function readStates(userId: string) {
  const sql = getRawSql();
  const rows = await sql`select room_key, metadata from public.conversation_threads where user_id=${userId} and room_key in ('central','solvency')`;
  const central = rows.find((row) => row.room_key === 'central');
  const solvency = rows.find((row) => row.room_key === 'solvency');
  const centralMetadata = central?.metadata && typeof central.metadata === 'object' ? central.metadata as Record<string, unknown> : {};
  const solvencyMetadata = solvency?.metadata && typeof solvency.metadata === 'object' ? solvency.metadata as Record<string, unknown> : {};
  const baseline = centralMetadata.financial_baseline && typeof centralMetadata.financial_baseline === 'object' ? centralMetadata.financial_baseline as BaselineState : {};
  const state = solvencyMetadata.solvency_state && typeof solvencyMetadata.solvency_state === 'object' ? solvencyMetadata.solvency_state as SolvencyState : {};
  return { baseline, state, solvencyMetadata };
}

async function readCommitmentReservations(userId: string, fundingOverrides: Record<string, unknown> = {}): Promise<CommitmentReservations> {
  const sql = getRawSql();
  const [cycleRows, obligationRows, goalRows, assetThreadRows] = await Promise.all([
    sql`select expected_next_income_date::text as active_cycle_end
      from public.financial_cycles
      where user_id=${userId} and status='ACTIVE'
      order by activated_at desc nulls last
      limit 1`,
    sql`select
        coalesce(sum(amount) filter (where is_reserved=true and status in ('UPCOMING','DUE','OVERDUE')),0)::text as total,
        count(*) filter (where is_reserved=true and status in ('UPCOMING','DUE','OVERDUE'))::int as item_count
      from public.obligation_occurrences
      where user_id=${userId}`,
    sql`select
        g.id::text,
        g.target_amount::text,
        (g.opening_balance + coalesce(sum(t.amount) filter (where t.transaction_type='GOAL_CONTRIBUTION' and t.status='POSTED'),0))::text as current_balance,
        g.target_date::text
      from public.financial_goals g
      left join public.transactions t on t.goal_id=g.id and t.user_id=g.user_id
      where g.user_id=${userId}
        and g.status in ('ACTIVE','FINANCIALLY_UNREALISTIC')
        and g.target_date is not null
      group by g.id`,
    sql`select metadata from public.conversation_threads where user_id=${userId} and room_key='assets' limit 1`,
  ]);

  const activeCycleEnd = cycleRows[0]?.active_cycle_end ? String(cycleRows[0].active_cycle_end) : null;
  const obligationRow = obligationRows[0];
  const assetMetadata = assetThreadRows[0]?.metadata && typeof assetThreadRows[0].metadata === 'object'
    ? assetThreadRows[0].metadata as Record<string, unknown>
    : {};
  const rawSources = assetMetadata.goal_funding_sources;
  const fundingSources = {
    ...(rawSources && typeof rawSources === 'object' ? rawSources as Record<string, unknown> : {}),
    ...fundingOverrides,
  };

  let nearGoalReserveTotal = 0;
  let nearGoalCount = 0;
  let externalNearGoalTotal = 0;
  let externalNearGoalCount = 0;

  for (const row of goalRows) {
    const targetDate = row.target_date ? String(row.target_date) : null;
    if (!activeCycleEnd || !targetDate || targetDate > activeCycleEnd) continue;
    const target = Number(row.target_amount ?? 0);
    const current = Number(row.current_balance ?? 0);
    const remaining = Math.max(target - current, 0);
    if (remaining <= 0) continue;
    const source = fundingSources[String(row.id)];
    if (source === 'EXTERNAL_UNPROTECTED') {
      externalNearGoalTotal += remaining;
      externalNearGoalCount += 1;
      continue;
    }
    nearGoalReserveTotal += remaining;
    nearGoalCount += 1;
  }

  return {
    active_cycle_end: activeCycleEnd,
    reserved_dated_obligations_total: Number(obligationRow?.total ?? 0),
    reserved_dated_obligation_count: Number(obligationRow?.item_count ?? 0),
    near_goal_reserve_total: nearGoalReserveTotal,
    near_goal_count: nearGoalCount,
    external_near_goal_total: externalNearGoalTotal,
    external_near_goal_count: externalNearGoalCount,
  };
}

async function solvencyMetricsWithCommitments(userId: string, baseline: BaselineState, state: SolvencyState, fundingOverrides: Record<string, unknown> = {}) {
  const base = solvencyMetrics(baseline, state);
  if (!base) return null;
  const reservations = await readCommitmentReservations(userId, fundingOverrides);
  const capacity = computeProtectionCapacity({
    protectedLiquidityTotal: base.protected_liquidity_total,
    recurringCoreObligationsTotal: base.recurring_core_obligations_total,
    reservedDatedObligationsTotal: reservations.reserved_dated_obligations_total,
    nearGoalReserveTotal: reservations.near_goal_reserve_total,
  });
  return {
    ...base,
    ...reservations,
    ...capacity,
    gross_core_safe_capacity: base.protected_pool_safe_capacity,
    protected_pool_safe_capacity: capacity.safe_capacity_after_commitments,
  };
}

export async function getProtectionSnapshot(userId: string, fundingOverrides: Record<string, unknown> = {}) {
  const { baseline, state } = await readStates(userId);
  return solvencyMetricsWithCommitments(userId, baseline, state, fundingOverrides);
}

function roomAgent(roomKey: ConversationRoomKey) {
  const participant = governedRooms[roomKey].participants[0];
  if (!participant) return { key: `${roomKey}-agent`, name: governedRooms[roomKey].title };
  return { key: participant.key, name: participant.name };
}

async function persistReply(userId: string, roomKey: ConversationRoomKey, body: string, kind: ConversationMessageKind, structured: Record<string, unknown>, metadataPatch?: Record<string, unknown>) {
  const sql = getRawSql();
  const threadRows = await sql`select id, metadata from public.conversation_threads where user_id=${userId} and room_key=${roomKey} limit 1`;
  const threadId = threadRows[0]?.id as string | undefined;
  if (!threadId) return null;
  const agent = roomAgent(roomKey);
  const currentMetadata = threadRows[0]?.metadata && typeof threadRows[0].metadata === 'object' ? threadRows[0].metadata as Record<string, unknown> : {};
  const nextMetadata = metadataPatch ? { ...currentMetadata, ...metadataPatch } : currentMetadata;
  const rows = await sql.transaction([
    sql`insert into public.conversation_messages (id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data) values (${randomUUID()},${threadId},${userId},'agent',${agent.key},${agent.name},${kind},${body},${JSON.stringify(structured)}::jsonb) returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at`,
    sql`update public.conversation_threads set updated_at=now(), metadata=${JSON.stringify(nextMetadata)}::jsonb where id=${threadId} and user_id=${userId} returning id`,
  ]);
  return (rows[0]?.[0] ?? null) as AgentReply | null;
}

export async function createSolvencyReply(userId: string, userText: string): Promise<AgentReply | null> {
  const { baseline, state: currentState, solvencyMetadata } = await readStates(userId);
  let state = { ...currentState };
  const amounts = numbersFrom(userText);
  const amount = firstAmount(amounts);

  if (isConfirmation(userText) && state.pending_confirmation) {
    const pending = state.pending_confirmation;
    if (pending.type === 'emergency_reserve') state.emergency_reserve_confirmed = pending.value;
    else state.available_liquidity_confirmed = pending.value;
    delete state.pending_confirmation;
    state.updated_at = new Date().toISOString();
    const metrics = await solvencyMetricsWithCommitments(userId, baseline, state);
    if (metrics) {
      let body: string;
      if (metrics.protection_status === 'BELOW_CORE_CYCLE') {
        body = `تم تثبيت بيانات الملاءة. أموال الحماية والسيولة المؤكدة ${formatSar(metrics.protected_liquidity_total)} ريال، مقابل التزامات أساسية قدرها ${formatSar(metrics.recurring_core_obligations_total)} ريال. يوجد عجز قدره ${formatSar(metrics.basic_cycle_gap)} ريال عن تغطية دورة أساسية كاملة؛ لذلك السعة الآمنة للاستخدام من أموال الحماية حاليًا صفر.`;
      } else if (metrics.commitment_protection_status === 'COMMITMENT_SHORTFALL') {
        body = `تم تثبيت بيانات الملاءة. تغطية الدورة الأساسية قائمة، لكن الالتزامات المؤرخة والأهداف القريبة ترفع الأموال الواجب حمايتها إلى ${formatSar(metrics.protected_commitment_floor)} ريال. المحجوز للأهداف القريبة ${formatSar(metrics.near_goal_reserve_total)} ريال، والالتزامات المؤرخة المحجوزة ${formatSar(metrics.reserved_dated_obligations_total)} ريال. توجد فجوة حماية قدرها ${formatSar(metrics.commitment_gap)} ريال، لذا السعة الآمنة للاستثمار أو التمويل من هذا المصدر تساوي صفر.`;
      } else {
        body = `تم تثبيت بيانات الملاءة. التغطية الحالية ${metrics.coverage_months?.toFixed(2)} شهر. الفائض الحسابي بعد أرضية الدورة ${formatSar(metrics.gross_core_safe_capacity)} ريال، وبعد حماية الالتزامات المؤرخة (${formatSar(metrics.reserved_dated_obligations_total)} ريال) والأهداف القريبة (${formatSar(metrics.near_goal_reserve_total)} ريال) تصبح السعة الآمنة القابلة للاختبار ${formatSar(metrics.protected_pool_safe_capacity)} ريال. هذه سعة اختبار وليست توصية تلقائية باستخدامها.`;
      }
      return persistReply(userId, 'solvency', body, 'risk', { confidence:1, confidence_percent:100, ...metrics, execution_boundary:'advisory_only' }, { ...solvencyMetadata, solvency_state: state });
    }
    const body = typeof baseline.recurring_core_obligations_total !== 'number'
      ? 'تم تثبيت القيمة، لكن لا يمكن حساب التغطية قبل تثبيت الالتزامات الأساسية الشهرية في البنك المركزي.'
      : typeof state.emergency_reserve_confirmed !== 'number'
        ? 'تم تثبيت السيولة المتاحة. الآن أرسل قيمة احتياطي الطوارئ المحمي.'
        : 'تم تثبيت احتياطي الطوارئ. الآن أرسل قيمة السيولة المتاحة خارج الاحتياطي.';
    return persistReply(userId, 'solvency', body, 'request', { confidence:1, confidence_percent:100, execution_boundary:'advisory_only' }, { ...solvencyMetadata, solvency_state: state });
  }

  if (isRejection(userText) && state.pending_confirmation) {
    delete state.pending_confirmation;
    state.updated_at = new Date().toISOString();
    return persistReply(userId, 'solvency', 'تم إلغاء القيمة المرشحة. أرسل القيمة الصحيحة مع توضيح هل هي احتياطي طوارئ أم سيولة متاحة.', 'request', { confidence:1, confidence_percent:100, execution_boundary:'advisory_only' }, { ...solvencyMetadata, solvency_state: state });
  }

  if (amount !== null && wantsReserve(userText)) {
    state = { ...state, emergency_reserve_candidate:amount, pending_confirmation:{ type:'emergency_reserve', value:amount, raw_text:userText }, updated_at:new Date().toISOString() };
    return persistReply(userId, 'solvency', `التقطت احتياطي طوارئ بقيمة ${formatSar(amount)} ريال. هل أعتمد هذه القيمة كاحتياطي محمي؟`, 'request', { confidence:0.93, confidence_percent:93, candidate_type:'emergency_reserve', candidate_value:amount, requires_user_confirmation:true, execution_boundary:'advisory_only' }, { ...solvencyMetadata, solvency_state: state });
  }

  if (amount !== null && wantsLiquidity(userText)) {
    state = { ...state, available_liquidity_candidate:amount, pending_confirmation:{ type:'available_liquidity', value:amount, raw_text:userText }, updated_at:new Date().toISOString() };
    return persistReply(userId, 'solvency', `التقطت سيولة متاحة خارج الاحتياطي بقيمة ${formatSar(amount)} ريال. هل أعتمد هذه القيمة؟`, 'request', { confidence:0.9, confidence_percent:90, candidate_type:'available_liquidity', candidate_value:amount, requires_user_confirmation:true, execution_boundary:'advisory_only' }, { ...solvencyMetadata, solvency_state: state });
  }

  const metrics = await solvencyMetricsWithCommitments(userId, baseline, state);
  if (metrics) {
    const body = metrics.commitment_protection_status === 'COMMITMENT_SHORTFALL'
      ? `إجمالي أموال الحماية والسيولة ${formatSar(metrics.protected_liquidity_total)} ريال، بينما أرضية الحماية بعد الالتزامات المؤرخة والأهداف القريبة ${formatSar(metrics.protected_commitment_floor)} ريال. توجد فجوة ${formatSar(metrics.commitment_gap)} ريال، ولذلك لا توجد سعة آمنة متاحة حاليًا.`
      : `التغطية الحالية ${metrics.coverage_months?.toFixed(2)} شهر، وإجمالي أموال الحماية والسيولة ${formatSar(metrics.protected_liquidity_total)} ريال. بعد حجز الالتزامات المؤرخة والأهداف القريبة، السعة الحسابية الآمنة القابلة للاختبار هي ${formatSar(metrics.protected_pool_safe_capacity)} ريال.`;
    return persistReply(userId, 'solvency', body, 'risk', { confidence:1, confidence_percent:100, ...metrics, execution_boundary:'advisory_only' });
  }

  const body = typeof baseline.recurring_core_obligations_total !== 'number'
    ? 'قبل تقييم الملاءة أحتاج تثبيت الالتزامات الأساسية الشهرية في البنك المركزي.'
    : typeof state.emergency_reserve_confirmed !== 'number'
      ? `الالتزامات الأساسية المؤكدة ${formatSar(baseline.recurring_core_obligations_total)} ريال. أرسل قيمة احتياطي الطوارئ المحمي.`
      : 'تم تثبيت احتياطي الطوارئ. أرسل قيمة السيولة المتاحة خارج الاحتياطي.';
  return persistReply(userId, 'solvency', body, 'request', { confidence:0.55, confidence_percent:55, execution_boundary:'advisory_only' });
}

export async function createProtectionGuardReply(userId: string, roomKey: ConversationRoomKey, userText: string): Promise<AgentReply | null> {
  if (roomKey !== 'assets' && roomKey !== 'hilal') return null;
  const requestedAmount = firstAmount(numbersFrom(userText));
  if (requestedAmount === null) return null;

  const { baseline, state } = await readStates(userId);
  const metrics = await solvencyMetricsWithCommitments(userId, baseline, state);
  if (!metrics) {
    const body = roomKey === 'assets'
      ? 'لا أستطيع تحديد مبلغ استثماري آمن قبل اكتمال بيانات بنك الملاءة: الالتزامات الأساسية، احتياطي الطوارئ، والسيولة المتاحة. لن أتعامل مع المبلغ المطلوب كأنه متاح للاستثمار قبل ذلك.'
      : 'لا أستطيع اختبار التمويل قبل اكتمال بيانات بنك الملاءة: الالتزامات الأساسية، احتياطي الطوارئ، والسيولة المتاحة. لن أعتمد الطلب قبل معرفة أثره على التغطية.';
    return persistReply(userId, roomKey, body, 'request', { confidence:1, confidence_percent:100, solvency_required:true, safe_capacity_known:false, execution_boundary:'advisory_only' });
  }

  const safeCapacity = metrics.protected_pool_safe_capacity;
  const projectedProtected = Math.max(metrics.protected_liquidity_total - requestedAmount, 0);
  const blocked = requestedAmount > safeCapacity;

  if (blocked) {
    const excess = requestedAmount - safeCapacity;
    const body = roomKey === 'assets'
      ? `الطلب الاستثماري ${formatSar(requestedAmount)} ريال يتجاوز السعة الآمنة بعد حماية الدورة والالتزامات المؤرخة والأهداف القريبة. السعة الحالية القابلة للاختبار ${formatSar(safeCapacity)} ريال، والتجاوز ${formatSar(excess)} ريال. المحجوز للأهداف القريبة ${formatSar(metrics.near_goal_reserve_total)} ريال، والالتزامات المؤرخة ${formatSar(metrics.reserved_dated_obligations_total)} ريال؛ لذلك يتوقف هذا المسار ما لم يوجد مصدر آخر غير محجوز أو تتغير البيانات المؤكدة.`
      : `طلب التمويل ${formatSar(requestedAmount)} ريال يتجاوز السعة الآمنة بعد حماية الدورة والالتزامات المؤرخة والأهداف القريبة. السعة الحالية القابلة للاختبار ${formatSar(safeCapacity)} ريال، والتجاوز ${formatSar(excess)} ريال. لذلك لا ينتقل الطلب للاعتماد بهذه الصورة.`;
    return persistReply(userId, roomKey, body, 'risk', {
      confidence:1,
      confidence_percent:100,
      hard_guard:'PROTECTED_COMMITMENTS_FLOOR',
      core_guard:'CORE_COVERAGE_FLOOR',
      blocked:true,
      requested_amount:requestedAmount,
      safe_capacity:safeCapacity,
      excess_over_safe_capacity:excess,
      protected_liquidity_before:metrics.protected_liquidity_total,
      protected_liquidity_after:projectedProtected,
      core_cycle_floor:metrics.recurring_core_obligations_total,
      reserved_dated_obligations_total:metrics.reserved_dated_obligations_total,
      near_goal_reserve_total:metrics.near_goal_reserve_total,
      protected_commitment_floor:metrics.protected_commitment_floor,
      commitment_gap:metrics.commitment_gap,
      active_cycle_end:metrics.active_cycle_end,
      coverage_months_before:metrics.coverage_months,
      execution_boundary:'advisory_only',
    });
  }

  const remainingCapacity = safeCapacity - requestedAmount;
  const body = roomKey === 'assets'
    ? `المبلغ ${formatSar(requestedAmount)} ريال يقع داخل السعة الآمنة بعد حماية الدورة والالتزامات المؤرخة والأهداف القريبة. السعة قبل الطلب ${formatSar(safeCapacity)} ريال، ويتبقى بعدها ${formatSar(remainingCapacity)} ريال. هذا اجتياز لحاجز الحماية فقط، وليس توصية استثمار نهائية؛ ما زال يلزم فحص أفق الهدف والمخاطر والسيولة المطلوبة لاحقًا.`
    : `المبلغ ${formatSar(requestedAmount)} ريال يقع داخل السعة الآمنة بعد حماية الدورة والالتزامات المؤرخة والأهداف القريبة. السعة قبل الطلب ${formatSar(safeCapacity)} ريال، ويتبقى بعدها ${formatSar(remainingCapacity)} ريال. هذا اجتياز لحاجز الحماية فقط؛ ما زال يلزم اختبار غرض التمويل وأثر السداد والالتزامات المستقبلية قبل الاعتماد.`;
  return persistReply(userId, roomKey, body, roomKey === 'assets' ? 'recommendation' : 'request', {
    confidence:1,
    confidence_percent:100,
    hard_guard:'PROTECTED_COMMITMENTS_FLOOR',
    core_guard:'CORE_COVERAGE_FLOOR',
    blocked:false,
    requested_amount:requestedAmount,
    safe_capacity:safeCapacity,
    remaining_safe_capacity:remainingCapacity,
    protected_liquidity_before:metrics.protected_liquidity_total,
    protected_liquidity_after:projectedProtected,
    core_cycle_floor:metrics.recurring_core_obligations_total,
    reserved_dated_obligations_total:metrics.reserved_dated_obligations_total,
    near_goal_reserve_total:metrics.near_goal_reserve_total,
    protected_commitment_floor:metrics.protected_commitment_floor,
    active_cycle_end:metrics.active_cycle_end,
    coverage_months_before:metrics.coverage_months,
    passed_floor_only:true,
    execution_boundary:'advisory_only',
  });
}
