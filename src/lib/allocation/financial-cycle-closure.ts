import { createHash, randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import { getCurrentFinancialPlanMonitoring } from '@/lib/allocation/financial-plan-monitoring';
import type { ConversationMessageKind } from '@/lib/conversations/store';

export type ResponsibilityCycleAccountabilityStatus=
  | 'WITHIN_APPROVED'
  | 'EXCEEDED_APPROVED'
  | 'UNUSED_ALLOCATION'
  | 'NO_ALLOCATION';

export type ResponsibilityCycleAccountability={
  ownerKey:string;
  ownerName:string;
  requestedAmount:number|null;
  minimumAmount:number|null;
  idealAmount:number|null;
  approvedAmount:number;
  realizedAmount:number;
  varianceAmount:number;
  evidenceCount:number;
  status:ResponsibilityCycleAccountabilityStatus;
  accountabilityNote:string;
};

export type FinancialCycleClosureReport={
  cycleId:string;
  planId:string;
  planVersionId:string;
  planVersionNumber:number;
  allocationProposalId:string|null;
  totalApproved:number;
  totalRealized:number;
  totalVariance:number;
  responsibilities:ResponsibilityCycleAccountability[];
  planRevisionCount:number;
  generatedAt:string;
  fingerprint:string;
  requiresUserClosureApproval:true;
  externalExecution:false;
};

function n(value:unknown){
  const parsed=typeof value==='number'?value:Number(value);
  return Number.isFinite(parsed)&&parsed>=0?parsed:null;
}
function reportFingerprint(value:unknown){
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function buildResponsibilityCycleAccountability(args:{
  approved:Array<{ownerKey:string;ownerName:string;approvedAmount:number;realizedAmount:number;evidenceCount:number}>;
  claims:Array<{ownerKey:string;requestedAmount:number|null;minimumAmount:number|null;idealAmount:number|null}>;
}):ResponsibilityCycleAccountability[]{
  const claims=new Map(args.claims.map(item=>[item.ownerKey,item]));
  return args.approved.map(item=>{
    const claim=claims.get(item.ownerKey);
    const varianceAmount=item.realizedAmount-item.approvedAmount;
    const status:ResponsibilityCycleAccountabilityStatus=item.approvedAmount<=0
      ? 'NO_ALLOCATION'
      : item.realizedAmount===0
        ? 'UNUSED_ALLOCATION'
        : item.realizedAmount>item.approvedAmount
          ? 'EXCEEDED_APPROVED'
          : 'WITHIN_APPROVED';
    const accountabilityNote=status==='EXCEEDED_APPROVED'
      ? 'تجاوز التنفيذ الموثق المخصص المعتمد؛ يحمل هذا للمراجعة في الدورة التالية مع أسباب التجاوز وقرارات المعالجة.'
      : status==='UNUSED_ALLOCATION'
        ? 'لم يظهر تنفيذ موثق على هذا المخصص؛ يجب تفسير ما إذا كان الاحتياج لم يقع أو أن البيانات ناقصة قبل تعديل سياسة الدورة التالية.'
        : status==='WITHIN_APPROVED'
          ? 'التنفيذ الموثق بقي داخل المخصص المعتمد؛ يراجع الفرق المتبقي عند بناء الدورة التالية دون اعتباره أداءً جيدًا أو سيئًا تلقائيًا.'
          : 'لم يعتمد لهذا المجال مخصص موجب في هذه النسخة؛ لا يستنتج أداء مالي من غياب المخصص.';
    return {
      ownerKey:item.ownerKey,
      ownerName:item.ownerName,
      requestedAmount:claim?.requestedAmount??null,
      minimumAmount:claim?.minimumAmount??null,
      idealAmount:claim?.idealAmount??null,
      approvedAmount:item.approvedAmount,
      realizedAmount:item.realizedAmount,
      varianceAmount,
      evidenceCount:item.evidenceCount,
      status,
      accountabilityNote,
    };
  });
}

export function isCycleClosureReviewRequest(text:string){
  return /^(مراجعة إغلاق الدورة|مراجعة اغلاق الدورة|تجهيز إغلاق الدورة|تجهيز اغلاق الدورة)$/i.test(text.trim());
}
export function isExplicitCycleClosureApproval(text:string){
  return /^(اعتماد إغلاق الدورة|اعتماد اغلاق الدورة|أعتمد إغلاق الدورة|اعتمد إغلاق الدورة)$/i.test(text.trim());
}

export async function buildFinancialCycleClosureReport(userId:string):Promise<FinancialCycleClosureReport|null>{
  const monitoring=await getCurrentFinancialPlanMonitoring(userId);
  if(!monitoring) return null;
  const sql=getRawSql();

  const ratificationRows=await sql`
    select structured_data
    from public.conversation_messages
    where user_id=${userId}::uuid
      and structured_data->>'allocation_ratified'='true'
      and structured_data->>'plan_id'=${monitoring.planId}
    order by created_at desc
    limit 1
  `;
  const ratificationData=ratificationRows[0]?.structured_data&&typeof ratificationRows[0].structured_data==='object'
    ? ratificationRows[0].structured_data as Record<string,unknown>
    : {};
  const proposalId=typeof ratificationData.allocation_ratification_proposal_id==='string'
    ? ratificationData.allocation_ratification_proposal_id
    : null;

  const claimRows=proposalId?await sql`
    select structured_data
    from public.conversation_messages
    where user_id=${userId}::uuid
      and structured_data->>'allocation_proposal_id'=${proposalId}
      and structured_data->'allocation_claim' is not null
  `:[];

  const claimByOwner=new Map<string,{ownerKey:string;requestedAmount:number|null;minimumAmount:number|null;idealAmount:number|null}>();
  for(const row of claimRows){
    const data=row.structured_data&&typeof row.structured_data==='object'?row.structured_data as Record<string,unknown>:{};
    const claim=data.allocation_claim&&typeof data.allocation_claim==='object'?data.allocation_claim as Record<string,unknown>:null;
    if(!claim||typeof claim.ownerKey!=='string') continue;
    claimByOwner.set(claim.ownerKey,{
      ownerKey:claim.ownerKey,
      requestedAmount:n(claim.requestedAmount),
      minimumAmount:n(claim.minimumAmount),
      idealAmount:n(claim.idealAmount),
    });
  }

  const responsibilities=buildResponsibilityCycleAccountability({
    approved:monitoring.items.map(item=>({
      ownerKey:item.ownerKey,
      ownerName:item.ownerName,
      approvedAmount:item.plannedAmount,
      realizedAmount:item.realizedAmount,
      evidenceCount:item.evidenceCount,
    })),
    claims:[...claimByOwner.values()],
  });

  const revisionRows=await sql`
    select count(*)::int as count from public.plan_versions
    where user_id=${userId}::uuid and plan_id=${monitoring.planId}::uuid
  `;
  const stable={
    cycleId:monitoring.cycleId,
    planId:monitoring.planId,
    planVersionId:monitoring.planVersionId,
    planVersionNumber:monitoring.versionNumber,
    allocationProposalId:proposalId,
    totalApproved:responsibilities.reduce((sum,item)=>sum+item.approvedAmount,0),
    totalRealized:responsibilities.reduce((sum,item)=>sum+item.realizedAmount,0),
    responsibilities:responsibilities.map(item=>({
      ownerKey:item.ownerKey,
      requestedAmount:item.requestedAmount,
      minimumAmount:item.minimumAmount,
      idealAmount:item.idealAmount,
      approvedAmount:item.approvedAmount,
      realizedAmount:item.realizedAmount,
      evidenceCount:item.evidenceCount,
      status:item.status,
    })),
    planRevisionCount:Number(revisionRows[0]?.count??0),
  };
  return {
    ...stable,
    responsibilities,
    totalVariance:stable.totalRealized-stable.totalApproved,
    generatedAt:new Date().toISOString(),
    fingerprint:reportFingerprint(stable),
    requiresUserClosureApproval:true,
    externalExecution:false,
  };
}

async function councilThread(userId:string){
  const sql=getRawSql();
  const rows=await sql`select id from public.conversation_threads where user_id=${userId}::uuid and room_key='council' limit 1`;
  return rows[0]?.id?String(rows[0].id):null;
}

export async function createFinancialCycleClosureReview(userId:string){
  const report=await buildFinancialCycleClosureReport(userId);
  if(!report) return null;
  const threadId=await councilThread(userId);
  if(!threadId) return null;
  const sql=getRawSql();

  const prior=await sql`
    select id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
    from public.conversation_messages
    where user_id=${userId}::uuid and thread_id=${threadId}::uuid
      and structured_data->>'cycle_closure_review'='true'
      and structured_data->>'cycle_closure_fingerprint'=${report.fingerprint}
    order by created_at desc limit 1
  `;
  if(prior[0]) return prior[0];

  const exceeded=report.responsibilities.filter(item=>item.status==='EXCEEDED_APPROVED');
  const unused=report.responsibilities.filter(item=>item.status==='UNUSED_ALLOCATION');
  const body=`مراجعة إغلاق الدورة جاهزة. الخطة الحالية إصدار ${report.planVersionNumber}، بإجمالي معتمد ${new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(report.totalApproved)} ر.س، وتنفيذ موثق ${new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(report.totalRealized)} ر.س. التجاوزات المثبتة: ${exceeded.length}، والمخصصات بلا تنفيذ موثق: ${unused.length}. لم أغلق الدورة بعد؛ راجع التقرير ثم اكتب «اعتماد إغلاق الدورة» إذا أردت الإغلاق.`;

  const rows=await sql`
    insert into public.conversation_messages(
      id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
    ) values(
      ${randomUUID()},${threadId}::uuid,${userId}::uuid,'agent','central-secretary','أمين السر المركزي','followup',
      ${body},
      ${JSON.stringify({
        cycle_closure_review:true,
        cycle_closure_fingerprint:report.fingerprint,
        cycle_closure_report:report,
        cycle_id:report.cycleId,
        plan_id:report.planId,
        plan_version_id:report.planVersionId,
        requires_user_closure_approval:true,
        cycle_closed:false,
        external_execution:false,
        execution_boundary:'مراجعة ومحاسبة داخلية فقط؛ لا إغلاق ولا تنفيذ مالي دون اعتماد صريح',
      })}::jsonb
    )
    returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
  `;
  await sql`update public.financial_cycles set closing_started_at=coalesce(closing_started_at,now()),updated_at=now() where id=${report.cycleId}::uuid and user_id=${userId}::uuid and status<>'CLOSED'`;
  return rows[0]??null;
}

export async function closeFinancialCycleAfterApproval(userId:string){
  const report=await buildFinancialCycleClosureReport(userId);
  if(!report) return null;
  const threadId=await councilThread(userId);
  if(!threadId) return null;
  const sql=getRawSql();

  const review=await sql`
    select id from public.conversation_messages
    where user_id=${userId}::uuid and thread_id=${threadId}::uuid
      and structured_data->>'cycle_closure_review'='true'
      and structured_data->>'cycle_closure_fingerprint'=${report.fingerprint}
    order by created_at desc limit 1
  `;
  if(!review[0]?.id) throw new Error('CYCLE_CLOSURE_REVIEW_REQUIRED');

  const existing=await sql`
    select id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
    from public.conversation_messages
    where user_id=${userId}::uuid and thread_id=${threadId}::uuid
      and structured_data->>'cycle_closure_approved'='true'
      and structured_data->>'cycle_closure_fingerprint'=${report.fingerprint}
    order by created_at desc limit 1
  `;
  if(existing[0]) return existing[0];

  await sql.transaction([
    sql`update public.financial_cycles set status='CLOSED',closed_at=now(),closing_started_at=coalesce(closing_started_at,now()),updated_at=now() where id=${report.cycleId}::uuid and user_id=${userId}::uuid`,
    sql`update public.financial_plans set status='CLOSED',closed_at=now(),updated_at=now() where id=${report.planId}::uuid and user_id=${userId}::uuid`,
  ]);

  const exceeded=report.responsibilities.filter(item=>item.status==='EXCEEDED_APPROVED').map(item=>item.ownerName);
  const body=`تم اعتماد إغلاق الدورة وحفظ تقرير المحاسبة للإصدار ${report.planVersionNumber}. تم إغلاق الخطة والدورة داخليًا، مع إبقاء سجل الطلبات والمخصصات والتنفيذ والانحرافات للرجوع إليه في الدورة التالية. لا توجد أي حركة مالية خارجية ناتجة عن الإغلاق.`;
  const rows=await sql`
    insert into public.conversation_messages(
      id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
    ) values(
      ${randomUUID()},${threadId}::uuid,${userId}::uuid,'agent','central-secretary','أمين السر المركزي','decision',
      ${body},
      ${JSON.stringify({
        cycle_closure_approved:true,
        cycle_closure_fingerprint:report.fingerprint,
        cycle_closure_report:report,
        accountability_carry_forward:{
          exceeded_owners:exceeded,
          responsibility_results:report.responsibilities,
          use_in_next_cycle:true,
          no_automatic_score:true,
        },
        cycle_id:report.cycleId,
        plan_id:report.planId,
        plan_version_id:report.planVersionId,
        cycle_closed:true,
        external_execution:false,
        execution_boundary:'إغلاق داخلي للدورة والخطة فقط؛ لا تنفيذ مالي خارجي',
      })}::jsonb
    )
    returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
  `;
  return rows[0]??null;
}
