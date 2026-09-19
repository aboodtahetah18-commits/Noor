import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import { buildFinancialResponsibilityClaims, getFinancialCycleAllocationSnapshot, summarizeAllocationConflict } from '@/lib/allocation/financial-cycle-allocation-engine';
import { getGovernorPreMeetingBrief, type GovernorPreMeetingBrief } from '@/lib/allocation/governor-pre-meeting-brief';
import type { ConversationMessageKind } from '@/lib/conversations/store';

export type MeetingAgendaPriority='BLOCKING'|'HIGH'|'NORMAL';
export type FinancialMeetingAgendaItem={
  id:string;
  priority:MeetingAgendaPriority;
  ownerKey:string|null;
  ownerName:string|null;
  title:string;
  reason:string;
  questions:string[];
  requiredOutcome:string;
  source:'CURRENT_EVIDENCE'|'PRIOR_CYCLE'|'ALLOCATION_CONFLICT'|'MEETING_GOVERNANCE';
};

export type FinancialMeetingOpeningAgenda={
  cycleId:string|null;
  availableIncome:number|null;
  items:FinancialMeetingAgendaItem[];
  blockingItemCount:number;
  highPriorityItemCount:number;
  expectedDecisions:string[];
  openQuestions:string[];
  meetingCanReachRatification:boolean;
  noAutomaticDecision:true;
  noAutomaticAllocationChange:true;
  externalExecution:false;
};

function agendaId(prefix:string,ownerKey:string|null,index:number){
  return `${prefix}-${ownerKey??'general'}-${index+1}`;
}

export function buildFinancialMeetingOpeningAgenda(args:{
  brief:GovernorPreMeetingBrief;
  allocationConflict:boolean;
  unresolvedOwners:string[];
}):FinancialMeetingOpeningAgenda{
  const items:FinancialMeetingAgendaItem[]=[];

  for(const owner of args.brief.items.filter(item=>item.evidenceState==='NEEDS_EVIDENCE')){
    items.push({
      id:agendaId('evidence',owner.ownerKey,items.length),
      priority:'BLOCKING',
      ownerKey:owner.ownerKey,
      ownerName:owner.ownerName,
      title:`استكمال أدلة ${owner.ownerName}`,
      reason:'المطالبة الحالية لا يمكن تثبيتها رقميًا قبل اكتمال الأدلة.',
      questions:[
        'ما البيانات أو المستندات الناقصة تحديدًا؟',
        'هل يمكن استكمالها أثناء الجلسة أم يجب تأجيل اعتماد هذا الجزء؟',
      ],
      requiredOutcome:'إما اكتمال الدليل وتثبيت المطالبة، أو إبقاء المجال غير محسوم ومنع اعتماد توزيع نهائي.',
      source:'CURRENT_EVIDENCE',
    });
  }

  for(const owner of args.brief.items.filter(item=>item.previousStatus==='EXCEEDED_APPROVED')){
    items.push({
      id:agendaId('overrun',owner.ownerKey,items.length),
      priority:'HIGH',
      ownerKey:owner.ownerKey,
      ownerName:owner.ownerName,
      title:`مراجعة التجاوز السابق — ${owner.ownerName}`,
      reason:'يوجد تجاوز مثبت على المخصص السابق ويجب تفسيره قبل مناقشة أي زيادة جديدة.',
      questions:[
        'ما سبب التجاوز المثبت؟',
        'هل كان السبب تغيرًا فعليًا في الاحتياج أم ضعفًا في التقدير أم ظرفًا استثنائيًا؟',
        'ما الذي تغير في مطالبة الدورة الحالية مقارنة بالدورة السابقة؟',
      ],
      requiredOutcome:'تفسير موثق للتجاوز وتحديد ما إذا كان يتطلب تعديل افتراضات الدورة الحالية أو يبقى حدثًا استثنائيًا.',
      source:'PRIOR_CYCLE',
    });
  }

  for(const owner of args.brief.items.filter(item=>item.previousStatus==='UNUSED_ALLOCATION')){
    items.push({
      id:agendaId('unused',owner.ownerKey,items.length),
      priority:'HIGH',
      ownerKey:owner.ownerKey,
      ownerName:owner.ownerName,
      title:`مراجعة المخصص غير المستخدم — ${owner.ownerName}`,
      reason:'كان هناك مخصص سابق بلا تنفيذ موثق، ولا يجوز نسخ المبلغ أو خفضه آليًا دون تفسير.',
      questions:[
        'هل لم يقع الاحتياج أصلًا أم أن التنفيذ لم يوثق؟',
        'هل ما زال الاحتياج قائمًا في الدورة الحالية؟',
      ],
      requiredOutcome:'تفسير سبب عدم الاستخدام وربطه بمطالبة الدورة الحالية دون تعديل آلي للمبلغ.',
      source:'PRIOR_CYCLE',
    });
  }

  for(const owner of args.brief.items.filter(item=>item.requestDeltaFromPreviousApproved!==null&&item.requestDeltaFromPreviousApproved!==0)){
    const delta=owner.requestDeltaFromPreviousApproved??0;
    items.push({
      id:agendaId('delta',owner.ownerKey,items.length),
      priority:'NORMAL',
      ownerKey:owner.ownerKey,
      ownerName:owner.ownerName,
      title:`تبرير تغير المطالبة — ${owner.ownerName}`,
      reason:delta>0
        ? `الطلب الحالي أعلى من المخصص السابق بمقدار ${new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(delta)} ر.س.`
        : `الطلب الحالي أقل من المخصص السابق بمقدار ${new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(Math.abs(delta))} ر.س.`,
      questions:['ما البيانات الحالية التي تفسر هذا التغير؟','هل التغير مؤقت لهذه الدورة أم تغير هيكلي؟'],
      requiredOutcome:'تبرير التغير وربطه ببيانات الدورة الحالية قبل اعتماد المبلغ.',
      source:'PRIOR_CYCLE',
    });
  }

  if(args.allocationConflict){
    items.push({
      id:agendaId('conflict',null,items.length),
      priority:'BLOCKING',
      ownerKey:null,
      ownerName:null,
      title:'حل تعارض إجمالي المطالب مع الدخل المتاح',
      reason:'مجموع المطالب المعروفة يتجاوز الدخل المتاح.',
      questions:['ما المطالب التي لديها هامش تنازل مثبت؟','هل توجد مطالبة محمية لا يمكن خفضها؟','هل نحتاج قرارًا من المستخدم لحسم التعارض؟'],
      requiredOutcome:'الوصول إلى مشروع متوازن أو تسجيل تعارض غير محلول يمنع الاعتماد.',
      source:'ALLOCATION_CONFLICT',
    });
  }

  items.push({
    id:agendaId('ratification',null,items.length),
    priority:'NORMAL',
    ownerKey:null,
    ownerName:null,
    title:'صياغة مشروع التوزيع ومحضر القرار',
    reason:'أي اتفاق في الاجتماع يبقى مشروعًا حتى يصادق عليه المستخدم صراحة.',
    questions:['هل جميع المطالب النهائية موثقة؟','هل بقي أي تعارض أو دليل ناقص؟','هل مشروع التوزيع جاهز لعرضه على المستخدم؟'],
    requiredOutcome:'مشروع توزيع واضح أو محضر يحدد ما بقي مفتوحًا؛ لا اعتماد ولا تنفيذ تلقائي.',
    source:'MEETING_GOVERNANCE',
  });

  const blockingItemCount=items.filter(item=>item.priority==='BLOCKING').length;
  const highPriorityItemCount=items.filter(item=>item.priority==='HIGH').length;
  const openQuestions=items.flatMap(item=>item.questions);
  const expectedDecisions=[
    'تثبيت المطالب التي اكتملت أدلتها.',
    'حسم أو إبقاء التعارضات غير المحلولة مفتوحة بوضوح.',
    'إخراج مشروع توزيع واحد قابل للمراجعة.',
    'عدم اعتبار أي نتيجة نهائية قبل مصادقة المستخدم.',
  ];

  return {
    cycleId:args.brief.currentCycleId,
    availableIncome:args.brief.availableIncome,
    items,
    blockingItemCount,
    highPriorityItemCount,
    expectedDecisions,
    openQuestions,
    meetingCanReachRatification:blockingItemCount===0&&args.unresolvedOwners.length===0&&!args.allocationConflict,
    noAutomaticDecision:true,
    noAutomaticAllocationChange:true,
    externalExecution:false,
  };
}

export async function getFinancialMeetingOpeningAgenda(userId:string){
  const [brief,snapshot]=await Promise.all([
    getGovernorPreMeetingBrief(userId),
    getFinancialCycleAllocationSnapshot(userId),
  ]);
  const claims=buildFinancialResponsibilityClaims(snapshot);
  const summary=summarizeAllocationConflict(snapshot,claims);
  return buildFinancialMeetingOpeningAgenda({
    brief,
    allocationConflict:summary.conflict,
    unresolvedOwners:summary.unresolved_owners,
  });
}

export function isMeetingOpeningAgendaRequest(text:string){
  return /^(جدول أعمال الاجتماع|محضر افتتاح الاجتماع|افتتاح الاجتماع|جهز جدول الأعمال|جهز جدول اعمال الاجتماع)$/i.test(text.trim());
}

export function formatMeetingOpeningAgenda(agenda:FinancialMeetingOpeningAgenda){
  const first=agenda.items.slice(0,5).map((item,index)=>`${index+1}) ${item.title}`).join('، ');
  return `افتتاح الاجتماع: جدول الأعمال يتضمن ${agenda.items.length} بندًا؛ منها ${agenda.blockingItemCount} مانع/موانع اعتماد و${agenda.highPriorityItemCount} بند/بنود عالية الأولوية. نبدأ بالترتيب: ${first}. الهدف النهائي هو مشروع توزيع موثق؛ لا يوجد اعتماد أو تعديل مخصصات أو تنفيذ مالي تلقائي.`;
}

export async function createMeetingOpeningAgendaReply(userId:string){
  const agenda=await getFinancialMeetingOpeningAgenda(userId);
  const sql=getRawSql();
  const rows=await sql`
    select id from public.conversation_threads
    where user_id=${userId}::uuid and room_key='council' limit 1
  `;
  const threadId=rows[0]?.id?String(rows[0].id):null;
  if(!threadId) return null;

  const inserted=await sql`
    insert into public.conversation_messages(
      id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
    ) values(
      ${randomUUID()},${threadId}::uuid,${userId}::uuid,'agent','central-secretary','أمين السر المركزي','message',
      ${formatMeetingOpeningAgenda(agenda)},
      ${JSON.stringify({
        meeting_opening_agenda:true,
        agenda,
        agenda_items:agenda.items,
        expected_decisions:agenda.expectedDecisions,
        open_questions:agenda.openQuestions,
        meeting_can_reach_ratification:agenda.meetingCanReachRatification,
        no_automatic_decision:true,
        no_automatic_allocation_change:true,
        external_execution:false,
        execution_boundary:'تنظيم ومحضر افتتاح فقط؛ لا اعتماد ولا تعديل مخصصات ولا تنفيذ مالي',
      })}::jsonb
    )
    returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
  `;
  await sql`update public.conversation_threads set updated_at=now() where id=${threadId}::uuid`;
  const row=inserted[0];
  if(!row) return null;
  return {
    ...row,
    id:String(row.id),
    sender_type:'agent' as const,
    sender_key:String(row.sender_key),
    sender_name:String(row.sender_name),
    message_kind:String(row.message_kind) as ConversationMessageKind,
    body:String(row.body),
    structured_data:row.structured_data as Record<string,unknown>,
  };
}
