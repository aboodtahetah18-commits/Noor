import { createHash, randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import { getInstitutionalDecisionRegistry } from '@/lib/governance/institutional-decision-registry';

export const FOLLOWUP_EVIDENCE_MAX_BYTES=5*1024*1024;
export const FOLLOWUP_EVIDENCE_TYPES=new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/csv',
]);

export type FollowupUserResponseInput={
  userId:string;
  userName:string;
  roomKey:'central'|'secretary';
  registryId:string;
  followupId:string;
  responseText:string;
  file?:{
    name:string;
    type:string;
    bytes:Uint8Array;
  }|null;
};

function validateEvidenceFile(file:NonNullable<FollowupUserResponseInput['file']>){
  if(!file.name.trim()) throw new Error('FOLLOWUP_EVIDENCE_FILE_NAME_REQUIRED');
  if(file.bytes.byteLength<=0||file.bytes.byteLength>FOLLOWUP_EVIDENCE_MAX_BYTES){
    throw new Error('FOLLOWUP_EVIDENCE_FILE_SIZE_INVALID');
  }
  if(!FOLLOWUP_EVIDENCE_TYPES.has(file.type)){
    throw new Error('FOLLOWUP_EVIDENCE_FILE_TYPE_INVALID');
  }
}

export async function recordFollowupUserResponse(input:FollowupUserResponseInput){
  const responseText=input.responseText.trim();
  if(!responseText&& !input.file) throw new Error('FOLLOWUP_USER_RESPONSE_REQUIRED');
  if(responseText.length>8000) throw new Error('FOLLOWUP_USER_RESPONSE_TOO_LONG');
  if(input.file) validateEvidenceFile(input.file);

  const registry=await getInstitutionalDecisionRegistry(input.userId);
  const decision=registry.decisions.find(item=>item.registryId===input.registryId);
  const followup=decision?.followups.find(item=>item.followupId===input.followupId);
  if(!decision||!followup) throw new Error('DECISION_FOLLOWUP_NOT_FOUND');
  if(followup.completed) throw new Error('DECISION_FOLLOWUP_ALREADY_COMPLETED');
  if(followup.status!=='WAITING_USER') throw new Error('FOLLOWUP_NOT_WAITING_USER');

  const sql=getRawSql();
  const threadRows=await sql`
    select id from public.conversation_threads
    where user_id=${input.userId}::uuid and room_key=${input.roomKey}
    limit 1
  `;
  const threadId=threadRows[0]?.id?String(threadRows[0].id):null;
  if(!threadId) throw new Error('FOLLOWUP_RESPONSE_THREAD_NOT_FOUND');

  const messageId=randomUUID();
  const attachmentId=input.file?randomUUID():null;
  const body=responseText || `أرفقت إثباتًا للمتابعة «${followup.title}» للمراجعة والتحقق.`;
  const attachmentMeta=input.file?{
    id:attachmentId,
    file_name:input.file.name,
    content_type:input.file.type,
    byte_size:input.file.bytes.byteLength,
  }:null;

  const statements=[
    sql`
      insert into public.conversation_messages(
        id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
      ) values(
        ${messageId}::uuid,${threadId}::uuid,${input.userId}::uuid,'user',${input.userId},${input.userName},
        'message',${body},
        ${JSON.stringify({
          institutional_decision_followup_user_response:true,
          institutional_decision_followup_event:true,
          registry_id:input.registryId,
          followup_id:input.followupId,
          followup_title:followup.title,
          followup_status:'VERIFICATION_PENDING',
          followup_assigned_to:followup.assignedTo,
          followup_note:responseText||null,
          event_kind:'USER_RESPONSE_SUBMITTED',
          response_text:responseText||null,
          evidence_attachment:attachmentMeta,
          external_execution:false,
          execution_boundary:'رد أو إثبات مقدم من المستخدم ينتقل للتحقق؛ لا يعتبر تنفيذًا موثقًا ولا يغلق المتابعة تلقائيًا',
        })}::jsonb
      )
    `,
  ];

  if(input.file&&attachmentId){
    const sha256=createHash('sha256').update(input.file.bytes).digest('hex');
    statements.push(
      sql`
        insert into public.conversation_attachments(
          id,thread_id,message_id,user_id,file_name,content_type,storage_key,verification_status
        ) values(
          ${attachmentId}::uuid,${threadId}::uuid,${messageId}::uuid,${input.userId}::uuid,
          ${input.file.name},${input.file.type},${`db://conversation-followup-evidence/${attachmentId}`},'PENDING_REVIEW'
        )
      `,
      sql`
        insert into public.conversation_attachment_blobs(
          attachment_id,content,byte_size,sha256
        ) values(
          ${attachmentId}::uuid,${Buffer.from(input.file.bytes)},${input.file.bytes.byteLength},${sha256}
        )
      `,
    );
  }

  statements.push(
    sql`
      insert into public.conversation_messages(
        id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
      ) values(
        gen_random_uuid(),${threadId}::uuid,${input.userId}::uuid,'agent',
        ${input.roomKey==='central'?'central-governor':'central-secretary'},
        ${input.roomKey==='central'?'محافظ بنك نماء المركزي':'أمين السر المركزي'},
        'followup',
        ${input.file
          ? 'استلمت ردك والإثبات المرفق. انتقلت المتابعة إلى مرحلة التحقق، ولن تعتبر مكتملة قبل مراجعة الإثبات واعتماد النتيجة.'
          : 'استلمت ردك. انتقلت المتابعة إلى مرحلة التحقق، ولن تعتبر مكتملة قبل مراجعة الرد واعتماد النتيجة.'},
        ${JSON.stringify({
          institutional_decision_followup_verification_notice:true,
          registry_id:input.registryId,
          followup_id:input.followupId,
          source_user_message_id:messageId,
          evidence_attachment_id:attachmentId,
          verification_status:'VERIFICATION_PENDING',
          external_execution:false,
        })}::jsonb
      )
    `,
  );

  await sql.transaction(statements);

  const rows=await sql`
    select id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
    from public.conversation_messages
    where id=${messageId}::uuid and user_id=${input.userId}::uuid
    limit 1
  `;
  const replies=await sql`
    select id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
    from public.conversation_messages
    where user_id=${input.userId}::uuid
      and structured_data->>'institutional_decision_followup_verification_notice'='true'
      and structured_data->>'source_user_message_id'=${messageId}
    order by created_at desc
    limit 1
  `;

  return {
    message:rows[0]??null,
    reply:replies[0]??null,
    attachmentId,
    nextStatus:'VERIFICATION_PENDING' as const,
  };
}
