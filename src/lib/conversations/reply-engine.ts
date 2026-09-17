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

function detectIntent(text: string): Intent {
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

function recommendedRoom(intent: Intent, current: ConversationRoomKey): ConversationRoomKey {
  if (intent === 'reserve') return 'solvency';
  if (intent === 'investment' || intent === 'goal') return 'assets';
  if (intent === 'financing') return 'hilal';
  if (intent === 'income' || intent === 'obligation') return 'central';
  return current;
}

function agentForRoom(roomKey: ConversationRoomKey) {
  const participant = governedRooms[roomKey].participants[0];
  return { key: participant.key, name: participant.name };
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
  const safetyMargin = income - obligations;
  const obligationRatio = income > 0 ? obligations / income : null;
  const incomeCoverage = obligations > 0 ? income / obligations : null;
  return {
    monthly_net_income: income,
    recurring_core_obligations_total: obligations,
    safety_margin: safetyMargin,
    obligation_ratio: obligationRatio,
    income_to_obligations_coverage: incomeCoverage,
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
  if (!pending) return { baseline, confirmed: false as const, confirmedType: null as string | null };
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
  return { baseline: next, confirmed: true as const, confirmedType: pending.type };
}

function buildCentralReply(text: string, intent: Intent, amounts: number[], metadata: Record<string, unknown>) {
  let baseline = baselineFrom(metadata);
  let body: string;
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
    const missing = missingBaselineFields(baseline);
    if (metrics && !missing.length) {
      kind = 'recommendation';
      routedRoom = 'solvency';
      body = `تم تثبيت خط الأساس المالي. الدخل الشهري الصافي المؤكد ${formatSar(metrics.monthly_net_income)} ريال، والالتزامات الأساسية المتكررة ${formatSar(metrics.recurring_core_obligations_total)} ريال. الهامش الحسابي الأولي بعد الالتزامات ${formatSar(metrics.safety_margin)} ريال، ونسبة الالتزامات إلى الدخل ${(metrics.obligation_ratio! * 100).toFixed(1)}٪. هذه أرقام حسابية وليست حكم مخاطر نهائي؛ الخطوة التالية هي تقييم التغطية والاحتياطي لدى بنك الملاءة قبل أي توصية تمويل أو استثمار.`;
    } else if (confirmed.confirmedType === 'monthly_net_income') {
      body = `تم تثبيت الدخل الشهري الصافي عند ${formatSar(baseline.monthly_net_income_confirmed!)} ريال. الآن أرسل الالتزامات الأساسية الثابتة التي تتكرر شهريًا وقيمة كل التزام، وسأعرضها عليك للتأكيد قبل اعتمادها.`;
    } else {
      body = `تم تثبيت الالتزامات الأساسية المتكررة بإجمالي ${formatSar(baseline.recurring_core_obligations_total ?? 0)} ريال. ${typeof baseline.monthly_net_income_confirmed === 'number' ? 'أصبح لدينا ما يكفي لحساب الهامش الأولي.' : 'باقي متوسط الدخل الشهري الصافي حتى يكتمل خط الأساس.'}`;
    }
    return { body, kind, confidence, baseline, routedRoom, confirmedFact };
  }

  if (isRejection(text) && baseline.pending_confirmation) {
    delete baseline.pending_confirmation;
    confidence = 1;
    body = 'تم إلغاء القيمة المرشحة ولم أعتمدها. أرسل القيمة الصحيحة مع وصفها، وسأعرضها عليك للتأكيد من جديد.';
    return { body, kind, confidence, baseline, routedRoom, confirmedFact };
  }

  if (intent === 'income' && amounts.length) {
    const value = amounts[0];
    baseline = {
      ...baseline,
      monthly_net_income_candidate: value,
      pending_confirmation: { type: 'monthly_net_income', value, raw_text: text },
      updated_at: new Date().toISOString(),
    };
    confidence = 0.92;
    body = `التقطت من رسالتك دخلًا شهريًا صافيًا قدره ${formatSar(value)} ريال. لن أعتمده نهائيًا قبل تأكيدك. هل أعتمد ${formatSar(value)} ريال كمتوسط دخلك الشهري الصافي؟`;
  } else if (intent === 'obligation' && amounts.length) {
    baseline = {
      ...baseline,
      recurring_core_obligations_candidates: amounts,
      pending_confirmation: { type: 'recurring_core_obligations', values: amounts, raw_text: text },
      updated_at: new Date().toISOString(),
    };
    confidence = amounts.length > 1 ? 0.88 : 0.78;
    const total = amounts.reduce((sum, value) => sum + value, 0);
    body = `التقطت ${amounts.length === 1 ? 'قيمة التزام أساسي واحدة' : `${amounts.length} قيم لالتزامات أساسية`} بإجمالي ${formatSar(total)} ريال: ${amounts.map((value) => `${formatSar(value)} ريال`).join('، ')}. لن أعتمدها قبل تأكيدك. إذا كانت هذه هي الالتزامات الأساسية الشهرية المتكررة فاكتب «تأكيد»، أو أرسل التصحيح.`;
  } else if (amounts.length && intent === 'general') {
    confidence = 0.35;
    body = `وجدت في رسالتك مبلغًا قدره ${formatSar(amounts[0])} ريال، لكن لا أريد افتراض معناه. هل هذا دخل شهري، التزام ثابت، مصروف، هدف، أم رصيد متاح؟`;
  } else if (intent === 'reserve' || intent === 'investment' || intent === 'financing' || intent === 'goal') {
    routedRoom = recommendedRoom(intent, 'central');
    confidence = 0.8;
    const room = governedRooms[routedRoom];
    body = `الموضوع يرتبط مباشرة بـ${room.title}. سأحافظ على البيانات المؤكدة في خط الأساس، ثم يُستكمل التحليل لدى الجهة المختصة. قبل إصدار توصية تنفيذية نحتاج التأكد من اكتمال الدخل والالتزامات الأساسية، ولن يُعامل أي مبلغ غير مؤكد كسيولة متاحة.`;
  } else {
    const missing = missingBaselineFields(baseline);
    body = missing.length
      ? 'أحتاج أن نثبت خط الأساس المالي بدقة. اكتب متوسط الدخل الشهري الصافي، ثم الالتزامات الأساسية الثابتة المتكررة وقيمة كل واحد منها. كل قيمة ستُعرض عليك للتأكيد قبل اعتمادها.'
      : 'خط الأساس المالي مثبت. يمكنك الآن طرح موضوع الملاءة، الاستثمار، التمويل أو الأهداف، وسأوجهه للجهة المختصة مع الاحتفاظ بالأرقام المؤكدة فقط.';
  }

  return { body, kind, confidence, baseline, routedRoom, confirmedFact };
}

function buildRoomReply(roomKey: ConversationRoomKey, amounts: number[]) {
  if (roomKey === 'solvency') {
    return {
      kind: 'risk' as ConversationMessageKind,
      body: amounts.length
        ? `استلمت المبلغ ${formatSar(amounts[0])} ريال ضمن سياق الملاءة. قبل أي توصية سأقارنه بالتغطية الأساسية، الاحتياطي والسيولة المطلوبة حتى نهاية الدورة. لا أعتبره قابلًا للاستثمار أو التحويل قبل اكتمال هذه البيانات.`
        : 'لتحليل الملاءة أحتاج قيمة الاحتياطي الحالي، متوسط المصروفات الأساسية الشهرية، وأقرب الالتزامات واجبة السداد. بعدها أحسب التغطية وأوضح مستوى المخاطر ودرجة الثقة.',
      confidence: amounts.length ? 0.72 : 0.42,
    };
  }
  if (roomKey === 'assets') {
    return {
      kind: 'recommendation' as ConversationMessageKind,
      body: amounts.length
        ? `سجلت مبلغًا مرشحًا للتحليل قدره ${formatSar(amounts[0])} ريال. قبل اقتراح الاستثمار سأراجع أفق الهدف، موعد الحاجة للمال، مستوى المخاطر، وما إذا كان المبلغ جزءًا من أموال الحماية أو الطوارئ.`
        : 'أرسل قيمة المبلغ، الهدف المرتبط به، المدة المتوقعة، وهل يمكن تحمل انخفاض مؤقت في القيمة. لن أتعامل مع أموال الحماية كسيولة استثمارية تلقائيًا.',
      confidence: amounts.length ? 0.68 : 0.4,
    };
  }
  if (roomKey === 'hilal') {
    return {
      kind: 'request' as ConversationMessageKind,
      body: amounts.length
        ? `استلمت مبلغًا مرتبطًا بطلب التمويل قدره ${formatSar(amounts[0])} ريال. سأختبر أولًا أثر التمويل على التغطية الأساسية والسيولة. وإذا اعتمد الطلب فالتنفيذ الخارجي يبقى بيدك ويحتاج تأكيدًا وإثباتًا.`
        : 'اذكر مبلغ التمويل المطلوب، الغرض، وموعد السداد المتوقع. سأفحصه مقابل التغطية الأساسية وحدود المخاطر قبل إصدار توصية.',
      confidence: amounts.length ? 0.74 : 0.44,
    };
  }
  if (roomKey === 'advisor') {
    return {
      kind: 'recommendation' as ConversationMessageKind,
      body: 'سأبني التحليل على البيانات المؤكدة فقط، وأوضح لك ما هو معلوم وما هو ناقص ودرجة الثقة. أرسل القرار أو المسألة المالية التي تريد دراستها مع الأرقام والتواريخ المتاحة.',
      confidence: 0.58,
    };
  }
  if (roomKey === 'council') {
    return {
      kind: 'request' as ConversationMessageKind,
      body: 'سأعرض الموضوع على المسار الحوكمي المناسب فقط. أرسل القرار المطلوب اعتماده، سببه، البيانات المؤيدة، والبدائل إن وجدت؛ ولن يُعد أي قرار تنفيذًا ماليًا خارجيًا.',
      confidence: 0.58,
    };
  }
  return {
    kind: 'message' as ConversationMessageKind,
    body: 'استلمت رسالتك. سأتعامل معها وفق الجهة الحالية والبيانات المؤكدة فقط، وأطلب أي معلومات ناقصة قبل إصدار توصية مالية.',
    confidence: 0.5,
  };
}

export async function createRoutedReply(userId: string, roomKey: ConversationRoomKey, userText: string): Promise<RoutedReply | null> {
  const sql = getRawSql();
  const threadRows = await sql`select id, metadata from public.conversation_threads where user_id=${userId} and room_key=${roomKey} limit 1`;
  const threadId = threadRows[0]?.id as string | undefined;
  if (!threadId) return null;

  const text = userText.trim();
  const amounts = numbersFrom(text);
  const intent = detectIntent(text);
  const metadata = (threadRows[0]?.metadata && typeof threadRows[0].metadata === 'object') ? threadRows[0].metadata as Record<string, unknown> : {};
  const agent = agentForRoom(roomKey);

  let body: string;
  let kind: ConversationMessageKind;
  let confidence: number;
  let routedRoom = recommendedRoom(intent, roomKey);
  let nextMetadata = metadata;
  let confirmedFact: string | null = null;

  if (roomKey === 'central') {
    const result = buildCentralReply(text, intent, amounts, metadata);
    body = result.body;
    kind = result.kind;
    confidence = result.confidence;
    routedRoom = result.routedRoom;
    confirmedFact = result.confirmedFact;
    nextMetadata = {
      ...metadata,
      financial_baseline: result.baseline,
      onboarding_started: true,
      last_detected_intent: intent,
      last_confidence: confidence,
      last_routed_room: routedRoom,
    };
  } else {
    const result = buildRoomReply(roomKey, amounts);
    body = result.body;
    kind = result.kind;
    confidence = result.confidence;
    nextMetadata = { ...metadata, last_detected_intent: intent, last_confidence: confidence, last_routed_room: routedRoom };
  }

  const baseline = baselineFrom(nextMetadata);
  const metrics = baselineMetrics(baseline);
  const structuredData = {
    intent,
    confidence,
    confidence_percent: Math.round(confidence * 100),
    routed_room: routedRoom,
    current_room: roomKey,
    extracted_amounts: amounts,
    confirmed_fact: confirmedFact,
    pending_confirmation: baseline.pending_confirmation ?? null,
    financial_metrics: metrics,
    missing_fields: roomKey === 'central' ? missingBaselineFields(baseline) : [],
    requires_user_confirmation: Boolean(baseline.pending_confirmation) || confidence < 0.9,
    execution_boundary: 'advisory_only',
  };

  const replyId = randomUUID();
  const rows = await sql.transaction([
    sql`insert into public.conversation_messages (id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data) values (${replyId},${threadId},${userId},'agent',${agent.key},${agent.name},${kind},${body},${JSON.stringify(structuredData)}::jsonb) returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at`,
    sql`update public.conversation_threads set updated_at=now(), metadata=${JSON.stringify(nextMetadata)}::jsonb where id=${threadId} and user_id=${userId} returning id`,
  ]);

  return (rows[0]?.[0] ?? null) as RoutedReply | null;
}
