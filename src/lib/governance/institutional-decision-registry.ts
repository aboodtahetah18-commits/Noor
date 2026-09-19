import { createHash, randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import type { ConversationMessageKind, ConversationRoomKey } from '@/lib/conversations/store';

export type InstitutionalDecisionType='ALLOCATION'|'PLAN_DEVIATION'|'CYCLE_CLOSURE';
export type InstitutionalDecisionStatus='APPROVED'|'FOLLOWUP_PENDING'|'CLOSED';

export type InstitutionalDecisionFollowup={
  followupId:string;
  title:string;
  status:string;
  assignedTo:string|null;
  completed:boolean;
  note?:string|null;
  updatedAt?:string|null;
  dueDate?:string|null;
  reminderLeadDays?:number|null;
};

export type InstitutionalDecisionRecord={
  registryId:string;
  decisionType:InstitutionalDecisionType;
  sourceMessageId:string;
  sourceDecisionId:string|null;
  decidedAt:string;
  status:InstitutionalDecisionStatus;
  title:string;
  rationale:string|null;
  cycleId:string|null;
  planId:string|null;
  planVersionId:string|null;
  previousPlanVersionId:string|null;
  followups:InstitutionalDecisionFollowup[];
  metadata:Record<string,unknown>;
  externalExecution:false;
};

export type InstitutionalDecisionRegistrySnapshot={
  generatedAt:string;
  total:number;
  openFollowupCount:number;
  decisions:InstitutionalDecisionRecord[];
  sourceOfTruth:'APPEND_ONLY_DECISION_MESSAGES';
  externalExecution:false;
};

function record(value:unknown):Record<string,unknown>|null{
  return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
}
function stableId(value:unknown){
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,20);
}
function text(value:unknown){
  return typeof value==='string'&&value.trim()?value.trim():null;
}
function followupsFrom(value:unknown,registrySeed='decision'):InstitutionalDecisionFollowup[]{
  if(!Array.isArray(value)) return [];
  return value.flatMap((item,index)=>{
    const row=record(item);
    if(!row) return [];
    const status=String(row.status??'OPEN');
    const title=String(row.title??'متابعة');
    return [{
      followupId:`FUP-${stableId({registrySeed,index,title})}`,
      title,
      status,
      assignedTo:text(row.assignedTo??row.assigned_to),
      completed:status==='RESOLVED'||status==='CLOSED'||row.completed===true,
    }];
  });
}

export function normalizeInstitutionalDecisionMessage(args:{
  id:string;
  createdAt:string;
  structuredData:Record<string,unknown>;
}):InstitutionalDecisionRecord|null{
  const data=args.structuredData;

  if(data.allocation_decision_minutes===true){
    const minutes=record(data.decision_minutes)??{};
    const decisionId=text(data.allocation_decision_id??minutes.decisionId);
    const followups=followupsFrom(data.followups??minutes.followups,decisionId??args.id);
    const pending=followups.some(item=>!item.completed);
    return {
      registryId:`REG-${stableId({type:'ALLOCATION',id:decisionId??args.id})}`,
      decisionType:'ALLOCATION',
      sourceMessageId:args.id,
      sourceDecisionId:decisionId,
      decidedAt:text(data.ratified_at??minutes.ratifiedAt)??args.createdAt,
      status:pending?'FOLLOWUP_PENDING':'APPROVED',
      title:'اعتماد توزيع الدورة',
      rationale:'اعتماد مشروع التوزيع النهائي بعد حسم البنود المانعة واستكمال مسار المصادقة.',
      cycleId:text(data.cycle_id??minutes.cycleId),
      planId:text(data.plan_id??minutes.planId),
      planVersionId:text(data.plan_version_id??minutes.planVersionId),
      previousPlanVersionId:null,
      followups,
      metadata:{
        proposal_id:text(data.allocation_decision_proposal_id??minutes.proposalId),
        participants:Array.isArray(data.participants)?data.participants:[],
        reservations:Array.isArray(data.reservations)?data.reservations:[],
        resolved_agenda_items:Array.isArray(data.resolved_agenda_items)?data.resolved_agenda_items:[],
      },
      externalExecution:false,
    };
  }

  if(data.deviation_resolution===true){
    const resolution=record(data.resolution)??{};
    const kind=text(resolution.kind)??'UNKNOWN';
    const followups:InstitutionalDecisionFollowup[]=[];
    if(kind==='OPEN_REPLAN'){
      followups.push({followupId:`FUP-${stableId({seed:data.deviation_case_id??args.id,title:'إعادة تفاوض على الخطة'})}`,title:'إعادة تفاوض على الخطة',status:'OPEN',assignedTo:null,completed:false});
    }else if(kind==='KEEP_PLAN'&&resolution.requires_followup===true){
      followups.push({followupId:`FUP-${stableId({seed:data.deviation_case_id??args.id,title:'متابعة الانحراف مع الإبقاء على الخطة'})}`,title:'متابعة الانحراف مع الإبقاء على الخطة',status:'OPEN',assignedTo:null,completed:false});
    }
    return {
      registryId:`REG-${stableId({type:'PLAN_DEVIATION',id:data.deviation_case_id??args.id})}`,
      decisionType:'PLAN_DEVIATION',
      sourceMessageId:args.id,
      sourceDecisionId:text(data.deviation_case_id),
      decidedAt:args.createdAt,
      status:followups.length?'FOLLOWUP_PENDING':'APPROVED',
      title:kind==='TRANSFER_PROPOSAL'?'اعتماد تعديل خطة لمعالجة انحراف':kind==='KEEP_PLAN'?'اعتماد الإبقاء على الخطة بعد الانحراف':'فتح إعادة تفاوض لمعالجة انحراف',
      rationale:'قرار معالجة انحراف مبني على حالة الخطة وقت المراجعة دون تنفيذ مالي خارجي.',
      cycleId:text(resolution.cycle_id??data.cycle_id),
      planId:text(resolution.plan_id??data.plan_id),
      planVersionId:text(resolution.new_plan_version_id??resolution.plan_version_id??data.plan_version_id),
      previousPlanVersionId:text(resolution.previous_plan_version_id??resolution.source_plan_version_id),
      followups,
      metadata:{resolution},
      externalExecution:false,
    };
  }

  if(data.cycle_closure_approved===true){
    const report=record(data.cycle_closure_report)??{};
    return {
      registryId:`REG-${stableId({type:'CYCLE_CLOSURE',cycle:data.cycle_id??report.cycleId??args.id})}`,
      decisionType:'CYCLE_CLOSURE',
      sourceMessageId:args.id,
      sourceDecisionId:text(data.cycle_closure_fingerprint),
      decidedAt:args.createdAt,
      status:'CLOSED',
      title:'اعتماد إغلاق الدورة المالية',
      rationale:'إغلاق الدورة والخطة بعد مراجعة المحاسبة وترحيل نتائج المسؤوليات للدورة التالية.',
      cycleId:text(data.cycle_id??report.cycleId),
      planId:text(data.plan_id??report.planId),
      planVersionId:text(data.plan_version_id??report.planVersionId),
      previousPlanVersionId:null,
      followups:[],
      metadata:{
        accountability_carry_forward:record(data.accountability_carry_forward),
        plan_revision_count:report.planRevisionCount??null,
      },
      externalExecution:false,
    };
  }

  return null;
}

export async function getInstitutionalDecisionRegistry(userId:string):Promise<InstitutionalDecisionRegistrySnapshot>{
  const sql=getRawSql();
  const rows=await sql`
    select id,created_at,structured_data
    from public.conversation_messages
    where user_id=${userId}::uuid
      and (
        structured_data->>'allocation_decision_minutes'='true'
        or structured_data->>'deviation_resolution'='true'
        or structured_data->>'cycle_closure_approved'='true'
      )
    order by created_at desc
  `;
  const decisions=rows.flatMap(row=>{
    const data=record(row.structured_data);
    if(!data) return [];
    const normalized=normalizeInstitutionalDecisionMessage({
      id:String(row.id),createdAt:String(row.created_at),structuredData:data,
    });
    return normalized?[normalized]:[];
  });
  const deadlineEvents=await sql`
    select structured_data,created_at
    from public.conversation_messages
    where user_id=${userId}::uuid
      and structured_data->>'institutional_decision_followup_deadline_event'='true'
    order by created_at asc
  `;
  const deadlineMap=new Map<string,{dueDate:string|null;reminderLeadDays:number|null;updatedAt:string}>();
  for(const event of deadlineEvents){
    const data=record(event.structured_data);
    const registryId=text(data?.registry_id);
    const followupId=text(data?.followup_id);
    if(!registryId||!followupId) continue;
    const key=`${registryId}:${followupId}`;
    const previous=deadlineMap.get(key);
    const dueDate=data?.followup_due_date===null?null:text(data?.followup_due_date)??previous?.dueDate??null;
    const leadRaw=data?.followup_reminder_lead_days;
    const reminderLeadDays=leadRaw===null?null:Number.isFinite(Number(leadRaw))?Number(leadRaw):previous?.reminderLeadDays??null;
    deadlineMap.set(key,{dueDate,reminderLeadDays,updatedAt:String(event.created_at??'')});
  }

  const followupEvents=await sql`
    select structured_data,created_at
    from public.conversation_messages
    where user_id=${userId}::uuid
      and structured_data->>'institutional_decision_followup_event'='true'
    order by created_at asc
  `;
  const eventMap=new Map<string,{status:string;assignedTo:string|null;note:string|null;updatedAt:string}>();
  for(const event of followupEvents){
    const data=record(event.structured_data);
    const registryId=text(data?.registry_id);
    const followupId=text(data?.followup_id);
    if(!registryId||!followupId) continue;
    const key=`${registryId}:${followupId}`;
    const previous=eventMap.get(key);
    eventMap.set(key,{
      status:text(data?.followup_status)??previous?.status??'OPEN',
      assignedTo:text(data?.followup_assigned_to)??previous?.assignedTo??null,
      note:text(data?.followup_note)??previous?.note??null,
      updatedAt:String(event.created_at??''),
    });
  }
  for(const decision of decisions){
    for(const followup of decision.followups){
      const event=eventMap.get(`${decision.registryId}:${followup.followupId}`);
      if(!event) continue;
      followup.status=event.status;
      followup.assignedTo=event.assignedTo;
      followup.note=event.note;
      followup.updatedAt=event.updatedAt;
      followup.completed=event.status==='COMPLETED';
    }
    for(const followup of decision.followups){
      const deadline=deadlineMap.get(`${decision.registryId}:${followup.followupId}`);
      if(!deadline) continue;
      followup.dueDate=deadline.dueDate;
      followup.reminderLeadDays=deadline.reminderLeadDays;
      followup.updatedAt=deadline.updatedAt;
    }
    if(decision.status!=='CLOSED'){
      decision.status=decision.followups.some(item=>!item.completed)?'FOLLOWUP_PENDING':'APPROVED';
    }
  }
  return {
    generatedAt:new Date().toISOString(),
    total:decisions.length,
    openFollowupCount:decisions.reduce((sum,item)=>sum+item.followups.filter(f=>!f.completed).length,0),
    decisions,
    sourceOfTruth:'APPEND_ONLY_DECISION_MESSAGES',
    externalExecution:false,
  };
}

export function isInstitutionalDecisionRegistryRequest(textValue:string){
  return /^(سجل القرارات|سجل القرارات المؤسسي|القرارات المؤسسية|اعرض سجل القرارات|عرض سجل القرارات)$/i.test(textValue.trim());
}

export async function createInstitutionalDecisionRegistryReply(userId:string,roomKey:Extract<ConversationRoomKey,'central'|'secretary'>){
  const registry=await getInstitutionalDecisionRegistry(userId);
  const sql=getRawSql();
  const threads=await sql`
    select id from public.conversation_threads
    where user_id=${userId}::uuid and room_key=${roomKey}
    limit 1
  `;
  const threadId=threads[0]?.id?String(threads[0].id):null;
  if(!threadId) return null;

  const body=registry.total===0
    ? 'سجل القرارات المؤسسي لا يحتوي على قرارات معتمدة بعد.'
    : `سجل القرارات المؤسسي يحتوي على ${registry.total} قرارًا معتمدًا، منها ${registry.openFollowupCount} متابعة ما زالت مفتوحة. السجل يجمع قرارات التوزيع، معالجة الانحرافات، وإغلاق الدورات مع روابط الخطة والإصدار وحالة المتابعة.`;

  const rows=await sql`
    insert into public.conversation_messages(
      id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
    ) values(
      ${randomUUID()},${threadId}::uuid,${userId}::uuid,'agent',
      ${roomKey==='central'?'central-governor':'central-secretary'},
      ${roomKey==='central'?'محافظ بنك نماء المركزي':'أمين السر المركزي'},
      'followup',${body},
      ${JSON.stringify({
        institutional_decision_registry:true,
        registry,
        decision_count:registry.total,
        open_followup_count:registry.openFollowupCount,
        source_of_truth:'APPEND_ONLY_DECISION_MESSAGES',
        external_execution:false,
        execution_boundary:'عرض سجل مؤسسي للقرارات المعتمدة فقط؛ لا تعديل ولا تنفيذ مالي',
      })}::jsonb
    )
    returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
  `;
  const row=rows[0];
  if(!row) return null;
  return {
    ...row,id:String(row.id),sender_type:'agent' as const,sender_key:String(row.sender_key),sender_name:String(row.sender_name),
    message_kind:String(row.message_kind) as ConversationMessageKind,body:String(row.body),
    structured_data:row.structured_data as Record<string,unknown>,
  };
}
