import { getRawSql } from '@/infrastructure/db/client';
import { importBankMessage } from '@/features/bank-statements/commands/import-message';
import { getConversationRoom, type ConversationMessageKind, type ConversationRoomKey } from './store';

type PersistedConversationReply = {
  id:string;
  sender_type:'agent'|'system';
  sender_key:string;
  sender_name:string;
  message_kind:ConversationMessageKind;
  body:string;
  structured_data:Record<string,unknown>;
  created_at?:string;
};

const transactionHints=/(شراء|مشتريات|عملية|مدى|mada|visa|بطاقة|أثير|pos|apple\.com|online|إنترنت|الانترنت|خصم|دفع|تحويل|سحب|إيداع|ايداع|رصيد|عبر:)/i;
const amountHints=/(?:\d|[٠-٩]).*(?:ريال|ر\.?\s?س|sar)|(?:ريال|ر\.?\s?س|sar).*(?:\d|[٠-٩])/i;

export function looksLikeBankMovementMessage(text:string){
  const normalized=text.trim();
  if(normalized.length<8)return false;
  return transactionHints.test(normalized)&&amountHints.test(normalized);
}

async function persistReply(
  userId:string,
  roomKey:ConversationRoomKey,
  senderKey:string,
  senderName:string,
  body:string,
  structuredData:Record<string,unknown>,
  senderType:'agent'|'system'='agent',
):Promise<PersistedConversationReply|null>{
  const room=await getConversationRoom(userId,roomKey);
  const sql=getRawSql();
  const rows=await sql`
    insert into public.conversation_messages(
      id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
    ) values(
      gen_random_uuid(),${room.threadId}::uuid,${userId}::uuid,${senderType},
      ${senderKey},${senderName},'followup',${body},${JSON.stringify(structuredData)}::jsonb
    )
    returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
  `;
  const row=rows[0];
  if(!row)return null;
  return {
    ...row,
    id:String(row.id),
    sender_type:String(row.sender_type) as 'agent'|'system',
    sender_key:String(row.sender_key),
    sender_name:String(row.sender_name),
    message_kind:String(row.message_kind) as ConversationMessageKind,
    body:String(row.body),
    structured_data:row.structured_data&&typeof row.structured_data==='object'
      ? row.structured_data as Record<string,unknown>
      : {},
  };
}

export async function routeBankMovementMessage(input:{
  userId:string;
  originRoom:ConversationRoomKey;
  originMessageId:string;
  text:string;
}):Promise<PersistedConversationReply|null>{
  if(!looksLikeBankMovementMessage(input.text))return null;

  const baseData={
    bank_message:true,
    source_room:input.originRoom,
    source_message_id:input.originMessageId,
    routed_room:'operations',
    execution_boundary:'evidence_and_recording_only',
  };

  let outcome:'matched'|'review'|'needs_input'='review';
  let importId:string|null=null;
  let body='استلم مركز العمليات والمطابقة رسالة الحركة وبدأ التحقق منها.';

  try{
    const result=await importBankMessage(input.userId,input.text,null);
    importId=result.importId;
    if(result.autoApproved){
      outcome='matched';
      body='تم توجيه رسالة الحركة إلى مركز العمليات والمطابقة، وربطها بالسجل وفق قواعد المطابقة ومنع التكرار. يمكنك فتح المركز لمراجعة التفاصيل.';
    }else{
      outcome='review';
      body='تم توجيه رسالة الحركة إلى مركز العمليات والمطابقة وتسجيلها للمراجعة قبل تثبيت التصنيف النهائي.';
    }
  }catch(error){
    outcome='needs_input';
    const reason=error instanceof Error?error.message:'تعذر إكمال المطابقة.';
    body=`وصلت الرسالة إلى مركز العمليات والمطابقة، لكن يلزم استكمال معلومة قبل التسجيل النهائي: ${reason}`;
  }

  const structuredData={...baseData,operation_status:outcome,import_id:importId};

  if(input.originRoom!=='operations'){
    await persistReply(
      input.userId,
      'operations',
      'matching-center',
      'مركز العمليات والمطابقة',
      `وردت رسالة حركة من محادثة أخرى. المرجع: ${input.originMessageId}`,
      structuredData,
      'system',
    );
  }

  return persistReply(
    input.userId,
    input.originRoom,
    'matching-center',
    'مركز العمليات والمطابقة',
    body,
    structuredData,
    'agent',
  );
}
