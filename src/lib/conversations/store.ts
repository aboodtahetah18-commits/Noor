import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import { syncGovernanceMeetingInvitations } from '@/lib/governance/governance-meeting-scheduler';
import { syncAssetOpportunityPrompt } from '@/lib/conversations/asset-opportunity-cadence';

export type ConversationRoomKey = 'central' | 'operations' | 'solvency' | 'assets' | 'hilal' | 'advisor' | 'secretary' | 'council';
export type ConversationMessageKind = 'message' | 'risk' | 'decision' | 'recommendation' | 'followup' | 'request';

export const governedRooms: Record<ConversationRoomKey, { title: string; subtitle: string; kind: string; participants: Array<{ key: string; name: string; type: 'agent' | 'system'; role: string }> }> = {
  central: { title: 'بنك نماء المركزي', subtitle: 'الحوكمة والاستقرار', kind: 'governor', participants: [{ key: 'central-governor', name: 'محافظ بنك نماء المركزي', type: 'agent', role: 'محافظ خوارزمي' }] },
  operations: { title: 'العمليات والمطابقة', subtitle: 'رسائل المشتريات والحركات والإيصالات', kind: 'operations', participants: [{ key: 'operations-matcher', name: 'مركز العمليات والمطابقة', type: 'system', role: 'محرك مطابقة وتدقيق' }] },
  solvency: { title: 'بنك ملاءة', subtitle: 'الحماية والاحتياطي', kind: 'bank', participants: [{ key: 'solvency-manager', name: 'مدير بنك ملاءة', type: 'agent', role: 'مدير خوارزمي' }, { key: 'risk-advisor', name: 'مستشار المخاطر', type: 'agent', role: 'مستشار مختص' }] },
  assets: { title: 'بنك الأصول الاستثماري', subtitle: 'الأصول والأهداف والاستثمار', kind: 'bank', participants: [{ key: 'assets-manager', name: 'مدير بنك الأصول الاستثماري', type: 'agent', role: 'مدير خوارزمي' }, { key: 'investment-advisor', name: 'مستشار الاستثمار', type: 'agent', role: 'مستشار مختص' }] },
  hilal: { title: 'بنك الهلال', subtitle: 'التمويل الداخلي', kind: 'bank', participants: [{ key: 'hilal-manager', name: 'مدير بنك الهلال', type: 'agent', role: 'مدير خوارزمي' }, { key: 'funding-advisor', name: 'مستشار التمويل', type: 'agent', role: 'مستشار مختص' }] },
  advisor: { title: 'المستشار الاقتصادي', subtitle: 'تحليل الصورة المالية الكلية', kind: 'advisor', participants: [{ key: 'financial-advisor', name: 'المستشار الاقتصادي', type: 'agent', role: 'مستشار خوارزمي' }] },
  secretary: { title: 'أمين السر المركزي', subtitle: 'المحاضر والسياسات والاجتماعات والمتابعة', kind: 'secretary', participants: [{ key: 'central-secretary', name: 'أمين السر المركزي', type: 'agent', role: 'أمين سر خوارزمي' }] },
  council: { title: 'مجلس نماء الأعلى', subtitle: 'القرارات واللجان', kind: 'council', participants: [
    { key: 'central-secretary', name: 'أمين السر المركزي', type: 'agent', role: 'تنسيق الاجتماع والمحضر الحي' },
    { key: 'central-governor', name: 'محافظ بنك نماء المركزي', type: 'agent', role: 'رئيس المجلس' },
    { key: 'solvency-manager', name: 'مدير بنك ملاءة', type: 'agent', role: 'محور الملاءة والاحتياطي' },
    { key: 'assets-manager', name: 'مدير بنك الأصول الاستثماري', type: 'agent', role: 'محور الأصول والاستثمار' },
    { key: 'hilal-manager', name: 'مدير بنك الهلال', type: 'agent', role: 'محور التمويل والانضباط' },
    { key: 'financial-advisor', name: 'المستشار الاقتصادي', type: 'agent', role: 'الرؤية الاقتصادية والموازنة بين البدائل' },
  ] },
};

const onboardingMessage = {
  senderKey: 'central-governor',
  senderName: 'محافظ بنك نماء المركزي',
  body: 'مرحبًا بك في نماء. أنا محافظ بنك نماء المركزي، وسأقود معك تأسيس ملفك خطوة بخطوة. سأطرح سؤالًا رئيسيًا واحدًا في كل مرة، وأحفظ المعلومة الصحيحة حتى لا أكررها عليك. نبدأ من وضعك الأسري: هل أنت أعزب، متزوج، مطلق أو أرمل؟',
  structuredData: {
    onboarding: true,
    stage: 'financial-baseline',
    requested_fields: ['marital_status'],
    execution_boundary: 'advisory_only',
  },
} as const;

export function isConversationRoomKey(value: string): value is ConversationRoomKey {
  return Object.prototype.hasOwnProperty.call(governedRooms, value);
}

async function ensureThread(userId: string, roomKey: ConversationRoomKey) {
  const sql = getRawSql();
  const room = governedRooms[roomKey];
  const existing = await sql`select id, room_key, title, subtitle, room_kind, status, updated_at from public.conversation_threads where user_id=${userId} and room_key=${roomKey} limit 1`;
  let threadId = existing[0]?.id as string | undefined;
  let created = false;

  if (threadId) {
    await sql`update public.conversation_threads set title=${room.title},subtitle=${room.subtitle},room_kind=${room.kind} where id=${threadId} and user_id=${userId}`;
  }

  if (!threadId) {
    const candidateId = randomUUID();
    const inserted = await sql`insert into public.conversation_threads (id,user_id,room_key,title,subtitle,room_kind,status,metadata) values (${candidateId},${userId},${roomKey},${room.title},${room.subtitle},${room.kind},'ACTIVE','{}'::jsonb) on conflict (user_id, room_key) do nothing returning id`;
    threadId = inserted[0]?.id as string | undefined;
    created = Boolean(threadId);
    if (!threadId) {
      const resolved = await sql`select id from public.conversation_threads where user_id=${userId} and room_key=${roomKey} limit 1`;
      threadId = resolved[0]?.id as string;
    }
  }

  for (const participant of room.participants) {
    await sql`insert into public.conversation_participants (id,thread_id,participant_key,display_name,participant_type,role_label,is_active) values (${randomUUID()},${threadId},${participant.key},${participant.name},${participant.type},${participant.role},true) on conflict (thread_id, participant_key) do update set display_name=excluded.display_name, participant_type=excluded.participant_type, role_label=excluded.role_label, is_active=true`;
  }

  if (created && roomKey === 'central') {
    await sql`insert into public.conversation_messages (id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data) values (${randomUUID()},${threadId},${userId},'agent',${onboardingMessage.senderKey},${onboardingMessage.senderName},'request',${onboardingMessage.body},${JSON.stringify(onboardingMessage.structuredData)}::jsonb)`;
    await sql`update public.conversation_threads set updated_at=now(), metadata=jsonb_set(coalesce(metadata,'{}'::jsonb),'{onboarding_started}','true'::jsonb,true) where id=${threadId} and user_id=${userId}`;
  }

  return threadId;
}

export async function listConversationRooms(userId: string) {
  await Promise.all((Object.keys(governedRooms) as ConversationRoomKey[]).map((key) => ensureThread(userId, key)));
  await Promise.all([syncGovernanceMeetingInvitations(userId),syncAssetOpportunityPrompt(userId)]);
  const sql = getRawSql();
  const rows = await sql`select t.id,t.room_key,t.title,t.subtitle,t.room_kind,t.status,t.updated_at,
    (select body from public.conversation_messages m where m.thread_id=t.id order by m.created_at desc limit 1) as last_message,
    (select created_at from public.conversation_messages m where m.thread_id=t.id order by m.created_at desc limit 1) as last_message_at
    from public.conversation_threads t where t.user_id=${userId} order by coalesce((select max(m.created_at) from public.conversation_messages m where m.thread_id=t.id),t.updated_at) desc`;
  return rows;
}

export async function getConversationRoom(userId: string, roomKey: ConversationRoomKey) {
  const threadId = await ensureThread(userId, roomKey);
  const sql = getRawSql();
  const [messages, participants, attachments] = await Promise.all([
    sql`select id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at from public.conversation_messages where thread_id=${threadId} and user_id=${userId} order by created_at asc limit 250`,
    sql`select participant_key,display_name,participant_type,role_label,is_active from public.conversation_participants where thread_id=${threadId} and is_active=true order by created_at asc`,
    sql`select id,file_name,content_type,verification_status,created_at from public.conversation_attachments where thread_id=${threadId} and user_id=${userId} order by created_at desc limit 40`,
  ]);
  return { threadId, room: governedRooms[roomKey], messages, participants, attachments };
}

export async function appendUserMessage(userId: string, userName: string, roomKey: ConversationRoomKey, body: string) {
  const text = body.trim();
  if (!text || text.length > 8000) throw new Error('CONVERSATION_MESSAGE_INVALID');
  const threadId = await ensureThread(userId, roomKey);
  const id = randomUUID();
  const sql = getRawSql();
  const rows = await sql.transaction([
    sql`insert into public.conversation_messages (id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data) values (${id},${threadId},${userId},'user',${userId},${userName},'message',${text},'{}'::jsonb) returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at`,
    sql`update public.conversation_threads set updated_at=now() where id=${threadId} and user_id=${userId} returning id`,
  ]);
  return rows[0]?.[0];
}
