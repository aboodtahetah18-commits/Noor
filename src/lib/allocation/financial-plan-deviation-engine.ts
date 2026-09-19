import { randomUUID, createHash } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import { getCurrentFinancialPlanMonitoring, type FinancialPlanMonitoringSnapshot } from '@/lib/allocation/financial-plan-monitoring';
import type { ConversationMessageKind } from '@/lib/conversations/store';

export type DeviationOption =
  | {kind:'KEEP_PLAN';label:string;requiresRatification:true;changesPlan:false}
  | {kind:'OPEN_REPLAN';label:string;requiresRatification:true;changesPlan:true}
  | {kind:'TRANSFER_PROPOSAL';label:string;fromOwnerKey:string;fromOwnerName:string;toOwnerKey:string;toOwnerName:string;amount:number;requiresRatification:true;changesPlan:true};

export type FinancialPlanDeviationCase={
  caseId:string;
  planId:string;
  planVersionId:string;
  cycleId:string;
  monitoringFingerprint:string;
  exceeded:Array<{ownerKey:string;ownerName:string;plannedAmount:number;realizedAmount:number;overrun:number}>;
  availableDonors:Array<{ownerKey:string;ownerName:string;remainingAmount:number}>;
  options:DeviationOption[];
  unresolvedAmount:number;
  status:'OPTIONS_READY'|'NO_SAFE_TRANSFER'|'NO_DEVIATION';
  autoPlanChange:false;
  autoExecution:false;
};

const FLEXIBLE_DONOR_ORDER=['investment-owner','goals-owner','budget-spending-owner'] as const;

function caseFingerprint(value:unknown){
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,24);
}

export function buildFinancialPlanDeviationCase(snapshot:FinancialPlanMonitoringSnapshot):FinancialPlanDeviationCase{
  const exceeded=snapshot.items
    .filter(item=>item.status==='EXCEEDED'&&item.varianceAmount>0)
    .map(item=>({
      ownerKey:item.ownerKey,
      ownerName:item.ownerName,
      plannedAmount:item.plannedAmount,
      realizedAmount:item.realizedAmount,
      overrun:item.varianceAmount,
    }));
  const totalOverrun=exceeded.reduce((sum,item)=>sum+item.overrun,0);
  const exceededKeys=new Set(exceeded.map(item=>item.ownerKey));
  const donors=FLEXIBLE_DONOR_ORDER.flatMap(ownerKey=>{
    const item=snapshot.items.find(row=>row.ownerKey===ownerKey);
    if(!item||exceededKeys.has(ownerKey)||item.remainingAmount<=0) return [];
    return [{ownerKey:item.ownerKey,ownerName:item.ownerName,remainingAmount:item.remainingAmount}];
  });

  const options:DeviationOption[]=[
    {kind:'KEEP_PLAN',label:'الإبقاء على الخطة وتسجيل التجاوز دون إعادة توزيع الآن',requiresRatification:true,changesPlan:false},
    {kind:'OPEN_REPLAN',label:'فتح جولة تعديل للخطة ومطالبة المسؤولين بإعادة الدفاع عن مخصصاتهم',requiresRatification:true,changesPlan:true},
  ];
  let remaining=totalOverrun;
  for(const donor of donors){
    if(remaining<=0) break;
    const amount=Math.min(remaining,donor.remainingAmount);
    if(amount<=0) continue;
    const target=exceeded.find(item=>item.overrun>0);
    if(!target) break;
    options.push({
      kind:'TRANSFER_PROPOSAL',
      label:`اقتراح نقل ${amount} من ${donor.ownerName} إلى ${target.ownerName}`,
      fromOwnerKey:donor.ownerKey,
      fromOwnerName:donor.ownerName,
      toOwnerKey:target.ownerKey,
      toOwnerName:target.ownerName,
      amount,
      requiresRatification:true,
      changesPlan:true,
    });
    remaining=Math.max(0,remaining-amount);
  }

  const stable={planVersionId:snapshot.planVersionId,monitoringFingerprint:snapshot.fingerprint,exceeded,donors};
  return {
    caseId:`DEV-${caseFingerprint(stable)}`,
    planId:snapshot.planId,
    planVersionId:snapshot.planVersionId,
    cycleId:snapshot.cycleId,
    monitoringFingerprint:snapshot.fingerprint,
    exceeded,
    availableDonors:donors,
    options,
    unresolvedAmount:remaining,
    status:exceeded.length===0?'NO_DEVIATION':remaining>0?'NO_SAFE_TRANSFER':'OPTIONS_READY',
    autoPlanChange:false,
    autoExecution:false,
  };
}

export function isDeviationReviewRequest(text:string){
  const value=text.trim();
  return /^(معالجة الانحراف|حل الانحراف|حل التجاوز|تحليل الانحراف|مراجعة التجاوز)$/i.test(value);
}

export async function createFinancialPlanDeviationReplies(userId:string){
  const snapshot=await getCurrentFinancialPlanMonitoring(userId);
  if(!snapshot) return [];
  const deviation=buildFinancialPlanDeviationCase(snapshot);
  if(deviation.status==='NO_DEVIATION') return [];

  const sql=getRawSql();
  const threadRows=await sql`
    select id from public.conversation_threads
    where user_id=${userId}::uuid and room_key='council' limit 1
  `;
  const threadId=threadRows[0]?.id?String(threadRows[0].id):null;
  if(!threadId) return [];

  const existing=await sql`
    select id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
    from public.conversation_messages
    where user_id=${userId}::uuid and thread_id=${threadId}::uuid
      and structured_data->>'deviation_case_id'=${deviation.caseId}
      and structured_data->>'deviation_summary'='true'
    order by created_at desc limit 1
  `;
  if(existing[0]) return existing.map(row=>({
    ...row,
    id:String(row.id),
    sender_type:'agent' as const,
    sender_key:String(row.sender_key),
    sender_name:String(row.sender_name),
    message_kind:String(row.message_kind) as ConversationMessageKind,
    body:String(row.body),
    structured_data:row.structured_data as Record<string,unknown>,
  }));

  const views:Array<{key:string;name:string;kind:ConversationMessageKind;body:string;role:string}>=[];
  for(const item of deviation.exceeded){
    views.push({
      key:item.ownerKey,
      name:item.ownerName,
      kind:'risk',
      body:`لدي تجاوز مثبت بمقدار ${new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(item.overrun)} ر.س: المخطط ${new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(item.plannedAmount)} ر.س والمنفذ الموثق ${new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(item.realizedAmount)} ر.س. أطلب معالجة السبب، لكنني لا أطلب تعديل الخطة تلقائيًا.`,
      role:'صاحب المسؤولية المتجاوزة',
    });
  }
  for(const donor of deviation.availableDonors){
    views.push({
      key:donor.ownerKey,
      name:donor.ownerName,
      kind:'recommendation',
      body:`يتبقى لدي ${new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(donor.remainingAmount)} ر.س من المخصص الحالي. يمكن مناقشة جزء منه كخيار لإعادة التوزيع، لكن لا أتنازل عنه تلقائيًا ولا قبل تقييم أثر النقل على مجالي.`,
      role:'صاحب مسؤولية محتمل التأثر',
    });
  }

  const transferOptions=deviation.options.filter((option):option is Extract<DeviationOption,{kind:'TRANSFER_PROPOSAL'}>=>option.kind==='TRANSFER_PROPOSAL');
  views.push({
    key:'central-secretary',
    name:'أمين السر المركزي',
    kind:'followup',
    body:transferOptions.length
      ? `فتحت حالة الانحراف ${deviation.caseId}. الخيارات الحالية: الإبقاء على الخطة، فتح إعادة تفاوض، أو مناقشة ${transferOptions.length} مقترح نقل مبني فقط على المخصصات المتبقية. أي نقل يظل مشروع تعديل ولا يصبح نافذًا قبل اعتمادك وإصدار نسخة جديدة من الخطة.`
      : `فتحت حالة الانحراف ${deviation.caseId}. لا يوجد حاليًا مصدر مرن واضح يكفي لتغطية التجاوز دون المساس بمجالات محمية؛ المتبقي غير المحلول ${new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(deviation.unresolvedAmount)} ر.س. الخيارات الآمنة الآن هي إبقاء الخطة مع تسجيل الانحراف أو فتح إعادة تفاوض كاملة.`,
    role:'محضر معالجة الانحراف',
  });

  const replies=[];
  for(const view of views){
    const structured={
      plan_deviation:true,
      deviation_case_id:deviation.caseId,
      deviation_summary:view.key==='central-secretary',
      deviation_case:deviation,
      plan_id:deviation.planId,
      plan_version_id:deviation.planVersionId,
      cycle_id:deviation.cycleId,
      requires_user_ratification:true,
      plan_change_applied:false,
      external_execution:false,
      execution_boundary:'اقتراحات معالجة فقط؛ لا تعديل للخطة ولا حركة مالية دون اعتماد المستخدم',
      speaker_role:view.role,
    };
    const rows=await sql`
      insert into public.conversation_messages(
        id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
      ) values(
        ${randomUUID()},${threadId}::uuid,${userId}::uuid,'agent',${view.key},${view.name},${view.kind},${view.body},${JSON.stringify(structured)}::jsonb
      )
      returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
    `;
    if(rows[0]) replies.push({
      ...rows[0],id:String(rows[0].id),sender_type:'agent' as const,
      sender_key:String(rows[0].sender_key),sender_name:String(rows[0].sender_name),
      message_kind:String(rows[0].message_kind) as ConversationMessageKind,
      body:String(rows[0].body),structured_data:rows[0].structured_data as Record<string,unknown>,
    });
  }
  await sql`update public.conversation_threads set updated_at=now() where id=${threadId}::uuid`;
  return replies;
}
