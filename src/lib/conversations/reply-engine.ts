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

function buildCentralReply(text: string, intent: Intent, amounts: number[], metadata: Record<string, unknown>) {
  const baseline = (metadata.financial_baseline && typeof metadata.financial_baseline === 'object')
    ? metadata.financial_baseline as Record<string, unknown>
    : {};
  const next = { ...baseline };
  let body: string;
  let kind: ConversationMessageKind = 'request';
  let confidence = 0.55;

  if (intent === 'income' && amounts.length) {
    next.monthly_net_income = amounts[0];
    next.monthly_net_income_source = 'user_message';
    confidence = 0.92;
    body = `سجلت مبدئيًا متوسط دخلك الشهري الصافي عند ${formatSar(amounts[0])} ريال. الآن أحتاج الالتزامات الأساسية الثابتة التي تتكرر شهريًا — مثل الإيجار، الأقساط والفواتير الأساسية — مع قيمة كل التزام.`;
  } else if (intent === 'obligation' && amounts.length) {
    next.recurring_core_obligations_candidates = amounts;
    next.recurring_core_obligations_source = 'user_message';
    confidence = amounts.length > 1 ? 0.88 : 0.78;
    body = `التقطت ${amounts.length === 1 ? 'قيمة التزام أساسي واحدة' : `${amounts.length} قيم لالتزامات أساسية`} من رسالتك${amounts.length ? `: ${amounts.map((v) => `${formatSar(v)} ريال`).join('، ')}` : ''}. سأتعامل معها كبيانات مبدئية حتى نتأكد من أسماء البنود ودورية كل مبلغ. ${typeof next.monthly_net_income === 'number' ? 'بعد التأكيد أستطيع حساب هامش الأمان الأولي.' : 'وقبل التحليل أحتاج أيضًا متوسط الدخل الشهري الصافي.'}`;
  } else if (amounts.length && intent === 'general') {
    confidence = 0.35;
    body = `وجدت في رسالتك مبلغًا قدره ${formatSar(amounts[0])} ريال، لكن لا أريد افتراض معناه. هل هذا دخل شهري، التزام ثابت، مصروف، هدف، أم رصيد متاح؟`;
  } else {
    body = 'أحتاج أن نثبت أولًا خط الأساس المالي بدقة. اكتب متوسط الدخل الشهري الصافي، ثم الالتزامات الأساسية الثابتة المتكررة وقيمة كل واحد منها. لن أفترض معنى أي مبلغ غير موضح.';
  }

  return { body, kind, confidence, nextBaseline: next };
}

function buildRoomReply(roomKey: ConversationRoomKey, intent: Intent, amounts: number[]) {
  if (roomKey === 'solvency') {
    return {
      kind: 'risk' as ConversationMessageKind,
      body: amounts.length
        ? `استلمت المبلغ ${formatSar(amounts[0])} ريال ضمن سياق الملاءة. قبل أي توصية سأقارنه بتغطية الالتزامات الأساسية، حجم احتياطي الطوارئ، والسيولة المطلوبة حتى نهاية الدورة. لا أعتبره قابلًا للاستثمار أو التحويل قبل اكتمال هذه البيانات.`
        : 'لتحليل الملاءة أحتاج قيمة الاحتياطي الحالي، متوسط المصروفات الأساسية الشهرية، وأقرب التزامات واجبة. بعدها أعطيك درجة تغطية ومخاطر واضحة.',
      confidence: amounts.length ? 0.72 : 0.42,
    };
  }
  if (roomKey === 'assets') {
    return {
      kind: 'recommendation' as ConversationMessageKind,
      body: amounts.length
        ? `سجلت مبلغًا مرشحًا للتحليل قدره ${formatSar(amounts[0])} ريال. قبل اقتراح الاستثمار سأراجع أفق الهدف، موعد الحاجة للمال، مستوى المخاطر، وما إذا كان هذا المبلغ جزءًا من أموال الحماية أو الطوارئ.`
        : 'أرسل قيمة المبلغ، الهدف المرتبط به، المدة المتوقعة، وهل يمكن تحمل انخفاض مؤقت في القيمة. عندها أبني توصية استثمارية مرتبطة بالمخاطر ولا أتعامل مع أموال الحماية كسيولة استثمارية تلقائيًا.',
      confidence: amounts.length ? 0.68 : 0.4,
    };
  }
  if (roomKey === 'hilal') {
    return {
      kind: 'request' as ConversationMessageKind,
      body: amounts.length
        ? `استلمت مبلغًا مرتبطًا بطلب التمويل قدره ${formatSar(amounts[0])} ريال. سأختبر أولًا أثر التمويل على التغطية الأساسية والسيولة قبل أي اعتماد. وإذا اعتمد الطلب فالتنفيذ الخارجي يبقى بيدك ويحتاج تأكيدًا وإثباتًا.`
        : 'اذكر مبلغ التمويل المطلوب، الغرض، وموعد السداد أو الإغلاق المتوقع. سأفحصه مقابل التغطية الأساسية وحدود المخاطر قبل إصدار توصية.',
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
  const route = recommendedRoom(intent, roomKey);
  const metadata = (threadRows[0]?.metadata && typeof threadRows[0].metadata === 'object') ? threadRows[0].metadata as Record<string, unknown> : {};
  const agent = agentForRoom(roomKey);

  let body: string;
  let kind: ConversationMessageKind;
  let confidence: number;
  let nextMetadata = metadata;

  if (roomKey === 'central') {
    const result = buildCentralReply(text, intent, amounts, metadata);
    body = result.body;
    kind = result.kind;
    confidence = result.confidence;
    nextMetadata = {
      ...metadata,
      financial_baseline: result.nextBaseline,
      onboarding_started: true,
      last_detected_intent: intent,
      last_confidence: confidence,
    };
  } else {
    const result = buildRoomReply(roomKey, intent, amounts);
    body = result.body;
    kind = result.kind;
    confidence = result.confidence;
    nextMetadata = { ...metadata, last_detected_intent: intent, last_confidence: confidence };
  }

  const structuredData = {
    intent,
    confidence,
    routed_room: route,
    current_room: roomKey,
    extracted_amounts: amounts,
    requires_user_confirmation: confidence < 0.9,
    execution_boundary: 'advisory_only',
  };

  const replyId = randomUUID();
  const rows = await sql.transaction([
    sql`insert into public.conversation_messages (id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data) values (${replyId},${threadId},${userId},'agent',${agent.key},${agent.name},${kind},${body},${JSON.stringify(structuredData)}::jsonb) returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at`,
    sql`update public.conversation_threads set updated_at=now(), metadata=${JSON.stringify(nextMetadata)}::jsonb where id=${threadId} and user_id=${userId} returning id`,
  ]);

  return (rows[0]?.[0] ?? null) as RoutedReply | null;
}
