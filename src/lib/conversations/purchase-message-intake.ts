import { createHash, randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import { getConversationRoom, type ConversationRoomKey } from '@/lib/conversations/store';

export type ParsedPurchaseMessage={
  kind:'POS'|'ONLINE'|'PURCHASE';
  amount:number;
  currency:'SAR';
  transactionDate:string|null;
  transactionTime:string|null;
  merchantRaw:string|null;
  cardLast4:string|null;
  accountLast4:string|null;
  instrumentHint:string|null;
  remainingBalance:number|null;
  sourceText:string;
};

function normalizeDigits(input:string){
  const map:Record<string,string>={'٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'};
  return input.replace(/[٠-٩]/g,d=>map[d]??d).replace(/[٬,](?=\d{3}(?:\D|$))/g,'');
}
function numberFrom(value:string|undefined){
  if(!value)return null;
  const n=Number(normalizeDigits(value).replace(/,/g,'').trim());
  return Number.isFinite(n)?n:null;
}
function cleanMerchant(value:string|undefined){
  const raw=(value??'').trim().replace(/[؜\u200e\u200f]/g,'');
  if(!raw)return null;
  if(/^(في|من|عبر)$/i.test(raw))return null;
  return raw.slice(0,180);
}
function normalizeDate(raw:string|undefined){
  if(!raw)return null;
  const value=normalizeDigits(raw.trim());
  let m=value.match(/^(20\d{2})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if(m)return `${m[1]}-${String(Number(m[2])).padStart(2,'0')}-${String(Number(m[3])).padStart(2,'0')}`;
  m=value.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2})$/);
  if(m)return `20${m[3]}-${String(Number(m[2])).padStart(2,'0')}-${String(Number(m[1])).padStart(2,'0')}`;
  return null;
}

export function parsePurchaseMessage(input:string):ParsedPurchaseMessage|null{
  const text=normalizeDigits(input).replace(/[؜\u200e\u200f]/g,' ').trim();
  if(!text||!/(شراء|PoS|مدى|VISA|بطاقة|AlinmaPay)/i.test(text))return null;

  const amountMatch=
    text.match(/(?:مبلغ\s*:?|بـ)\s*([0-9]+(?:\.[0-9]+)?)\s*(?:SAR|ريال)/i) ??
    text.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:SAR|ريال)/i);
  const amount=numberFrom(amountMatch?.[1]);
  if(amount===null||amount<=0)return null;

  const dateTime=
    text.match(/(20\d{2}[-\/]\d{1,2}[-\/]\d{1,2})\s+(\d{1,2}:\d{2})/) ??
    text.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2})\s+(\d{1,2}:\d{2})/);

  const merchantMatch=
    text.match(/(?:لدى\s*:|لـ)\s*([^\n]+)/i) ??
    text.match(/(?:التاجر|المتجر)\s*:?\s*([^\n]+)/i);

  const card=
    text.match(/بطاقة\s*:?\s*\*{0,2}(\d{4})/i)?.[1] ??
    text.match(/مدى\s*\*(\d{4})/i)?.[1] ??
    null;
  const account=text.match(/حساب\s*:?\s*\*{0,2}(\d{4})/i)?.[1]??null;
  const instrumentHint=text.match(/عبر\s*:?\s*(\d{4})/i)?.[1]??null;
  const balanceMatch=text.match(/الرصيد\s+المتبقي\s*:?\s*(?:ريال\s*)?([0-9]+(?:\.[0-9]+)?)/i);

  return {
    kind:/PoS|أثير/i.test(text)?'POS':/الإنترنت|انترنت|VISA/i.test(text)?'ONLINE':'PURCHASE',
    amount,
    currency:'SAR',
    transactionDate:normalizeDate(dateTime?.[1]),
    transactionTime:dateTime?.[2]??null,
    merchantRaw:cleanMerchant(merchantMatch?.[1]),
    cardLast4:card,
    accountLast4:account,
    instrumentHint,
    remainingBalance:numberFrom(balanceMatch?.[1]),
    sourceText:input.trim(),
  };
}

export function looksLikePurchaseMessage(input:string){
  return parsePurchaseMessage(input)!==null;
}

type PurchaseRouteReply={
  id:unknown;
  sender_type:unknown;
  sender_key:unknown;
  sender_name:unknown;
  message_kind:unknown;
  body:unknown;
  structured_data:unknown;
  created_at:unknown;
};

type PurchaseRouteResult={
  duplicate:boolean;
  parsed:ParsedPurchaseMessage;
  fingerprint:string;
  summary:string;
  operationId?:string;
  reply:PurchaseRouteReply|null;
};

export async function routePurchaseMessage(input:{
  userId:string;
  sourceRoom:ConversationRoomKey;
  text:string;
}):Promise<PurchaseRouteResult|null>{
  const parsed=parsePurchaseMessage(input.text);
  if(!parsed)return null;

  const fingerprint=createHash('sha256').update(parsed.sourceText).digest('hex');
  const sql=getRawSql();
  const existing=await sql`
    select id,structured_data
    from public.conversation_messages
    where user_id=${input.userId}::uuid
      and structured_data->>'purchase_fingerprint'=${fingerprint}
    limit 1
  `;
  if(existing[0]){
    return {
      duplicate:true,
      parsed,
      fingerprint,
      summary:'هذه الرسالة مسجلة مسبقًا، لذلك لم أنشئ عملية مكررة.',
      reply:null,
    };
  }

  const operations=await getConversationRoom(input.userId,'operations');
  const operationId=randomUUID();
  const merchant=parsed.merchantRaw??'تاجر غير معروف';
  const summary=`سجلت عملية شراء مبدئيًا: ${parsed.amount.toFixed(2)} ريال لدى ${merchant}. ستبقى تحت المطابقة والتصنيف حتى يكتمل الربط.`;

  const operationRows=await sql`
    insert into public.conversation_messages(
      id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
    ) values(
      ${operationId}::uuid,${operations.threadId}::uuid,${input.userId}::uuid,'agent',
      'operations-matcher','مركز العمليات والمطابقة','followup',${summary},
      ${JSON.stringify({
        purchase_intake:true,
        purchase_fingerprint:fingerprint,
        source_room:input.sourceRoom,
        source_text:parsed.sourceText,
        amount:parsed.amount,
        currency:parsed.currency,
        transaction_kind:parsed.kind,
        transaction_date:parsed.transactionDate,
        transaction_time:parsed.transactionTime,
        merchant_raw:parsed.merchantRaw,
        merchant_status:parsed.merchantRaw?'RAW_NEEDS_CLASSIFICATION':'UNKNOWN_NEEDS_CONFIRMATION',
        card_last4:parsed.cardLast4,
        account_last4:parsed.accountLast4,
        instrument_hint:parsed.instrumentHint,
        remaining_balance:parsed.remainingBalance,
        verification_status:'PENDING_MATCH',
        execution_boundary:'record_and_review_only'
      })}::jsonb
    )
    returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
  `;

  let reply=(operationRows[0]??null) as PurchaseRouteReply|null;

  if(input.sourceRoom!=='operations'){
    const source=await getConversationRoom(input.userId,input.sourceRoom);
    const ackRows=await sql`
      insert into public.conversation_messages(
        id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
      ) values(
        gen_random_uuid(),${source.threadId}::uuid,${input.userId}::uuid,'agent',
        'operations-router','نظام توجيه العمليات','followup',
        ${`حوّلت رسالة المشتريات إلى مركز العمليات والمطابقة وسجلتها مرة واحدة للمراجعة. ${summary}`},
        ${JSON.stringify({
          purchase_routed:true,
          operations_message_id:operationId,
          purchase_fingerprint:fingerprint,
          routed_room:'operations',
          execution_boundary:'record_and_review_only'
        })}::jsonb
      )
      returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
    `;
    reply=(ackRows[0]??reply) as PurchaseRouteReply|null;
  }

  return {duplicate:false,parsed,fingerprint,summary,operationId,reply};
}
