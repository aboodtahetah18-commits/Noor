import { randomUUID, createHash } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import type { ConversationMessageKind } from '@/lib/conversations/store';

export type AllocationRatificationReply={
  id:string;
  sender_type:'agent';
  sender_key:string;
  sender_name:string;
  message_kind:ConversationMessageKind;
  body:string;
  structured_data:Record<string,unknown>;
  created_at?:string;
};

export function isExplicitAllocationRatification(text:string){
  const normalized=text.trim().replace(/\s+/g,' ');
  return /^(اعتماد التوزيع|اعتمد التوزيع|أعتمد التوزيع|اوافق على التوزيع|أوافق على التوزيع|موافق على التوزيع)$/i.test(normalized);
}

export function isExplicitAllocationRejection(text:string){
  const normalized=text.trim().replace(/\s+/g,' ');
  return /^(رفض التوزيع|ارفض التوزيع|أرفض التوزيع|لا أوافق على التوزيع|لا اوافق على التوزيع)$/i.test(normalized);
}

function stableFingerprint(value:unknown){
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export async function ratifyLatestAllocationDraft(userId:string):Promise<AllocationRatificationReply|null>{
  const sql=getRawSql();
  const rows=await sql`
    select m.id,m.thread_id,m.structured_data,m.created_at
    from public.conversation_messages m
    join public.conversation_threads t on t.id=m.thread_id
    where m.user_id=${userId}::uuid
      and t.user_id=${userId}::uuid
      and t.room_key='council'
      and m.sender_key='central-secretary'
      and coalesce(m.structured_data->>'allocation_proposal_id','')<>''
      and m.structured_data->'negotiation'->>'status'='BALANCED_DRAFT'
    order by m.created_at desc
    limit 1
  `;
  const draft=rows[0];
  if(!draft) return null;

  const data=draft.structured_data&&typeof draft.structured_data==='object'
    ? draft.structured_data as Record<string,unknown>
    : {};
  const proposalId=String(data.allocation_proposal_id??'');
  const negotiation=data.negotiation&&typeof data.negotiation==='object'
    ? data.negotiation as Record<string,unknown>
    : {};
  const snapshot=data.allocation_snapshot&&typeof data.allocation_snapshot==='object'
    ? data.allocation_snapshot as Record<string,unknown>
    : {};
  const fingerprint=stableFingerprint({proposalId,negotiation,snapshot});

  const existing=await sql`
    select id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
    from public.conversation_messages
    where user_id=${userId}::uuid
      and thread_id=${String(draft.thread_id)}::uuid
      and structured_data->>'allocation_ratification_proposal_id'=${proposalId}
      and structured_data->>'allocation_ratified'='true'
    order by created_at desc
    limit 1
  `;
  if(existing[0]){
    const row=existing[0];
    return {
      ...row,id:String(row.id),sender_type:'agent',sender_key:String(row.sender_key),sender_name:String(row.sender_name),
      message_kind:String(row.message_kind) as ConversationMessageKind,
      body:String(row.body),
      structured_data:row.structured_data as Record<string,unknown>,
    };
  }

  const inserted=await sql`
    insert into public.conversation_messages(
      id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
    ) values(
      ${randomUUID()},${String(draft.thread_id)}::uuid,${userId}::uuid,'agent','central-secretary','أمين السر المركزي','decision',
      'تم تسجيل اعتمادك لمشروع توزيع الدورة. أصبح التوزيع قرارًا معتمدًا داخل نماء، لكنه لا ينفذ أي تحويل أو سداد أو استثمار تلقائيًا. الخطوة التالية هي تحويل القرار المعتمد إلى خطة دورة قابلة للمتابعة والتنفيذ اليدوي.',
      ${JSON.stringify({
        allocation_ratified:true,
        allocation_ratification_proposal_id:proposalId,
        allocation_fingerprint:fingerprint,
        ratification_source_message_id:String(draft.id),
        ratified_at:new Date().toISOString(),
        negotiation,
        allocation_snapshot:snapshot,
        planning_materialization_pending:true,
        external_execution:false,
        execution_boundary:'قرار داخلي معتمد؛ التنفيذ المالي الخارجي بيد المستخدم فقط',
      })}::jsonb
    )
    returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
  `;
  const row=inserted[0];
  if(!row) return null;
  await sql`update public.conversation_threads set updated_at=now() where id=${String(draft.thread_id)}::uuid`;
  return {
    ...row,id:String(row.id),sender_type:'agent',sender_key:String(row.sender_key),sender_name:String(row.sender_name),
    message_kind:String(row.message_kind) as ConversationMessageKind,
    body:String(row.body),
    structured_data:row.structured_data as Record<string,unknown>,
  };
}

export async function rejectLatestAllocationDraft(userId:string):Promise<AllocationRatificationReply|null>{
  const sql=getRawSql();
  const rows=await sql`
    select m.id,m.thread_id,m.structured_data
    from public.conversation_messages m
    join public.conversation_threads t on t.id=m.thread_id
    where m.user_id=${userId}::uuid and t.user_id=${userId}::uuid and t.room_key='council'
      and m.sender_key='central-secretary'
      and coalesce(m.structured_data->>'allocation_proposal_id','')<>''
      and m.structured_data->'negotiation'->>'status'='BALANCED_DRAFT'
    order by m.created_at desc limit 1
  `;
  const draft=rows[0];
  if(!draft) return null;
  const data=draft.structured_data as Record<string,unknown>;
  const proposalId=String(data.allocation_proposal_id??'');
  const inserted=await sql`
    insert into public.conversation_messages(
      id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
    ) values(
      ${randomUUID()},${String(draft.thread_id)}::uuid,${userId}::uuid,'agent','central-secretary','followup',
      'تم تسجيل رفض مشروع التوزيع الحالي. لن يُحوّل إلى خطة معتمدة. يمكنك تعديل مطلب أي مسؤول أو إضافة بيانات جديدة، ثم نعيد جولة التفاوض.',
      ${JSON.stringify({
        allocation_rejected:true,
        allocation_ratification_proposal_id:proposalId,
        rejected_source_message_id:String(draft.id),
        planning_materialization_pending:false,
        external_execution:false,
      })}::jsonb
    )
    returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
  `;
  const row=inserted[0];
  if(!row) return null;
  return {
    ...row,id:String(row.id),sender_type:'agent',sender_key:String(row.sender_key),sender_name:String(row.sender_name),
    message_kind:String(row.message_kind) as ConversationMessageKind,body:String(row.body),
    structured_data:row.structured_data as Record<string,unknown>,
  };
}
