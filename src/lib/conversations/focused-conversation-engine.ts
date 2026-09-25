import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import { algorithmRoleByKey, assertRoleCompactAuthority, compactAuthoritiesForRole, type AlgorithmRoleRef } from '@/lib/governance/algorithm-role-registry';
import { getEntityOperationalDashboard } from '@/lib/conversations/entity-operational-dashboard';
import { getGovernanceMeetingSchedule } from '@/lib/governance/governance-meeting-scheduler';
import type { ConversationMessageKind, ConversationRoomKey } from '@/lib/conversations/store';
import { createBudgetCommitteeConversationReply } from '@/lib/conversations/budget-committee-conversation-engine';
import { getLivePersonalBudgetCalculation } from '@/lib/finance/live-personal-budget-calculation';

type FocusedReply={
  id:string;
  sender_type:'agent';
  sender_key:string;
  sender_name:string;
  message_kind:ConversationMessageKind;
  body:string;
  structured_data:Record<string,unknown>;
  created_at?:string;
};

function shortFactSummary(rows:Array<{fact_key:unknown;value_json:unknown}>){
  const labels:Record<string,string>={
    income:'الدخل',
    accounts:'الحسابات',
    obligations:'الالتزامات',
    goals:'الأهداف',
    'extended:bills':'الفواتير',
    'extended:subscriptions':'الاشتراكات',
    'extended:vehicle_details':'المركبة',
    'extended:budget_behavior':'سلوك الإنفاق',
  };
  return rows
    .map(row=>labels[String(row.fact_key)])
    .filter((label):label is string=>typeof label==='string'&&label.length>0)
    .slice(0,6);
}

function roleCalculationSummary(
  roleKey:string,
  live:Awaited<ReturnType<typeof getLivePersonalBudgetCalculation>>,
){
  if(!live)return null;
  const values=live.calculation.values;
  const sar=(value:string|null)=>value===null?'غير متاح':new Intl.NumberFormat('ar-SA-u-nu-latn',{maximumFractionDigits:2}).format(Number(value))+' ر.س';
  const pct=(value:string|null)=>value===null?'غير متاح':new Intl.NumberFormat('ar-SA-u-nu-latn',{maximumFractionDigits:2}).format(Number(value))+'٪';
  if(roleKey==='budget-spending-owner'){
    return 'القراءة الحسابية الحالية: المتاح الحقيقي '+sar(values.trueAvailable)+'، استخدام الخطة '+pct(values.utilizationPercent)+'، والحد اليومي الاسترشادي '+sar(values.dailyGuidance)+'.';
  }
  if(roleKey==='obligations-owner'){
    return 'القراءة الحسابية الحالية: الالتزامات المحمية '+sar(values.protectedObligations)+'، والعجز التشغيلي '+sar(values.operatingDeficit)+'.';
  }
  if(roleKey==='liquidity-protection-owner'){
    return 'القراءة الحسابية الحالية: الحماية المطلوبة '+sar(values.requiredProtection)+'، والمتاح الحقيقي '+sar(values.trueAvailable)+'، والعجز التشغيلي '+sar(values.operatingDeficit)+'.';
  }
  if(roleKey==='goals-owner'){
    const goal=live.goals[0];
    return goal
      ?'القراءة الحسابية الحالية لأعلى هدف ظاهر: المتبقي '+sar(goal.remainingAmount)+'، والمساهمة الدورية المطلوبة '+sar(goal.requiredContribution)+'.'
      :'لا يوجد هدف مالي نشط قابل للحساب حاليًا.';
  }
  if(roleKey==='investment-owner'){
    return 'القراءة الحسابية الحالية: الفائض الحقيقي قبل اختبار الأهلية الاستثمارية '+sar(values.trueSurplus)+'.';
  }
  return null;
}

function shouldShowCalculationSummary(text:string){
  return /(?:كم|الحالي|الوضع|الحساب|احسب|ميزاني|المتاح|العجز|الفائض|الالتزام|الهدف|الإنفاق|الصرف|الادخار|الاستثمار)/i.test(text);
}

function roleIntro(role:AlgorithmRoleRef){
  const protectedItems=role.accountableFor.slice(0,3).join('، ');
  return `أنا ${role.name}. أتعامل مع هذا الحوار ضمن نطاقي المباشر: ${protectedItems}. أقرأ البيانات المؤكدة المشتركة مع بقية نماء قبل أن أطلب منك معلومة جديدة، ولا أعيد السؤال عن معلومة صالحة إلا إذا تغيرت أو احتجت تأكيدًا جديدًا.`;
}

function roleQuestion(role:AlgorithmRoleRef,text:string,known:string[],planNextAction:string|null,previousUserMessage:string|null){
  if(/ماذا تعرف|وش تعرف|إيش تعرف|ايش تعرف|تتذكر|ذاكرة|معلوماتي/i.test(text)){
    return known.length
      ? `المعلومات المشتركة المتاحة لي حاليًا تشمل: ${known.join('، ')}. سأستخدمها داخل اختصاصي ولن أعيد طلبها منك ما دامت صالحة.`
      : 'لا توجد لدي الآن بيانات مشتركة كافية أستطيع الاعتماد عليها بأمان، لذلك سأطلب فقط المعلومة اللازمة للخطوة الحالية.';
  }
  if(/وش المطلوب|ما المطلوب|التالي|ابدأ|نبدأ|وش الخطوة|ما الخطوة/i.test(text)){
    return planNextAction
      ? `الخطوة التالية عندي: ${planNextAction}`
      : `الخطوة التالية هي أن ترسل لي الموضوع الذي تريد متابعته ضمن نطاق ${role.name}، وسأحدد من الذاكرة ما هو مكتمل وما الذي ينقص فقط.`;
  }
  if(planNextAction){
    const continuity=previousUserMessage?` وأتذكر أن آخر نقطة ناقشناها هنا كانت: «${previousUserMessage}».`:'';
    return `استلمت رسالتك وسأربطها ببياناتك المؤكدة.${continuity} حسب وضعك الحالي، أهم خطوة لدي الآن: ${planNextAction}`;
  }
  return previousUserMessage
    ?`أكمل معك من نفس السياق. آخر نقطة ناقشناها هنا كانت: «${previousUserMessage}». سأتعامل مع رسالتك الجديدة ضمن صلاحياتي وأستخدم الذاكرة المشتركة قبل أن أطلب أي معلومة إضافية.`
    :'استلمت رسالتك. سأتعامل معها ضمن صلاحياتي فقط، وأستخدم الذاكرة المشتركة قبل أن أطلب أي معلومة إضافية.';
}

export async function createFocusedRoleReply(args:{
  userId:string;
  roomKey:ConversationRoomKey;
  roleKey:string;
  userText:string;
}):Promise<FocusedReply|null>{
  const role=algorithmRoleByKey(args.roleKey);
  if(!role||role.kind!=='responsibility_owner'||role.homeRoom!==args.roomKey)return null;
  assertRoleCompactAuthority(role.key,'READ_CONFIRMED_DATA');
  assertRoleCompactAuthority(role.key,'RECORD_INTERNAL_CONTEXT');
  const sql=getRawSql();
  const [threadRows,factRows,dashboard,liveCalculation]=await Promise.all([
    sql`select id from public.conversation_threads where user_id=${args.userId}::uuid and room_key=${args.roomKey} limit 1`,
    sql`
      select fact_key,value_json
      from public.user_foundation_facts
      where user_id=${args.userId}::uuid and status='ACTIVE'
        and fact_key in ('income','accounts','obligations','goals','extended:bills','extended:subscriptions','extended:vehicle_details','extended:budget_behavior')
      order by updated_at desc
    `,
    getEntityOperationalDashboard(args.userId,args.roomKey).catch(()=>null),
    getLivePersonalBudgetCalculation(args.userId).catch(()=>null),
  ]);
  const threadId=threadRows[0]?.id?String(threadRows[0].id):null;
  if(!threadId)return null;
  const historyRows=await sql`
    select body
    from public.conversation_messages
    where user_id=${args.userId}::uuid
      and thread_id=${threadId}::uuid
      and sender_type='user'
      and structured_data->>'scope_kind'='role'
      and structured_data->>'role_key'=${role.key}
    order by created_at desc
    limit 2
  `;
  const previousUserMessage=historyRows[1]?.body?String(historyRows[1].body).trim().slice(0,180):null;
  const known=shortFactSummary(factRows as Array<{fact_key:unknown;value_json:unknown}>);
  const plan=dashboard?.plans.find(item=>item.ownerName===role.name)??null;
  const calculationSummary=shouldShowCalculationSummary(args.userText)
    ?(assertRoleCompactAuthority(role.key,'CALCULATE_AND_ANALYZE'),roleCalculationSummary(role.key,liveCalculation))
    :null;
  const body=`${roleIntro(role)} ${calculationSummary??''} ${roleQuestion(role,args.userText,known,plan?.nextAction??null,previousUserMessage)}`.trim();
  const structuredData={
    scope_kind:'role',
    role_key:role.key,
    role_name:role.name,
    room_key:args.roomKey,
    known_fact_groups:known,
    next_action:plan?.nextAction??null,
    allowed_authorities:compactAuthoritiesForRole(role.key),
    calculation_engine:liveCalculation?liveCalculation.calculation.engineVersion:null,
    calculation_snapshot:liveCalculation?{
      true_available:liveCalculation.calculation.values.trueAvailable,
      operating_deficit:liveCalculation.calculation.values.operatingDeficit,
      true_surplus:liveCalculation.calculation.values.trueSurplus,
      required_protection:liveCalculation.calculation.values.requiredProtection,
      protected_obligations:liveCalculation.calculation.values.protectedObligations,
      utilization_percent:liveCalculation.calculation.values.utilizationPercent,
      calculation_confidence:liveCalculation.calculation.values.calculationConfidence,
      engine_snapshot_id:liveCalculation.source.engineSnapshotId,
    }:null,
    memory_aware:true,
    external_execution:false,
    execution_boundary:'إرشاد وتحليل ومتابعة فقط؛ لا تنفيذ مالي خارجي',
  };
  const rows=await sql`
    insert into public.conversation_messages(
      id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
    ) values(
      ${randomUUID()},${threadId}::uuid,${args.userId}::uuid,'agent',
      ${role.key},${role.name},'message',${body},${JSON.stringify(structuredData)}::jsonb
    )
    returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
  `;
  await sql`update public.conversation_threads set updated_at=now() where id=${threadId}::uuid`;
  return (rows[0]??null) as FocusedReply|null;
}

function meetingOwner(title:string){
  if(/ميزانية|إنفاق|دورة مالية|توازن/.test(title))return {key:'budget-spending-owner',name:'مسؤول الميزانية والإنفاق'};
  if(/استقرار|سيولة|تمويل/.test(title))return {key:'liquidity-protection-owner',name:'مسؤول السيولة والحماية'};
  if(/أهداف|التزامات/.test(title))return {key:'obligations-owner',name:'مسؤول الالتزامات'};
  if(/استثمار|أصول/.test(title))return {key:'investment-owner',name:'مسؤول الاستثمار'};
  return {key:'central-governor',name:'محافظ بنك نماء المركزي'};
}

export async function createFocusedMeetingReply(args:{
  userId:string;
  meetingId:string;
  userText:string;
}):Promise<FocusedReply|null>{
  const sql=getRawSql();
  const [schedule,threadRows]=await Promise.all([
    getGovernanceMeetingSchedule(args.userId),
    sql`select id from public.conversation_threads where user_id=${args.userId}::uuid and room_key='council' limit 1`,
  ]);
  const meeting=schedule.meetings.find(item=>item.id===args.meetingId);
  const threadId=threadRows[0]?.id?String(threadRows[0].id):null;
  if(!meeting||!threadId)return null;
  if(/ميزانية|إنفاق|دورة مالية|توازن/.test(meeting.title)){
    const budgetReply=await createBudgetCommitteeConversationReply(args);
    if(budgetReply)return budgetReply;
  }
  const owner=meetingOwner(meeting.title);
  assertRoleCompactAuthority(owner.key,'RECORD_INTERNAL_CONTEXT');
  const missing=meeting.missing_data??[];
  const historyRows=await sql`
    select body
    from public.conversation_messages
    where user_id=${args.userId}::uuid
      and thread_id=${threadId}::uuid
      and sender_type='user'
      and structured_data->>'scope_kind'='meeting'
      and structured_data->>'meeting_id'=${meeting.id}
    order by created_at desc
    limit 2
  `;
  const previousUserMessage=historyRows[1]?.body?String(historyRows[1].body).trim().slice(0,180):null;
  const asksStatus=/جاهز|جاهزة|ناقص|ينقص|وش نحتاج|ما نحتاج/i.test(args.userText);
  const continuity=previousUserMessage?` وآخر نقطة ناقشناها في هذه الدردشة كانت: «${previousUserMessage}».`:'';
  const body=asksStatus
    ? missing.length
      ? `بالنسبة إلى ${meeting.title}: الاجتماع غير مكتمل بعد. البيانات الناقصة هي: ${missing.join('، ')}. سأناقش معك هذه النقاط داخل هذه الدردشة نفسها حتى يكتمل الملف.`
      : `بالنسبة إلى ${meeting.title}: البيانات الأساسية المسجلة متاحة حاليًا. محاور الاجتماع هي: ${meeting.agenda.join('، ')||'لا توجد محاور مثبتة بعد'}.`
    : `هذه دردشة ${meeting.title}. سأحتفظ بالنقاش مرتبطًا بهذا الاجتماع، وأستخدم بياناتك المشتركة ومحاوره الحالية بدل خلطه ببقية المحادثات.${continuity} رسالتك سأسجلها كسياق للاجتماع، وأي نقطة تحتاج قرارًا ستبقى منفصلة عن التنفيذ المالي الفعلي.`;
  const structuredData={
    scope_kind:'meeting',
    meeting_id:meeting.id,
    meeting_title:meeting.title,
    meeting_kind:meeting.kind,
    meeting_status:meeting.status,
    meeting_ready:meeting.ready??true,
    missing_data:missing,
    agenda:meeting.agenda,
    allowed_authorities:compactAuthoritiesForRole(owner.key),
    memory_aware:true,
    external_execution:false,
    execution_boundary:'نقاش وتجهيز اجتماع فقط؛ لا تنفيذ مالي خارجي',
  };
  const rows=await sql`
    insert into public.conversation_messages(
      id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
    ) values(
      ${randomUUID()},${threadId}::uuid,${args.userId}::uuid,'agent',
      ${owner.key},${owner.name},'message',${body},${JSON.stringify(structuredData)}::jsonb
    )
    returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
  `;
  await sql`update public.conversation_threads set updated_at=now() where id=${threadId}::uuid`;
  return (rows[0]??null) as FocusedReply|null;
}
