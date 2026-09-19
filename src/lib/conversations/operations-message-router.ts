import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import { getConversationRoom, type ConversationRoomKey } from '@/lib/conversations/store';

export type CapturedPurchaseMessage = {
  amount:number|null;
  currency:'ريال سعودي';
  merchant:string|null;
  card_last4:string|null;
  account_last4:string|null;
  occurred_on:string|null;
};

function arabicDigits(value:string){
  const map:Record<string,string>={'٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'};
  return value.replace(/[٠-٩]/g,d=>map[d]??d);
}

export function looksLikePurchaseMessage(text:string){
  const normalized=arabicDigits(text);
  const hasAmount=/\d+(?:[.,]\d{1,2})?\s*(?:ريال|ر\.?\s?س|SAR)/i.test(normalized);
  const hasSignal=/(شراء|مشتريات|نقاط بيع|مدى|فيزا|visa|بطاقة|apple\.com\/bill|خصم|دفع|عملية|pos|online)/i.test(normalized);
  return hasAmount&&hasSignal;
}

export function parsePurchaseMessage(text:string):CapturedPurchaseMessage{
  const normalized=arabicDigits(text).replace(/,/g,'');
  const amountMatch=normalized.match(/(\d+(?:\.\d{1,2})?)\s*(?:ريال|ر\.?\s?س|SAR)/i);
  const cardMatch=normalized.match(/(?:مدى|فيزا|visa|بطاقة)[^\d]{0,16}\*{0,2}(\d{4})/i);
  const accountMatch=normalized.match(/(?:حساب|account)[^\d]{0,16}\*{0,2}(\d{4})/i);
  const dateMatch=normalized.match(/\b(20\d{2}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})\b/);
  const merchantMatch=normalized.match(/(?:لدى|عند|merchant\s*:?|at\s+)([^\n;،]{2,60})/i)
    ?? normalized.match(/\b(APPLE\.COM\/BILL|[A-Za-z][A-Za-z0-9 .&'_-]{2,50})\b/);
  const merchantRaw=merchantMatch?.[1]?.trim()??null;
  const merchant=merchantRaw
    ? merchantRaw.replace(/\s+(?:بتاريخ|تاريخ|date\s*:?).*$/i,'').trim()||null
    : null;
  return {
    amount:amountMatch?Number(amountMatch[1]):null,
    currency:'ريال سعودي',
    merchant,
    card_last4:cardMatch?.[1]??null,
    account_last4:accountMatch?.[1]??null,
    occurred_on:dateMatch?.[1]??null,
  };
}

export async function routePurchaseMessageToOperations(args:{
  userId:string;
  sourceRoom:ConversationRoomKey;
  sourceMessageId:string;
  text:string;
}){
  if(!looksLikePurchaseMessage(args.text)) return null;
  const capture=parsePurchaseMessage(args.text);
  const room=await getConversationRoom(args.userId,'operations');
  const sql=getRawSql();
  const structured={
    operation_capture:true,
    status:'قيد المراجعة',
    source_room:args.sourceRoom,
    source_message_id:args.sourceMessageId,
    extracted:capture,
    deduplication_key:[capture.amount,capture.card_last4,capture.account_last4,capture.occurred_on,capture.merchant].join('|'),
    execution_boundary:'لا ينشئ تحويلًا أو دفعًا جديدًا',
  };
  const body=capture.amount!==null
    ? `تم التقاط عملية بقيمة ${new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(capture.amount)} ريال وإرسالها للمطابقة والتصنيف. ستبقى قيد المراجعة حتى تكتمل المطابقة.`
    : 'تم التقاط رسالة حركة وإرسالها للمطابقة والتصنيف. ستبقى قيد المراجعة حتى تكتمل المطابقة.';
  const rows=await sql`
    insert into public.conversation_messages(
      id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
    ) values(
      ${randomUUID()},${room.threadId}::uuid,${args.userId}::uuid,'system',
      'operations-matcher','مركز العمليات والمطابقة','followup',${body},${JSON.stringify(structured)}::jsonb
    )
    returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
  `;
  await sql`update public.conversation_threads set updated_at=now() where id=${room.threadId}::uuid`;
  return rows[0]??null;
}
