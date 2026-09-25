import { createHash, randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import { getDashboardSummary } from '@/features/dashboard/queries/get-dashboard-summary';
import { getCurrentFinancialPlanMonitoring } from '@/lib/allocation/financial-plan-monitoring';
import { getGovernanceMeetingSchedule } from '@/lib/governance/governance-meeting-scheduler';
import { getLivePersonalBudgetCalculation } from '@/lib/finance/live-personal-budget-calculation';
import type { ConversationMessageKind } from '@/lib/conversations/store';
import { assertRoleCompactAuthority, compactAuthoritiesForRole } from '@/lib/governance/algorithm-role-registry';
import type { FinancialDecisionLearningContext } from '@/lib/finance/financial-learning-decision-context';
import { getFinancialDecisionExplanation, type FinancialDecisionExplanation } from '@/lib/finance/financial-decision-explanation';

export type BudgetCommitteePointKind='RISK'|'DEVIATION'|'DATA_GAP'|'IMPROVEMENT'|'INFO';
export type BudgetCommitteePoint={
  key:string; kind:BudgetCommitteePointKind; priority:number; title:string;
  summary:string; evidence:string[]; question:string|null; requiresResponse:boolean;
  learningContext?:FinancialDecisionLearningContext|null;
  decisionExplanation?:FinancialDecisionExplanation|null;
};
type BudgetCommitteeReply={
  id:string; sender_type:'agent'; sender_key:string; sender_name:string;
  message_kind:ConversationMessageKind; body:string; structured_data:Record<string,unknown>; created_at?:string;
};

function n(value:unknown){const parsed=typeof value==='number'?value:Number(value);return Number.isFinite(parsed)?parsed:0}
function pointFingerprint(point:BudgetCommitteePoint){
  return createHash('sha256').update(JSON.stringify({
    key:point.key,kind:point.kind,summary:point.summary,evidence:point.evidence,question:point.question,
  })).digest('hex');
}
function money(value:number){return new Intl.NumberFormat('ar-SA-u-nu-latn',{maximumFractionDigits:2}).format(value)+' ر.س'}
function percent(value:number){return new Intl.NumberFormat('ar-SA-u-nu-latn',{maximumFractionDigits:1}).format(value)+'٪'}

export function classifyBudgetCommitteeResponse(text:string){
  const value=text.trim();
  if(/(?:ليش|لماذا|وضح|اشرح|كيف حسبت|على أي أساس|على اي اساس)/i.test(value))return 'EXPLAIN' as const;
  if(/^(?:اعتمد|موافق|وافق|نعم|تمام|مناسب)[.!؟\s]*$/i.test(value))return 'APPROVE' as const;
  if(/^(?:لا|ارفض|أرفض|رفض|غير مناسب|ما أوافق|لا أوافق)[.!؟\s]*$/i.test(value))return 'REJECT' as const;
  if(/(?:مؤقت|استثنائي|مرة واحدة|هذا الشهر فقط|بسبب|لأن|لان|دوام|سفر|مناسبة|طارئ)/i.test(value))return 'CONTEXT' as const;
  if(/(?:التالي|النقطة التالية|كمل|اكمل|أكمل)/i.test(value))return 'NEXT' as const;
  if(/(?:وش المهم|ما المهم|ركز|الأهم|الاهم|ملخص)/i.test(value))return 'FOCUS' as const;
  return 'GENERAL' as const;
}

async function handledPointKeys(userId:string,threadId:string,points:BudgetCommitteePoint[]){
  const sql=getRawSql();
  const rows=await sql`
    select structured_data from public.conversation_messages
    where user_id=${userId}::uuid and thread_id=${threadId}::uuid
      and sender_type='agent'
      and structured_data->>'scope_kind'='meeting'
      and structured_data->>'committee_engine'='budget-v1'
      and structured_data ? 'committee_resolution_status'
    order by created_at desc
    limit 120
  `;
  const activeFingerprints=new Map(points.map(point=>[point.key,pointFingerprint(point)]));
  const handled=new Set<string>();
  for(const row of rows){
    const data=row.structured_data&&typeof row.structured_data==='object'&&!Array.isArray(row.structured_data)
      ?row.structured_data as Record<string,unknown>:{};
    const key=typeof data.committee_resolved_point_key==='string'?data.committee_resolved_point_key:null;
    const status=typeof data.committee_resolution_status==='string'?data.committee_resolution_status:null;
    const fingerprint=typeof data.committee_resolved_point_fingerprint==='string'?data.committee_resolved_point_fingerprint:null;
    if(!key||!fingerprint||!['CONTEXT_RECEIVED','APPROVED','REJECTED','ANSWERED','CLOSED'].includes(String(status)))continue;
    if(activeFingerprints.get(key)===fingerprint)handled.add(key);
  }
  return handled;
}

async function lastCommitteeTurn(userId:string,threadId:string,meetingId:string){
  const sql=getRawSql();
  const rows=await sql`
    select body,structured_data from public.conversation_messages
    where user_id=${userId}::uuid and thread_id=${threadId}::uuid
      and sender_type='agent'
      and structured_data->>'scope_kind'='meeting'
      and structured_data->>'meeting_id'=${meetingId}
      and structured_data->>'committee_engine'='budget-v1'
    order by created_at desc limit 1
  `;
  const row=rows[0];
  if(!row)return null;
  const data=row.structured_data&&typeof row.structured_data==='object'&&!Array.isArray(row.structured_data)
    ?row.structured_data as Record<string,unknown>:{};
  return {body:String(row.body??''),data};
}

export async function buildBudgetCommitteePoints(userId:string,meetingId:string):Promise<BudgetCommitteePoint[]>{
  const [dashboard,monitoring,schedule,liveCalculation,budgetExplanation,forecastExplanation]=await Promise.all([
    getDashboardSummary(userId).catch(()=>null),
    getCurrentFinancialPlanMonitoring(userId).catch(()=>null),
    getGovernanceMeetingSchedule(userId).catch(()=>null),
    getLivePersonalBudgetCalculation(userId).catch(()=>null),
    getFinancialDecisionExplanation(userId,'budget_spending').catch(()=>null),
    getFinancialDecisionExplanation(userId,'forecast').catch(()=>null),
  ]);
  const budgetLearning=budgetExplanation?.learning??null;
  const forecastLearning=forecastExplanation?.learning??null;
  const meeting=schedule?.meetings.find(item=>item.id===meetingId);
  const points:BudgetCommitteePoint[]=[];

  if(meeting?.missing_data?.length){
    points.push({
      key:'meeting-data-gap',kind:'DATA_GAP',priority:130,title:'بيانات تمنع اكتمال قراءة اللجنة',
      summary:'هناك بيانات أساسية ناقصة قبل أن أعطيك حكمًا نهائيًا على بعض البنود.',
      evidence:meeting.missing_data.map(item=>'البيان الناقص: '+item),
      question:'نبدأ بأهم نقص: '+meeting.missing_data[0]+'. هل تستطيع تزويدي به الآن؟',requiresResponse:true,
    });
  }

  if(liveCalculation){
    const values=liveCalculation.calculation.values;
    const currentDeficit=n(values.operatingDeficit);
    if(currentDeficit>0){
      points.push({
        key:'current-operating-deficit',
        kind:'RISK',
        priority:155,
        title:'عجز تشغيلي حالي مثبت حسابيًا',
        summary:'المحرك الحسابي الموحد يبين أن المتطلبات المحمية الحالية تتجاوز الموارد التشغيلية بمقدار '+money(currentDeficit)+'.',
        evidence:[
          'الموارد التشغيلية: '+money(n(values.operatingResources)),
          'الالتزامات المحمية: '+money(n(values.protectedObligations)),
          'الأساسيات المحجوزة: '+money(n(values.reservedEssentials)),
          'الحماية المطلوبة: '+money(n(values.requiredProtection)),
          'مخصصات الأهداف الواجبة: '+money(n(values.requiredGoalAllocations)),
          ...(forecastLearning?['ذاكرة التعلم: '+forecastLearning.shortText]:[]),
        ],
        learningContext:forecastLearning,
        decisionExplanation:forecastExplanation,
        question:'هل يوجد مبلغ متحقق أو سداد أو تغيير فعلي لم يدخل السجل بعد قبل أن نعيد توزيع الخطة؟',
        requiresResponse:true,
      });
    }

    const utilization=n(values.utilizationPercent);
    if(utilization>=85){
      points.push({
        key:'calculated-budget-utilization',
        kind:utilization>=100?'DEVIATION':'IMPROVEMENT',
        priority:utilization>=100?136:106,
        title:utilization>=100?'تجاوز محسوب في خطة الإنفاق':'اقتراب محسوب من حد خطة الإنفاق',
        summary:'المنفذ الفعلي مقابل المخطط وصل إلى '+percent(utilization)+'.',
        evidence:[
          'المخطط: '+money(n(values.plannedAmount)),
          'المنفذ الفعلي: '+money(n(values.realizedAmount)),
          'الانحراف: '+money(n(values.varianceAmount)),
          'المتاح الحقيقي الحالي: '+money(n(values.trueAvailable)),
          ...(budgetLearning?['ذاكرة التعلم: '+budgetLearning.shortText]:[]),
        ],
        learningContext:budgetLearning,
        decisionExplanation:budgetExplanation,
        question:'هل هذا الارتفاع مؤقت لهذه الدورة، أم يعكس مستوى إنفاق يتكرر معك؟',
        requiresResponse:true,
      });
    }
  }

  if(dashboard){
    const overdue=dashboard.upcomingObligations.filter(item=>item.status==='OVERDUE');
    if(overdue.length){
      points.push({
        key:'overdue-obligations',kind:'RISK',priority:150,title:'استحقاق متأخر يؤثر على خطة الإنفاق',
        summary:'يوجد '+overdue.length+' استحقاق متأخر، لذلك أي توسيع للإنفاق المرن يجب أن ينتظر التحقق من حالته.',
        evidence:overdue.slice(0,3).map(item=>item.name+': '+item.amount+' ر.س — '+item.status),
        question:'هل تم سداد هذه الاستحقاقات خارج نماء، أم ما زالت قائمة؟',requiresResponse:true,
      });
    }

    const deficit=n(dashboard.forecast.expectedDeficit);
    if(deficit>0){
      points.push({
        key:'forecast-deficit',kind:'RISK',priority:145,title:'فجوة متوقعة قبل نهاية الدورة',
        summary:'التوقع الحالي يشير إلى عجز يقارب '+money(deficit)+' إذا استمر المسار الحالي.',
        evidence:[
          'رصيد نهاية الدورة المتوقع: '+String(dashboard.forecast.projectedEndBalance)+' ر.س',
          'العجز المتوقع: '+money(deficit),
          ...(forecastLearning?['ذاكرة التعلم: '+forecastLearning.shortText]:[]),
        ],
        learningContext:forecastLearning,
        decisionExplanation:forecastExplanation,
        question:'قبل أن أقترح خفضًا: هل يوجد دخل قريب أو مبلغ متوقع لم يُسجل بعد؟',requiresResponse:true,
      });
    }

    const util=n(dashboard.budget.utilizationPercent);
    const remaining=n(dashboard.budget.remaining);
    if(!liveCalculation&&util>=85){
      points.push({
        key:'budget-utilization',kind:util>=100?'DEVIATION':'IMPROVEMENT',priority:util>=100?132:104,
        title:util>=100?'تجاوز في استخدام الميزانية':'اقتراب من حد الميزانية',
        summary:'استخدام الميزانية وصل إلى '+percent(util)+' والمتبقي '+money(remaining)+'.',
        evidence:[
          'نسبة الاستخدام: '+percent(util),
          'المتبقي: '+money(remaining),
          ...(budgetLearning?['ذاكرة التعلم: '+budgetLearning.shortText]:[]),
        ],
        learningContext:budgetLearning,
        decisionExplanation:budgetExplanation,
        question:'هل الارتفاع هذا مؤقت بسبب ظرف محدد، أم أصبح نمطًا متكررًا؟',requiresResponse:true,
      });
    }
  }

  if(monitoring){
    for(const item of monitoring.items.filter(item=>item.status==='EXCEEDED').slice(0,4)){
      points.push({
        key:'plan-exceeded:'+item.ownerKey,kind:'DEVIATION',priority:138,title:'تجاوز مثبت على '+item.ownerName,
        summary:'المنفذ الموثق تجاوز المخطط بمقدار '+money(item.varianceAmount)+'.',
        evidence:[
          'المخطط: '+money(item.plannedAmount),
          'المنفذ: '+money(item.realizedAmount),
          'عدد الأدلة/الحركات: '+String(item.evidenceCount),
          ...(budgetLearning?['ذاكرة التعلم: '+budgetLearning.shortText]:[]),
        ],
        learningContext:budgetLearning,
        decisionExplanation:budgetExplanation,
        question:'هل هذا التجاوز سببه حالة مؤقتة يمكن استثناؤها، أم يحتاج تعديلًا في الخطة؟',requiresResponse:true,
      });
    }
  }

  if(!points.length){
    points.push({
      key:'stable-cycle',kind:'INFO',priority:30,title:'لا توجد نقطة حرجة ظاهرة الآن',
      summary:'المؤشرات المتاحة لا تظهر تجاوزًا أو عجزًا مثبتًا يحتاج قرارًا فوريًا.',
      evidence:['سأستمر في مراقبة الخطة والانحرافات والالتزامات خلال الدورة.'],question:null,requiresResponse:false,
    });
  }
  return points.sort((a,b)=>b.priority-a.priority);
}

function explainPoint(point:BudgetCommitteePoint){
  const evidence=point.evidence.length?point.evidence.map((item,index)=>(index+1)+') '+item).join(' '):'لا يوجد دليل رقمي إضافي مسجل.';
  const explanation=point.decisionExplanation;
  if(explanation){
    const memory=explanation.memory.summary??'لا يوجد سياق سابق موثق يغير القرار الحالي';
    const learning=explanation.learning?.shortText??'لا يوجد تعلم سابق مؤهل للتأثير على القرار';
    return 'تفسير النقطة «'+point.title+'»: الرقم الحالي — '+explanation.current.label+' '+explanation.current.value+
      '. القاعدة — '+explanation.rule.title+
      '. الذاكرة السابقة — '+memory+
      '. التعلم — '+learning+
      '. لماذا الآن — '+explanation.why+
      '. الأدلة الرقمية: '+evidence+
      ' هذا تفسير تحليلي وليس تنفيذًا ماليًا تلقائيًا.';
  }
  const learning=point.learningContext?' ومن سجل التعلم: '+point.learningContext.shortText:'';
  return 'سبب تركيزي على «'+point.title+'» هو أن أثرها أعلى من بقية النقاط الحالية. الأدلة: '+evidence+learning+' هذا تفسير تحليلي وليس تنفيذًا أو قرارًا ماليًا تلقائيًا.';
}

function nextPointBody(point:BudgetCommitteePoint,remaining:number){
  const tail=remaining>0?' وبعد هذه النقطة عندي '+remaining+' نقطة أخرى مرتبة حسب الأثر.':' وهذه آخر نقطة ذات أولوية حاليًا.';
  const learning=point.learningContext&&point.learningContext.decisionUse!=='HISTORICAL_ONLY'
    ?' '+point.learningContext.shortText
    :'';
  return (point.summary+learning+' '+(point.question??'')+tail).trim();
}

export async function createBudgetCommitteeConversationReply(args:{userId:string;meetingId:string;userText:string;}):Promise<BudgetCommitteeReply|null>{
  assertRoleCompactAuthority('budget-spending-owner','CALCULATE_AND_ANALYZE');
  assertRoleCompactAuthority('budget-spending-owner','RECORD_INTERNAL_CONTEXT');
  const sql=getRawSql();
  const [schedule,threadRows]=await Promise.all([
    getGovernanceMeetingSchedule(args.userId),
    sql`select id from public.conversation_threads where user_id=${args.userId}::uuid and room_key='council' limit 1`,
  ]);
  const meeting=schedule.meetings.find(item=>item.id===args.meetingId);
  const threadId=threadRows[0]?.id?String(threadRows[0].id):null;
  if(!meeting||!threadId||!/ميزانية|إنفاق|دورة مالية|توازن/.test(meeting.title))return null;

  const [points,lastTurn]=await Promise.all([
    buildBudgetCommitteePoints(args.userId,args.meetingId),
    lastCommitteeTurn(args.userId,threadId,args.meetingId),
  ]);
  const handled=await handledPointKeys(args.userId,threadId,points);
  const currentKey=typeof lastTurn?.data.active_committee_point_key==='string'
    ?lastTurn.data.active_committee_point_key
    :typeof lastTurn?.data.committee_point_key==='string'?lastTurn.data.committee_point_key:null;
  const currentPoint=points.find(point=>point.key===currentKey)??null;
  const responseType=classifyBudgetCommitteeResponse(args.userText);

  let point=currentPoint;
  let resolutionStatus:string|null=null;
  let resolvedPointKey:string|null=null;
  let resolvedPointFingerprint:string|null=null;
  let decision:string|null=null;
  let contextNote:string|null=null;
  let body='';

  if(currentPoint&&responseType==='EXPLAIN'){
    body=explainPoint(currentPoint)+' '+(currentPoint.question??'');
  }else if(currentPoint&&responseType==='APPROVE'){
    decision='APPROVED'; resolutionStatus='APPROVED'; resolvedPointKey=currentPoint.key; resolvedPointFingerprint=pointFingerprint(currentPoint); handled.add(currentPoint.key);
    const next=points.find(item=>!handled.has(item.key))??null; point=next;
    body=next
      ?'تم تسجيل موافقتك على النقطة السابقة ضمن محضر الحوار، دون تنفيذ مالي تلقائي. ننتقل للنقطة التالية: '+nextPointBody(next,Math.max(0,points.filter(item=>!handled.has(item.key)&&item.key!==next.key).length))
      :'تم تسجيل موافقتك على النقطة السابقة. لا توجد نقطة أعلى أولوية متبقية الآن.';
  }else if(currentPoint&&responseType==='REJECT'){
    decision='REJECTED'; resolutionStatus='REJECTED'; resolvedPointKey=currentPoint.key; resolvedPointFingerprint=pointFingerprint(currentPoint); handled.add(currentPoint.key);
    const next=points.find(item=>!handled.has(item.key))??null; point=next;
    body=next
      ?'تم تسجيل رفضك للنقطة السابقة وسأحتفظ به حتى لا أعيد طرحها كأنها جديدة بلا سبب. ننتقل الآن إلى: '+nextPointBody(next,Math.max(0,points.filter(item=>!handled.has(item.key)&&item.key!==next.key).length))
      :'تم تسجيل رفضك. لا توجد نقطة أخرى أعلى أولوية حاليًا.';
  }else if(currentPoint&&responseType==='CONTEXT'){
    contextNote=args.userText.trim().slice(0,400); resolutionStatus='CONTEXT_RECEIVED'; resolvedPointKey=currentPoint.key; resolvedPointFingerprint=pointFingerprint(currentPoint); handled.add(currentPoint.key);
    const next=points.find(item=>!handled.has(item.key))??null; point=next;
    body=next
      ?'سجلت تفسيرك للنقطة السابقة كسياق لهذه الدورة، لذلك لن أتعامل معها تلقائيًا كاتجاه دائم. ننتقل إلى: '+nextPointBody(next,Math.max(0,points.filter(item=>!handled.has(item.key)&&item.key!==next.key).length))
      :'سجلت تفسيرك كسياق للدورة الحالية. لا توجد نقطة أخرى أعلى أولوية الآن.';
  }else{
    const next=points.find(item=>!handled.has(item.key))??points[0]??null; point=next;
    if(!next)return null;
    const preview=points.filter(item=>!handled.has(item.key)&&item.key!==next.key).slice(0,2).map(item=>item.title);
    const previewText=preview.length?' وبعدها: '+preview.join('، ')+'.':'';
    body=responseType==='FOCUS'||responseType==='NEXT'
      ?'أهم نقطة الآن: '+next.title+'. '+nextPointBody(next,Math.max(0,points.filter(item=>!handled.has(item.key)&&item.key!==next.key).length))
      :'أبدأ معك بأعلى نقطة أثرًا بدل عرض كل شيء دفعة واحدة. '+next.title+': '+nextPointBody(next,Math.max(0,points.filter(item=>!handled.has(item.key)&&item.key!==next.key).length))+previewText;
  }

  const messageKind:ConversationMessageKind=point?.kind==='RISK'?'risk':point?.kind==='DEVIATION'?'followup':point?.requiresResponse?'request':'message';
  const structuredData={
    scope_kind:'meeting',meeting_id:meeting.id,meeting_title:meeting.title,committee_engine:'budget-v1',
    committee_point_key:point?.key??currentPoint?.key??null,committee_point_title:point?.title??currentPoint?.title??null,
    committee_point_kind:point?.kind??currentPoint?.kind??null,committee_point_status:'OPEN',
    active_committee_point_key:point?.key??null,
    active_committee_point_fingerprint:point?pointFingerprint(point):null,
    committee_resolved_point_key:resolvedPointKey,committee_resolution_status:resolutionStatus,
    committee_resolved_point_fingerprint:resolvedPointFingerprint,
    committee_decision:decision,committee_context_note:contextNote,response_type:responseType,
    ranked_points:points.slice(0,3).map(item=>({key:item.key,title:item.title,kind:item.kind,priority:item.priority})),
    decision_explanation:point?.decisionExplanation?{
      domain:point.decisionExplanation.domain,
      current:point.decisionExplanation.current,
      rule:point.decisionExplanation.rule,
      memory:point.decisionExplanation.memory,
      learning:point.decisionExplanation.learning?{
        algorithm_key:point.decisionExplanation.learning.algorithmKey,
        algorithm_name:point.decisionExplanation.learning.algorithmName,
        outcome:point.decisionExplanation.learning.outcome,
        decision_use:point.decisionExplanation.learning.decisionUse,
        source_cycle_ids:point.decisionExplanation.learning.sourceCycleIds,
        confidence:point.decisionExplanation.learning.confidence,
      }:null,
      why:point.decisionExplanation.why,
      guardrails:point.decisionExplanation.guardrails,
    }:null,
    learning_decision_context:point?.learningContext?{
      algorithm_key:point.learningContext.algorithmKey,
      algorithm_name:point.learningContext.algorithmName,
      outcome:point.learningContext.outcome,
      decision_use:point.learningContext.decisionUse,
      source_cycle_ids:point.learningContext.sourceCycleIds,
      confidence:point.learningContext.confidence,
      last_event_at:point.learningContext.lastEventAt,
    }:null,
    allowed_authorities:compactAuthoritiesForRole('budget-spending-owner'),
    memory_aware:true,external_execution:false,
    execution_boundary:'حوار لجنة وتحليل وقرارات مسجلة فقط؛ لا تنفيذ مالي خارجي تلقائي',
  };

  const rows=await sql`
    insert into public.conversation_messages(
      id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
    ) values(
      ${randomUUID()},${threadId}::uuid,${args.userId}::uuid,'agent',
      'budget-spending-owner','مسؤول الميزانية والإنفاق',${messageKind},${body},${JSON.stringify(structuredData)}::jsonb
    )
    returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
  `;
  await sql`update public.conversation_threads set updated_at=now() where id=${threadId}::uuid`;
  return (rows[0]??null) as BudgetCommitteeReply|null;
}

export async function buildBudgetCommitteePreMeetingBrief(userId:string,meetingId:string){
  const points=await buildBudgetCommitteePoints(userId,meetingId);
  const top=points.slice(0,3);
  return {
    title:'ورقة تركيز لجنة الميزانية والإنفاق',
    points:top,
    body:top.length
      ?'قبل اجتماع لجنة الميزانية والإنفاق، عندي '+top.length+' نقاط تستحق تركيزك: '+top.map((item,index)=>(index+1)+') '+item.title).join('، ')+'. سأناقشها معك واحدة واحدة داخل دردشة الاجتماع، ولن أطلب قرارًا على أكثر من نقطة في الرسالة الواحدة.'
      :'لا توجد نقطة ذات أولوية مرتفعة قبل الاجتماع حاليًا.',
  };
}
