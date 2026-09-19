import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import type { ConversationMessageKind, ConversationRoomKey } from './store';
import { governedRooms } from './store';

type RoutedReply = {
  id: string;
  sender_type: 'agent';
  sender_key: string;
  sender_name: string;
  message_kind: ConversationMessageKind;
  body: string;
  structured_data: Record<string, unknown>;
  created_at?: string;
};

type Intent = 'income' | 'obligation' | 'reserve' | 'investment' | 'financing' | 'goal' | 'general';
type PendingConfirmation =
  | { type: 'monthly_net_income'; value: number; raw_text: string }
  | { type: 'recurring_core_obligations'; values: number[]; raw_text: string };

type BaselineState = {
  monthly_net_income_candidate?: number;
  monthly_net_income_confirmed?: number;
  recurring_core_obligations_candidates?: number[];
  recurring_core_obligations_confirmed?: number[];
  recurring_core_obligations_total?: number;
  pending_confirmation?: PendingConfirmation;
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

export function detectConversationIntent(text: string): Intent {
  if (/(دخل|راتب|راتبي|صافي|دخل شهري|الدخل)/i.test(text)) return 'income';
  if (/(إيجار|ايجار|قسط|أقساط|اقساط|فاتورة|فواتير|التزام|التزامات|مصروف ثابت)/i.test(text)) return 'obligation';
  if (/(احتياط|طوارئ|سيولة|ملاءة|حماية)/i.test(text)) return 'reserve';
  if (/(استثمار|أسهم|اسهم|صندوق|صناديق|محفظة|عائد)/i.test(text)) return 'investment';
  if (/(تمويل|قرض|دين|سداد|تقسيط)/i.test(text)) return 'financing';
  if (/(هدف|أهداف|اهداف|ادخار|شراء|منزل|سيارة|سفر)/i.test(text)) return 'goal';
  return 'general';
}

function isConfirmation(text: string) {
  const normalized = text.trim().replace(/[.!؟?]+$/g, '');
  return /^(نعم|اي|إي|ايوه|أيوه|صحيح|تأكيد|اكد|أكد|اعتمد|موافق|تمام|صح)$/i.test(normalized);
}

function isRejection(text: string) {
  const normalized = text.trim().replace(/[.!؟?]+$/g, '');
  return /^(لا|غير صحيح|خطأ|غلط|ارفض|أرفض|رفض)$/i.test(normalized);
}

export function recommendedConversationRoom(intent: Intent, current: ConversationRoomKey): ConversationRoomKey {
  if (intent === 'reserve') return 'solvency';
  if (intent === 'investment' || intent === 'goal') return 'assets';
  if (intent === 'financing') return 'hilal';
  if (intent === 'income' || intent === 'obligation') return 'central';
  return current;
}

function agentForRoom(roomKey: ConversationRoomKey) {
  const participant = governedRooms[roomKey].participants[0];
  if (!participant) return { key: `${roomKey}-agent`, name: governedRooms[roomKey].title };
  return { key: participant.key, name: participant.name };
}

function firstAmount(amounts: number[]) {
  const value = amounts[0];
  return typeof value === 'number' ? value : null;
}

function formatSar(value: number) {
  return new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 }).format(value);
}

function baselineFrom(metadata: Record<string, unknown>): BaselineState {
  if (!metadata.financial_baseline || typeof metadata.financial_baseline !== 'object') return {};
  return metadata.financial_baseline as BaselineState;
}

function baselineMetrics(baseline: BaselineState) {
  const income = baseline.monthly_net_income_confirmed;
  const obligations = baseline.recurring_core_obligations_total;
  if (typeof income !== 'number' || typeof obligations !== 'number') return null;
  return {
    monthly_net_income: income,
    recurring_core_obligations_total: obligations,
    safety_margin: income - obligations,
    obligation_ratio: income > 0 ? obligations / income : null,
    income_to_obligations_coverage: obligations > 0 ? income / obligations : null,
  };
}

function missingBaselineFields(baseline: BaselineState) {
  const missing: string[] = [];
  if (typeof baseline.monthly_net_income_confirmed !== 'number') missing.push('monthly_net_income');
  if (typeof baseline.recurring_core_obligations_total !== 'number') missing.push('recurring_core_obligations');
  return missing;
}

function confirmPending(baseline: BaselineState) {
  const pending = baseline.pending_confirmation;
  if (!pending) return { baseline, confirmedType: null as string | null };
  const next: BaselineState = { ...baseline, updated_at: new Date().toISOString() };
  if (pending.type === 'monthly_net_income') {
    next.monthly_net_income_confirmed = pending.value;
    next.monthly_net_income_candidate = pending.value;
  } else {
    next.recurring_core_obligations_confirmed = pending.values;
    next.recurring_core_obligations_candidates = pending.values;
    next.recurring_core_obligations_total = pending.values.reduce((sum, value) => sum + value, 0);
  }
  delete next.pending_confirmation;
  return { baseline: next, confirmedType: pending.type };
}

function buildCentralReply(text: string, intent: Intent, amounts: number[], metadata: Record<string, unknown>) {
  let baseline = baselineFrom(metadata);
  let body = '';
  let kind: ConversationMessageKind = 'request';
  let confidence = 0.55;
  let routedRoom: ConversationRoomKey = 'central';
  let confirmedFact: string | null = null;

  if (isConfirmation(text) && baseline.pending_confirmation) {
    const confirmed = confirmPending(baseline);
    baseline = confirmed.baseline;
    confirmedFact = confirmed.confirmedType;
    confidence = 1;
    const metrics = baselineMetrics(baseline);
    if (metrics && !missingBaselineFields(baseline).length) {
      kind = 'recommendation';
      routedRoom = 'solvency';
      const ratioText = typeof metrics.obligation_ratio === 'number' ? `${(metrics.obligation_ratio * 100).toFixed(1)}٪` : 'غير متاح';
      body = `تم تثبيت خط الأساس المالي. الدخل الشهري الصافي المؤكد ${formatSar(metrics.monthly_net_income)} ريال، والالتزامات الأساسية المتكررة ${formatSar(metrics.recurring_core_obligations_total)} ريال. الهامش الحسابي الأولي ${formatSar(metrics.safety_margin)} ريال، ونسبة الالتزامات إلى الدخل ${ratioText}. الخطوة التالية تقييم الملاءة قبل أي توصية تمويل أو استثمار.`;
    } else if (confirmed.confirmedType === 'monthly_net_income' && typeof baseline.monthly_net_income_confirmed === 'number') {
      body = `تم تثبيت الدخل الشهري الصافي عند ${formatSar(baseline.monthly_net_income_confirmed)} ريال. الآن أرسل الالتزامات الأساسية الثابتة التي تتكرر شهريًا وقيمة كل التزام.`;
    } else {
      body = `تم تثبيت الالتزامات الأساسية المتكررة بإجمالي ${formatSar(baseline.recurring_core_obligations_total ?? 0)} ريال. ${typeof baseline.monthly_net_income_confirmed === 'number' ? 'أصبح لدينا ما يكفي لحساب الهامش الأولي.' : 'باقي متوسط الدخل الشهري الصافي حتى يكتمل خط الأساس.'}`;
    }
    return { body, kind, confidence, baseline, routedRoom, confirmedFact };
  }

  if (isRejection(text) && baseline.pending_confirmation) {
    delete baseline.pending_confirmation;
    confidence = 1;
    body = 'تم إلغاء القيمة المرشحة ولم أعتمدها. أرسل القيمة الصحيحة مع وصفها.';
    return { body, kind, confidence, baseline, routedRoom, confirmedFact };
  }

  const amount = firstAmount(amounts);
  if (intent === 'income' && amount !== null) {
    baseline = { ...baseline, monthly_net_income_candidate: amount, pending_confirmation: { type: 'monthly_net_income', value: amount, raw_text: text }, updated_at: new Date().toISOString() };
    confidence = 0.92;
    body = `التقطت دخلًا شهريًا صافيًا قدره ${formatSar(amount)} ريال. هل أعتمد هذه القيمة؟`;
  } else if (intent === 'obligation' && amount !== null) {
    baseline = { ...baseline, recurring_core_obligations_candidates: amounts, pending_confirmation: { type: 'recurring_core_obligations', values: amounts, raw_text: text }, updated_at: new Date().toISOString() };
    confidence = amounts.length > 1 ? 0.88 : 0.78;
    const total = amounts.reduce((sum, value) => sum + value, 0);
    body = `التقطت التزامات أساسية بإجمالي ${formatSar(total)} ريال. اكتب «تأكيد» لاعتمادها أو أرسل التصحيح.`;
  } else if (amount !== null && intent === 'general') {
    confidence = 0.35;
    body = `وجدت مبلغًا قدره ${formatSar(amount)} ريال، لكن لا أريد افتراض معناه. هل هو دخل، التزام، مصروف، هدف أم رصيد متاح؟`;
  } else if (intent === 'reserve' || intent === 'investment' || intent === 'financing' || intent === 'goal') {
    routedRoom = recommendedConversationRoom(intent, 'central');
    confidence = 0.8;
    body = `الموضوع يرتبط مباشرة بـ${governedRooms[routedRoom].title}. سأحتفظ فقط بالبيانات المؤكدة، ولن يُعامل أي مبلغ غير مؤكد كسيولة متاحة.`;
  } else {
    body = missingBaselineFields(baseline).length
      ? 'أحتاج تثبيت متوسط الدخل الشهري الصافي والالتزامات الأساسية المتكررة. كل قيمة ستُعرض عليك للتأكيد قبل اعتمادها.'
      : 'خط الأساس المالي مثبت. يمكنك الآن طرح موضوع الملاءة أو الاستثمار أو التمويل أو الأهداف.';
  }
  return { body, kind, confidence, baseline, routedRoom, confirmedFact };
}

function buildRoomReply(roomKey: ConversationRoomKey, amounts: number[]) {
  const amount = firstAmount(amounts);
  if (roomKey === 'assets') return { kind:'recommendation' as ConversationMessageKind, body: amount === null ? 'أرسل قيمة المبلغ والهدف والمدة المتوقعة، وسأتحقق أولًا من المبلغ الآمن المتاح بعد حماية الالتزامات.' : `استلمت مبلغًا قدره ${formatSar(amount)} ريال للتحليل. سأقارنه أولًا بالسعة الآمنة بعد حماية أموال الملاءة والأهداف القريبة.`, confidence: amount === null ? 0.4 : 0.72 };
  if (roomKey === 'hilal') return { kind:'request' as ConversationMessageKind, body: amount === null ? 'اذكر مبلغ التمويل المطلوب والغرض وموعد السداد المتوقع.' : `استلمت طلبًا بقيمة ${formatSar(amount)} ريال. سأختبره مقابل السعة الآمنة والتغطية الأساسية قبل أي اعتماد.`, confidence: amount === null ? 0.44 : 0.74 };
  if (roomKey === 'advisor') return { kind:'recommendation' as ConversationMessageKind, body:'سأبني التحليل على البيانات المؤكدة فقط وأوضح درجة الثقة والبيانات الناقصة.', confidence:0.58 };
  if (roomKey === 'operations') return { kind:'message' as ConversationMessageKind, body:'استلمت الرسالة في مركز العمليات والمطابقة. سأحفظها كعملية قيد المراجعة، وأطابق المبلغ والتاجر والحساب أو البطاقة دون اعتبارها تنفيذًا جديدًا.', confidence:0.9 };
  if (roomKey === 'secretary') return { kind:'message' as ConversationMessageKind, body:'أنا أمين السر المركزي. أستطيع عرض السياسات والصلاحيات والمحاضر والاجتماعات، أو فتح طلب مراجعة رسمي لأي فقرة دون تعديل السجل التاريخي بصمت.', confidence:0.95 };
  if (roomKey === 'council') return { kind:'request' as ConversationMessageKind, body:'أرسل القرار المطلوب اعتماده وسببه والبيانات المؤيدة؛ ولن يُعد أي قرار تنفيذًا ماليًا خارجيًا.', confidence:0.58 };
  return { kind:'message' as ConversationMessageKind, body:'استلمت رسالتك وسأتعامل معها وفق البيانات المؤكدة فقط.', confidence:0.5 };
}

export async function createRoutedReply(userId: string, roomKey: ConversationRoomKey, userText: string): Promise<RoutedReply | null> {
  const sql = getRawSql();
  const threadRows = await sql`select id, metadata from public.conversation_threads where user_id=${userId} and room_key=${roomKey} limit 1`;
  const threadId = threadRows[0]?.id as string | undefined;
  if (!threadId) return null;

  const text = userText.trim();
  const amounts = numbersFrom(text);
  const intent = detectConversationIntent(text);
  const metadata = threadRows[0]?.metadata && typeof threadRows[0].metadata === 'object' ? threadRows[0].metadata as Record<string, unknown> : {};
  const agent = agentForRoom(roomKey);

  let body: string;
  let kind: ConversationMessageKind;
  let confidence: number;
  let routedRoom = recommendedConversationRoom(intent, roomKey);
  let nextMetadata = metadata;
  let financialMetrics: ReturnType<typeof baselineMetrics> = null;
  let missingFields: string[] = [];
  let confirmedFact: string | null = null;

  if (roomKey === 'central') {
    const result = buildCentralReply(text, intent, amounts, metadata);
    body = result.body;
    kind = result.kind;
    confidence = result.confidence;
    routedRoom = result.routedRoom;
    confirmedFact = result.confirmedFact;
    financialMetrics = baselineMetrics(result.baseline);
    missingFields = missingBaselineFields(result.baseline);
    nextMetadata = { ...metadata, financial_baseline: result.baseline, onboarding_started:true, last_detected_intent:intent, last_confidence:confidence };
  } else {
    const result = buildRoomReply(roomKey, amounts);
    body = result.body;
    kind = result.kind;
    confidence = result.confidence;
    nextMetadata = { ...metadata, last_detected_intent:intent, last_confidence:confidence };
  }

  const structuredData = {
    intent,
    confidence,
    confidence_percent: Math.round(confidence * 100),
    routed_room: routedRoom,
    current_room: roomKey,
    extracted_amounts: amounts,
    financial_metrics: financialMetrics,
    missing_fields: missingFields,
    confirmed_fact: confirmedFact,
    requires_user_confirmation: confidence < 0.9,
    execution_boundary: 'advisory_only',
  };

  const rows = await sql.transaction([
    sql`insert into public.conversation_messages (id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data) values (${randomUUID()},${threadId},${userId},'agent',${agent.key},${agent.name},${kind},${body},${JSON.stringify(structuredData)}::jsonb) returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at`,
    sql`update public.conversation_threads set updated_at=now(), metadata=${JSON.stringify(nextMetadata)}::jsonb where id=${threadId} and user_id=${userId} returning id`,
  ]);
  return (rows[0]?.[0] ?? null) as RoutedReply | null;
}
