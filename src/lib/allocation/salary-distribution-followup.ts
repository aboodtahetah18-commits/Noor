import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';

type DistributionInstruction={
  key:string;
  title:string;
  amount:number;
  sourceAccountId:string|null;
  destinationAccountId:string|null;
  destinationAccountName:string|null;
  status:'READY'|'NEEDS_ACCOUNT_MAPPING';
  externalExecution:false;
};

function record(value:unknown):Record<string,unknown>|null{
  return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
}

export function isSalaryDistributionConfirmation(text:string){
  return /^(تم\s+(?:ال)?تحويل|حوّلت|حولت|تم\s+التوزيع|نفذت\s+التحويل)/i.test(text.trim());
}

function scoreInstruction(text:string,item:DistributionInstruction){
  const raw=text.toLowerCase();
  const title=item.title.toLowerCase().replace(/^بند\s+/,'');
  let score=0;
  if(raw.includes(title))score+=5;
  for(const token of title.split(/\s+/).filter(token=>token.length>=3)){if(raw.includes(token))score+=1;}
  if(raw.includes(String(item.amount)))score+=2;
  if(item.key==='savings'&&/ادخار|توفير/.test(raw))score+=5;
  if(item.key==='reserve'&&/احتياط/.test(raw)&&!/إضاف|اضاف/.test(raw))score+=5;
  if(item.key==='additional_reserve'&&/احتياط/.test(raw)&&/إضاف|اضاف/.test(raw))score+=6;
  return score;
}

export async function confirmSalaryDistributionStep(userId:string,text:string){
  const sql=getRawSql();
  const activationRows=await sql`
    select id,thread_id,structured_data
    from public.conversation_messages
    where user_id=${userId}::uuid
      and structured_data->>'salary_cycle_activation'='true'
      and structured_data->>'activation_status'='ACTIVATED'
    order by created_at desc limit 1
  `;
  const activation=activationRows[0];
  const data=record(activation?.structured_data);
  const cycleId=typeof data?.cycle_id==='string'?data.cycle_id:null;
  const instructions=Array.isArray(data?.distribution_instructions)
    ?data!.distribution_instructions.flatMap(item=>{
      const row=record(item);
      if(!row||typeof row.key!=='string'||typeof row.title!=='string')return [];
      const amount=Number(row.amount);
      if(!Number.isFinite(amount)||amount<=0)return [];
      return [{
        key:row.key,title:row.title,amount,
        sourceAccountId:typeof row.sourceAccountId==='string'?row.sourceAccountId:null,
        destinationAccountId:typeof row.destinationAccountId==='string'?row.destinationAccountId:null,
        destinationAccountName:typeof row.destinationAccountName==='string'?row.destinationAccountName:null,
        status:row.status==='READY'?'READY':'NEEDS_ACCOUNT_MAPPING',
        externalExecution:false as const,
      } satisfies DistributionInstruction];
    })
    :[];
  if(!activation?.thread_id||!cycleId||!instructions.length)return {status:'NO_DISTRIBUTION_PLAN' as const,reply:null};

  const confirmationRows=await sql`
    select structured_data from public.conversation_messages
    where user_id=${userId}::uuid
      and structured_data->>'salary_distribution_confirmation'='true'
      and structured_data->>'cycle_id'=${cycleId}
  `;
  const confirmedKeys=new Set(confirmationRows.map(row=>{
    const d=record(row.structured_data);
    return typeof d?.instruction_key==='string'?d.instruction_key:'';
  }).filter(Boolean));
  const pending=instructions.filter(item=>item.status==='READY'&&!confirmedKeys.has(item.key));
  if(!pending.length){
    const body='جميع تعليمات توزيع الراتب الجاهزة لهذه الدورة مسجلة كمكتملة بالفعل. سأنتقل الآن إلى متابعة الصرف الفعلي والمراجعات الدورية.';
    const rows=await sql`
      insert into public.conversation_messages(
        id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
      ) values(
        ${randomUUID()},${String(activation.thread_id)}::uuid,${userId}::uuid,'agent','budget-spending-owner','مسؤول الميزانية والإنفاق','followup',
        ${body},${JSON.stringify({salary_distribution_confirmation:true,cycle_id:cycleId,distribution_complete:true,external_execution:false})}::jsonb
      )
      returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
    `;
    return {status:'ALL_CONFIRMED' as const,reply:rows[0]??null};
  }

  const ranked=pending.map(item=>({item,score:scoreInstruction(text,item)})).sort((a,b)=>b.score-a.score);
  const selected=ranked[0]&&ranked[0].score>0?ranked[0].item:pending.length===1?pending[0]:null;
  if(!selected){
    const choices=pending.slice(0,5).map(item=>item.title).join('، ');
    const body='لم أحدد أي بند تقصد بالتأكيد دون تخمين. اذكر اسم البند الذي تم تحويله، مثل: '+choices+'.';
    const rows=await sql`
      insert into public.conversation_messages(
        id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
      ) values(
        ${randomUUID()},${String(activation.thread_id)}::uuid,${userId}::uuid,'agent','budget-spending-owner','مسؤول الميزانية والإنفاق','request',
        ${body},${JSON.stringify({salary_distribution_clarification:true,cycle_id:cycleId,pending_instructions:pending,external_execution:false})}::jsonb
      )
      returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
    `;
    return {status:'NEEDS_CLARIFICATION' as const,reply:rows[0]??null,pending};
  }

  const remaining=pending.filter(item=>item.key!==selected.key);
  const next=remaining[0]??null;
  const body=next
    ?`تم تسجيل تنفيذ «${selected.title}» بمبلغ ${new Intl.NumberFormat('ar-SA-u-nu-latn',{maximumFractionDigits:2}).format(selected.amount)} ر.س بناءً على تأكيدك. المتبقي التالي: «${next.title}» بمبلغ ${new Intl.NumberFormat('ar-SA-u-nu-latn',{maximumFractionDigits:2}).format(next.amount)} ر.س.`
    :`تم تسجيل تنفيذ «${selected.title}» بمبلغ ${new Intl.NumberFormat('ar-SA-u-nu-latn',{maximumFractionDigits:2}).format(selected.amount)} ر.س. اكتملت تعليمات التوزيع التي كانت جاهزة للتنفيذ في هذه الدورة.`;

  const rows=await sql`
    insert into public.conversation_messages(
      id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
    ) values(
      ${randomUUID()},${String(activation.thread_id)}::uuid,${userId}::uuid,'agent','budget-spending-owner','مسؤول الميزانية والإنفاق','followup',
      ${body},
      ${JSON.stringify({
        salary_distribution_confirmation:true,
        cycle_id:cycleId,
        activation_message_id:String(activation.id),
        instruction_key:selected.key,
        instruction:selected,
        confirmed_by_user:true,
        confirmed_at:new Date().toISOString(),
        next_instruction:next,
        remaining_instruction_count:remaining.length,
        external_execution:false,
        execution_boundary:'تسجيل تأكيد المستخدم فقط؛ لا تنفيذ تحويل بنكي من نماء',
      })}::jsonb
    )
    returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
  `;
  return {status:remaining.length?'CONFIRMED_NEXT_PENDING' as const:'ALL_CONFIRMED' as const,reply:rows[0]??null,confirmed:selected,next};
}