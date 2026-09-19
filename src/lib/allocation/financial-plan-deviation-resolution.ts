import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import type { ConversationMessageKind } from '@/lib/conversations/store';
import type { DeviationOption, FinancialPlanDeviationCase } from '@/lib/allocation/financial-plan-deviation-engine';

export type DeviationResolutionCommand=
  | {kind:'KEEP_PLAN'}
  | {kind:'OPEN_REPLAN'}
  | {kind:'SELECT_OPTION';optionNumber:number};

export type DeviationResolutionReply={
  id:string;
  sender_type:'agent';
  sender_key:string;
  sender_name:string;
  message_kind:ConversationMessageKind;
  body:string;
  structured_data:Record<string,unknown>;
  created_at?:string;
};

const FLEXIBLE_DONORS=new Set(['investment-owner','goals-owner','budget-spending-owner']);

export function parseDeviationResolutionCommand(text:string):DeviationResolutionCommand|null{
  const normalized=text.trim().replace(/\s+/g,' ');
  if(/^(اعتماد إبقاء الخطة|ابقاء الخطة|إبقاء الخطة|اعتمد إبقاء الخطة)$/i.test(normalized)) return {kind:'KEEP_PLAN'};
  if(/^(فتح إعادة تفاوض|اعادة تفاوض|إعادة تفاوض|افتح إعادة تفاوض)$/i.test(normalized)) return {kind:'OPEN_REPLAN'};
  const match=normalized.match(/^(?:اعتماد|اعتمد|أعتمد) الخيار\s*(\d+)$/i);
  if(match) return {kind:'SELECT_OPTION',optionNumber:Number(match[1])};
  return null;
}

function asDeviationCase(value:unknown):FinancialPlanDeviationCase|null{
  if(!value||typeof value!=='object'||Array.isArray(value)) return null;
  const row=value as Record<string,unknown>;
  if(typeof row.caseId!=='string'||typeof row.planId!=='string'||typeof row.planVersionId!=='string'||typeof row.cycleId!=='string'||!Array.isArray(row.options)) return null;
  return row as unknown as FinancialPlanDeviationCase;
}

async function loadLatestDeviationCase(userId:string){
  const sql=getRawSql();
  const rows=await sql`
    select m.id,m.thread_id,m.structured_data
    from public.conversation_messages m
    join public.conversation_threads t on t.id=m.thread_id
    where m.user_id=${userId}::uuid and t.user_id=${userId}::uuid and t.room_key='council'
      and m.sender_key='central-secretary'
      and m.structured_data->>'deviation_summary'='true'
    order by m.created_at desc
    limit 1
  `;
  const row=rows[0];
  if(!row) return null;
  const data=row.structured_data&&typeof row.structured_data==='object'?row.structured_data as Record<string,unknown>:{};
  const deviation=asDeviationCase(data.deviation_case);
  return deviation?{messageId:String(row.id),threadId:String(row.thread_id),deviation}:null;
}

async function createDecisionReply(args:{
  userId:string;threadId:string;caseId:string;body:string;resolution:Record<string,unknown>;
}):Promise<DeviationResolutionReply|null>{
  const sql=getRawSql();
  const rows=await sql`
    insert into public.conversation_messages(
      id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
    ) values(
      ${randomUUID()},${args.threadId}::uuid,${args.userId}::uuid,'agent','central-secretary','أمين السر المركزي','decision',
      ${args.body},
      ${JSON.stringify({
        deviation_resolution:true,
        deviation_case_id:args.caseId,
        resolution:args.resolution,
        external_execution:false,
        execution_boundary:'قرار تعديل داخلي للخطة فقط؛ لا ينتج عنه أي تحويل أو دفع أو استثمار خارجي',
      })}::jsonb
    )
    returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
  `;
  const row=rows[0];
  if(!row) return null;
  return {
    ...row,id:String(row.id),sender_type:'agent',sender_key:String(row.sender_key),sender_name:String(row.sender_name),
    message_kind:String(row.message_kind) as ConversationMessageKind,body:String(row.body),
    structured_data:row.structured_data as Record<string,unknown>,
  };
}

async function materializeTransferRevision(args:{
  userId:string;deviation:FinancialPlanDeviationCase;option:Extract<DeviationOption,{kind:'TRANSFER_PROPOSAL'}>;optionNumber:number;
}){
  const sql=getRawSql();
  if(!FLEXIBLE_DONORS.has(args.option.fromOwnerKey)) throw new Error('DEVIATION_PROTECTED_DONOR_BLOCKED');
  if(args.option.amount<=0) throw new Error('DEVIATION_TRANSFER_INVALID');

  const current=await sql`
    select fp.id as plan_id,fp.current_version_id,pv.version_number
    from public.financial_plans fp
    join public.plan_versions pv on pv.id=fp.current_version_id and pv.user_id=fp.user_id
    where fp.id=${args.deviation.planId}::uuid and fp.user_id=${args.userId}::uuid
      and fp.cycle_id=${args.deviation.cycleId}::uuid
    limit 1
  `;
  const row=current[0];
  if(!row?.plan_id||String(row.current_version_id)!==args.deviation.planVersionId){
    throw new Error('DEVIATION_PLAN_VERSION_STALE');
  }

  const revisionReason=`deviation-resolution:${args.deviation.caseId}:option-${args.optionNumber}`;
  const existing=await sql`
    select id,version_number from public.plan_versions
    where user_id=${args.userId}::uuid and plan_id=${args.deviation.planId}::uuid and revision_reason=${revisionReason}
    limit 1
  `;
  if(existing[0]) return {status:'ALREADY_APPLIED' as const,versionId:String(existing[0].id),versionNumber:Number(existing[0].version_number)};

  const allocations=await sql`
    select ba.category_id,ba.planned_amount::text,ba.allocation_type
    from public.budget_allocations ba
    where ba.user_id=${args.userId}::uuid and ba.plan_version_id=${args.deviation.planVersionId}::uuid
    order by ba.created_at asc
  `;
  const donor=allocations.find(item=>String(item.allocation_type)===args.option.fromOwnerKey);
  const target=allocations.find(item=>String(item.allocation_type)===args.option.toOwnerKey);
  if(!donor||!target) throw new Error('DEVIATION_ALLOCATION_NOT_FOUND');

  const donorAmount=Number(donor.planned_amount);
  const targetAmount=Number(target.planned_amount);
  if(!Number.isFinite(donorAmount)||donorAmount<args.option.amount) throw new Error('DEVIATION_DONOR_INSUFFICIENT');
  if(!Number.isFinite(targetAmount)) throw new Error('DEVIATION_TARGET_INVALID');

  const nextVersionNumber=Number(row.version_number)+1;
  const nextVersionId=randomUUID();
  await sql`update public.plan_versions set is_current=false where user_id=${args.userId}::uuid and plan_id=${args.deviation.planId}::uuid and is_current=true`;
  await sql`
    insert into public.plan_versions(id,user_id,plan_id,version_number,revision_reason,is_current,approved_at)
    values(
      ${nextVersionId}::uuid,${args.userId}::uuid,${args.deviation.planId}::uuid,${nextVersionNumber},${revisionReason},true,now()
    )
  `;

  for(const allocation of allocations){
    const ownerKey=String(allocation.allocation_type);
    let planned=Number(allocation.planned_amount);
    if(ownerKey===args.option.fromOwnerKey) planned-=args.option.amount;
    if(ownerKey===args.option.toOwnerKey) planned+=args.option.amount;
    await sql`
      insert into public.budget_allocations(
        id,user_id,plan_version_id,category_id,planned_amount,allocation_type
      ) values(
        ${randomUUID()}::uuid,${args.userId}::uuid,${nextVersionId}::uuid,${String(allocation.category_id)}::uuid,${planned},${ownerKey}
      )
    `;
  }

  await sql`
    update public.financial_plans
    set current_version_id=${nextVersionId}::uuid,status='APPROVED',approved_at=now(),updated_at=now()
    where id=${args.deviation.planId}::uuid and user_id=${args.userId}::uuid
  `;
  return {status:'APPLIED' as const,versionId:nextVersionId,versionNumber:nextVersionNumber};
}

export async function resolveLatestDeviationCase(userId:string,command:DeviationResolutionCommand):Promise<DeviationResolutionReply|null>{
  const loaded=await loadLatestDeviationCase(userId);
  if(!loaded) return null;
  const {threadId,deviation}=loaded;
  const sql=getRawSql();

  const prior=await sql`
    select id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
    from public.conversation_messages
    where user_id=${userId}::uuid and thread_id=${threadId}::uuid
      and structured_data->>'deviation_resolution'='true'
      and structured_data->>'deviation_case_id'=${deviation.caseId}
    order by created_at desc limit 1
  `;
  if(prior[0]){
    const row=prior[0];
    return {
      ...row,id:String(row.id),sender_type:'agent',sender_key:String(row.sender_key),sender_name:String(row.sender_name),
      message_kind:String(row.message_kind) as ConversationMessageKind,body:String(row.body),
      structured_data:row.structured_data as Record<string,unknown>,
    };
  }

  if(command.kind==='KEEP_PLAN'){
    return createDecisionReply({
      userId,threadId,caseId:deviation.caseId,
      body:'تم اعتماد الإبقاء على الخطة الحالية مع تسجيل الانحراف كما هو. لم تتغير أي مخصصات، وسيستمر النظام في المتابعة على نفس إصدار الخطة.',
      resolution:{kind:'KEEP_PLAN',plan_change_applied:false,plan_version_id:deviation.planVersionId,requires_followup:true},
    });
  }

  if(command.kind==='OPEN_REPLAN'){
    return createDecisionReply({
      userId,threadId,caseId:deviation.caseId,
      body:'تم اعتماد فتح إعادة تفاوض على الخطة. لم أغيّر أي مخصص الآن؛ ستبدأ جولة جديدة بين أصحاب المسؤوليات قبل إنشاء أي إصدار بديل.',
      resolution:{kind:'OPEN_REPLAN',plan_change_applied:false,replan_required:true,source_plan_version_id:deviation.planVersionId},
    });
  }

  const option=deviation.options[command.optionNumber-1];
  if(!option) throw new Error('DEVIATION_OPTION_NOT_FOUND');
  if(option.kind==='KEEP_PLAN'){
    return resolveLatestDeviationCase(userId,{kind:'KEEP_PLAN'});
  }
  if(option.kind==='OPEN_REPLAN'){
    return resolveLatestDeviationCase(userId,{kind:'OPEN_REPLAN'});
  }

  const applied=await materializeTransferRevision({userId,deviation,option,optionNumber:command.optionNumber});
  return createDecisionReply({
    userId,threadId,caseId:deviation.caseId,
    body:`تم اعتماد خيار النقل رقم ${command.optionNumber}: نقل ${new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(option.amount)} ر.س من ${option.fromOwnerName} إلى ${option.toOwnerName}. أنشأت إصدارًا جديدًا من الخطة رقم ${applied.versionNumber} مع الاحتفاظ بالإصدار السابق كسجل تاريخي. لا توجد أي حركة مالية خارجية ناتجة عن هذا التعديل.`,
    resolution:{
      kind:'TRANSFER_PROPOSAL',
      option_number:command.optionNumber,
      plan_change_applied:true,
      previous_plan_version_id:deviation.planVersionId,
      new_plan_version_id:applied.versionId,
      new_plan_version_number:applied.versionNumber,
      from_owner_key:option.fromOwnerKey,
      to_owner_key:option.toOwnerKey,
      amount:option.amount,
      external_execution:false,
    },
  });
}
