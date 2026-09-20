import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import { getDashboardSummary } from '@/features/dashboard/queries/get-dashboard-summary';
import { getGovernanceOversightDashboard } from '@/lib/governance/governance-oversight-dashboard';
import { algorithmRolesForRoom, type AlgorithmRoleRef } from '@/lib/governance/algorithm-role-registry';
import type { ConversationRoomKey } from '@/lib/conversations/store';

export type OperationalDashboardStatus='GOOD'|'WATCH'|'ACTION'|'WAITING_DATA';

export type OperationalMetric={
  key:string;
  label:string;
  value:string;
  hint:string|null;
  status:OperationalDashboardStatus;
};

export type OperationalPlanItem={
  ownerRef:string;
  ownerName:string;
  title:string;
  current:string;
  target:string;
  nextAction:string;
  horizon:string;
  status:OperationalDashboardStatus;
  basis:string[];
};

export type WeeklyOperationalReport={
  periodStart:string;
  status:string;
  recommendationsCreated:number;
  recommendationsResolved:number;
  obligationTransitions:number;
  blockedRules:number;
  challenges:string[];
};

export type EntityOperationalDashboard={
  roomKey:ConversationRoomKey;
  title:string;
  generatedAt:string;
  state:OperationalDashboardStatus;
  headline:string;
  metrics:OperationalMetric[];
  attention:string[];
  plans:OperationalPlanItem[];
  roles:AlgorithmRoleRef[];
  weeklyReport:WeeklyOperationalReport|null;
  externalExecution:false;
};

function money(value:string|null|undefined){
  if(value===null||value===undefined) return 'غير متاح';
  const n=Number(value);
  if(!Number.isFinite(n)) return value;
  return new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(n)+' ر.س';
}

function percent(value:string|null|undefined){
  if(value===null||value===undefined) return 'غير متاح';
  const n=Number(value);
  if(!Number.isFinite(n)) return value;
  return new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(n)+'%';
}

function num(value:string|null|undefined){
  const n=Number(value??'0');
  return Number.isFinite(n)?n:0;
}

async function latestWeeklyReport(userId:string):Promise<WeeklyOperationalReport|null>{
  const sql=getRawSql();
  const rows=await sql`
    select period_start::text,status,summary
    from public.weekly_analysis_runs
    where user_id=${userId}
      and status in ('SUCCESS','PARTIAL')
    order by period_start desc,finished_at desc
    limit 1
  `;
  const row=rows[0] as Record<string,unknown>|undefined;
  if(!row) return null;
  const summary=(row.summary&&typeof row.summary==='object'&&!Array.isArray(row.summary))
    ? row.summary as Record<string,unknown>
    : {};
  const blocked=Array.isArray(summary.blockedRules)?summary.blockedRules:[];
  const reasonCodes=Array.isArray(summary.activeReasonCodes)?summary.activeReasonCodes.map(String):[];
  return {
    periodStart:String(row.period_start),
    status:String(row.status),
    recommendationsCreated:Number(summary.recommendationsCreated??0),
    recommendationsResolved:Number(summary.recommendationsResolved??0),
    obligationTransitions:Number(summary.obligationTransitions??0),
    blockedRules:blocked.length,
    challenges:[
      ...blocked.slice(0,3).map(item=>{
        const rec=item&&typeof item==='object'&&!Array.isArray(item)?item as Record<string,unknown>:{};
        return String(rec.issue??rec.reasonCode??'قاعدة تحتاج بيانات أو مراجعة');
      }),
      ...reasonCodes.slice(0,3).map(code=>'سبب نشط: '+code),
    ].slice(0,5),
  };
}

function waitingPlan(role:AlgorithmRoleRef):OperationalPlanItem{
  return {
    ownerRef:role.referenceCode,
    ownerName:role.name,
    title:'استكمال الأساس قبل تحديد رقم مستهدف',
    current:'بيانات التأسيس غير مكتملة بما يكفي',
    target:'خطة رقمية قابلة للتدقيق بعد اكتمال بيانات الدخل والسيولة والالتزامات والأهداف',
    nextAction:'أكمل بيانات التعارف مع المحافظ؛ بعدها يعيد المسؤول حساب خطته من البيانات الفعلية والسياسات النافذة.',
    horizon:'بعد اكتمال التأسيس',
    status:'WAITING_DATA',
    basis:role.policyRefs,
  };
}

function rolePlan(role:AlgorithmRoleRef,dashboard:Awaited<ReturnType<typeof getDashboardSummary>>):OperationalPlanItem{
  if(!dashboard) return waitingPlan(role);

  const safe=dashboard.safeToSpend.amount;
  const deficit=num(dashboard.forecast.expectedDeficit);
  const emergency=dashboard.emergencySummary;
  const budgetRemaining=num(dashboard.budget.remaining);
  const savingPlanned=num(dashboard.saving.planned);
  const savingActual=num(dashboard.saving.actual);

  if(role.key==='liquidity-protection-owner'){
    const current=emergency?money(emergency.currentBalance):'لا يوجد ملخص احتياط مكتمل';
    const target=emergency?.targetAmount?money(emergency.targetAmount):'يُحدد من سياسة الحماية بعد اكتمال البيانات';
    const gap=emergency?.targetAmount?Math.max(0,num(emergency.targetAmount)-num(emergency.currentBalance)):null;
    return {
      ownerRef:role.referenceCode,ownerName:role.name,title:'خطة الحماية والسيولة',
      current,target,
      nextAction:gap===null
        ?'استكمال هدف الاحتياط أولًا، ثم تحديد مساهمة دورية لا تكسر الالتزامات أو السيولة القريبة.'
        :gap>0
          ?`الفجوة الحالية في هدف الحماية ${money(String(gap))}. تُوزع مساهمتها على الدورات القادمة وفق السيولة الآمنة، ولا تُسحب تلقائيًا.`
          :'الاحتياط عند الهدف أو أعلى منه؛ يفحص المسؤول فائض الحماية المؤهل قبل اقتراح أي استخدام آخر.',
      horizon:'الدورات القادمة حتى بلوغ حد الحماية',
      status:gap!==null&&gap>0?'ACTION':'GOOD',
      basis:role.policyRefs,
    };
  }

  if(role.key==='goals-owner'){
    const active=dashboard.goalSummaries[0]??null;
    return {
      ownerRef:role.referenceCode,ownerName:role.name,title:'خطة تقدم الأهداف',
      current:active?`${active.name}: ${percent(active.progressPercent)}`:'لا يوجد هدف نشط ظاهر في لوحة الدورة',
      target:active?`${money(active.targetAmount)}${active.targetDate?' قبل '+active.targetDate:''}`:'تحديد الأهداف والمواعيد أولًا',
      nextAction:active
        ?'إعادة حساب المساهمة المطلوبة لكل دورة من الرصيد الحالي والموعد، ثم موازنتها مع الحماية والالتزامات.'
        :'إكمال بيانات الأهداف؛ لا يحدد المسؤول مساهمة شهرية بلا هدف وموعد وميزانية متاحة.',
      horizon:active?.targetDate??'بعد تعريف الأهداف',
      status:active?'WATCH':'WAITING_DATA',
      basis:role.policyRefs,
    };
  }

  if(role.key==='investment-owner'){
    return {
      ownerRef:role.referenceCode,ownerName:role.name,title:'خطة المال المؤهل للاستثمار',
      current:`السيولة الآمنة المتاحة: ${safe===null?'غير محسوبة':money(safe)}`,
      target:'استثمار الفائض المؤهل فقط بعد حماية السيولة والالتزامات والأهداف',
      nextAction:deficit>0
        ?'لا يفتح المسؤول مساهمة استثمارية جديدة من المال المطلوب لتغطية العجز المتوقع. يعالج العجز والسيولة أولًا.'
        :'يفحص المسؤول الفائض المؤهل والمدة والمخاطر، ثم يقترح مساهمة رقمية مبررة بدل نسبة ثابتة من الراتب.',
      horizon:'كل دورة مالية مع مراجعة ربع سنوية أعمق',
      status:deficit>0?'ACTION':safe===null?'WAITING_DATA':'WATCH',
      basis:role.policyRefs,
    };
  }

  if(role.key==='budget-spending-owner'){
    const util=dashboard.budget.utilizationPercent;
    return {
      ownerRef:role.referenceCode,ownerName:role.name,title:'خطة الميزانية والإنفاق',
      current:`المتبقي من الميزانية: ${money(String(budgetRemaining))} · الاستخدام: ${percent(util)}`,
      target:'إكمال الدورة دون عجز تشغيلي مع حماية الأساسيات',
      nextAction:'يراقب الانحرافات ويقترح إعادة توزيع البنود المرنة فقط عند الحاجة، مع إبقاء أثر التخفيض واضحًا.',
      horizon:'حتى نهاية الدورة الحالية',
      status:budgetRemaining<=0?'ACTION':'WATCH',
      basis:role.policyRefs,
    };
  }

  if(role.key==='obligations-owner'){
    const due=dashboard.upcomingObligations;
    return {
      ownerRef:role.referenceCode,ownerName:role.name,title:'خطة الالتزامات والاستحقاقات',
      current:due.length?`${due.length} استحقاقًا قريبًا ظاهرًا`:'لا توجد استحقاقات قريبة ظاهرة في اللوحة',
      target:'تغطية الالتزامات المثبتة في مواعيدها دون خلق ضغط غير آمن على دورة لاحقة',
      nextAction:due.length
        ?'يرتب المسؤول الاستحقاقات حسب التاريخ والأثر، ويصعد أي فجوة قبل الموعد بدل انتظار التعثر.'
        :'يستمر بالمراقبة ويعيد الحساب عند إضافة التزام أو تغير الدخل.',
      horizon:'الأيام المتبقية من الدورة والدورة التالية',
      status:due.some(item=>item.status==='OVERDUE')?'ACTION':due.length?'WATCH':'GOOD',
      basis:role.policyRefs,
    };
  }

  return {
    ownerRef:role.referenceCode,ownerName:role.name,title:'خطة تشغيل النطاق',
    current:`السيولة ${money(dashboard.liquidity.total)} · الادخار ${money(String(savingActual))} من ${money(String(savingPlanned))}`,
    target:'تحسين مؤشرات النطاق دون كسر الحماية أو الالتزامات',
    nextAction:dashboard.topRecommendation?.message??'مراقبة المؤشرات وإصدار توصية عند ظهور فجوة قابلة للإجراء.',
    horizon:'الدورة الحالية والثلاثة أشهر القادمة',
    status:dashboard.topRecommendation?'WATCH':'GOOD',
    basis:role.policyRefs,
  };
}

function metricsForRoom(roomKey:ConversationRoomKey,dashboard:Awaited<ReturnType<typeof getDashboardSummary>>):OperationalMetric[]{
  if(!dashboard) return [{key:'foundation',label:'حالة البيانات',value:'بانتظار اكتمال التأسيس',hint:'تظهر المؤشرات الرقمية بعد اكتمال البيانات وبدء الدورة.',status:'WAITING_DATA'}];

  if(roomKey==='solvency') return [
    {key:'liquidity',label:'السيولة',value:money(dashboard.liquidity.total),hint:null,status:'GOOD'},
    {key:'emergency',label:'رصيد الحماية',value:dashboard.emergencySummary?money(dashboard.emergencySummary.currentBalance):'غير مكتمل',hint:dashboard.emergencySummary?.targetAmount?'الهدف '+money(dashboard.emergencySummary.targetAmount):null,status:dashboard.emergencySummary?'WATCH':'WAITING_DATA'},
    {key:'deficit',label:'العجز المتوقع',value:money(dashboard.forecast.expectedDeficit),hint:null,status:num(dashboard.forecast.expectedDeficit)>0?'ACTION':'GOOD'},
  ];

  if(roomKey==='assets') return [
    {key:'goals',label:'الأهداف النشطة',value:String(dashboard.goalSummaries.length),hint:dashboard.goalSummaries[0]?.name??null,status:dashboard.goalSummaries.length?'WATCH':'WAITING_DATA'},
    {key:'saving',label:'الادخار الفعلي',value:money(dashboard.saving.actual),hint:'المخطط '+money(dashboard.saving.planned),status:num(dashboard.saving.actual)>=num(dashboard.saving.planned)?'GOOD':'WATCH'},
    {key:'safe',label:'السيولة الآمنة',value:money(dashboard.safeToSpend.amount),hint:'قبل أي اقتراح استثماري',status:dashboard.safeToSpend.amount===null?'WAITING_DATA':'GOOD'},
  ];

  if(roomKey==='hilal') return [
    {key:'budget',label:'المتبقي من الميزانية',value:money(dashboard.budget.remaining),hint:'الاستخدام '+percent(dashboard.budget.utilizationPercent),status:num(dashboard.budget.remaining)>0?'GOOD':'ACTION'},
    {key:'obligations',label:'الاستحقاقات القريبة',value:String(dashboard.upcomingObligations.length),hint:null,status:dashboard.upcomingObligations.some(item=>item.status==='OVERDUE')?'ACTION':dashboard.upcomingObligations.length?'WATCH':'GOOD'},
    {key:'forecast',label:'رصيد نهاية الدورة المتوقع',value:money(dashboard.forecast.projectedEndBalance),hint:null,status:num(dashboard.forecast.expectedDeficit)>0?'ACTION':'GOOD'},
  ];

  return [
    {key:'liquidity',label:'السيولة',value:money(dashboard.liquidity.total),hint:null,status:'GOOD'},
    {key:'safe',label:'المتاح الآمن',value:money(dashboard.safeToSpend.amount),hint:null,status:dashboard.safeToSpend.amount===null?'WAITING_DATA':'GOOD'},
    {key:'budget',label:'المتبقي من الميزانية',value:money(dashboard.budget.remaining),hint:'الاستخدام '+percent(dashboard.budget.utilizationPercent),status:num(dashboard.budget.remaining)>0?'GOOD':'ACTION'},
    {key:'saving',label:'الادخار',value:money(dashboard.saving.actual),hint:'المخطط '+money(dashboard.saving.planned),status:num(dashboard.saving.actual)>=num(dashboard.saving.planned)?'GOOD':'WATCH'},
  ];
}

export async function getEntityOperationalDashboard(userId:string,roomKey:ConversationRoomKey):Promise<EntityOperationalDashboard>{
  const [dashboard,weekly,oversight]=await Promise.all([
    getDashboardSummary(userId).catch(()=>null),
    latestWeeklyReport(userId),
    (roomKey==='central'||roomKey==='secretary')?getGovernanceOversightDashboard(userId).catch(()=>null):Promise.resolve(null),
  ]);

  const roles=algorithmRolesForRoom(roomKey);
  const plans=roles.map(role=>rolePlan(role,dashboard));
  const metrics=metricsForRoom(roomKey,dashboard);
  const attention:string[]=[];

  if(dashboard?.topRecommendation) attention.push(dashboard.topRecommendation.title+': '+dashboard.topRecommendation.message);
  if(dashboard?.upcomingObligations.some(item=>item.status==='OVERDUE')) attention.push('يوجد التزام متأخر يحتاج مراجعة قبل أي توزيع مرن جديد.');
  if(num(dashboard?.forecast.expectedDeficit)>0) attention.push('التوقع الحالي يظهر فجوة حماية/عجزًا يحتاج معالجة قبل التوسع في الاستخدامات المرنة.');
  if(oversight?.overdueFollowups.length) attention.push(`${oversight.overdueFollowups.length} متابعة حوكميّة متأخرة تحتاج معالجة.`);
  if(!dashboard) attention.push('اللوحة تنتظر اكتمال بيانات التأسيس وبدء دورة مالية قبل إعطاء أهداف رقمية.');

  const states=[...metrics.map(item=>item.status),...plans.map(item=>item.status)];
  const state:OperationalDashboardStatus=states.includes('ACTION')?'ACTION':states.includes('WATCH')?'WATCH':states.includes('WAITING_DATA')?'WAITING_DATA':'GOOD';

  return {
    roomKey,
    title:roomKey==='central'?'بنك نماء المركزي':roomKey==='solvency'?'بنك ملاءة':roomKey==='assets'?'بنك الأصول الاستثماري':roomKey==='hilal'?'بنك الهلال':roomKey==='operations'?'مركز العمليات والمطابقة':roomKey==='advisor'?'المستشار الاقتصادي':roomKey==='secretary'?'أمين السر المركزي':'مجلس نماء الأعلى',
    generatedAt:new Date().toISOString(),
    state,
    headline:state==='ACTION'?'هناك نقاط تحتاج إجراء أو قرار قريب.':state==='WATCH'?'الوضع تحت السيطرة مع نقاط تستحق المتابعة.':state==='WAITING_DATA'?'تحتاج اللوحة بيانات تأسيس إضافية قبل إعطاء قراءة رقمية كاملة.':'المؤشرات الحالية مستقرة ضمن البيانات المتاحة.',
    metrics,
    attention,
    plans,
    roles,
    weeklyReport:weekly,
    externalExecution:false,
  };
}


export async function publishWeeklyEntityReports(userId:string,periodStart:string){
  const sql=getRawSql();
  const roomKeys:ConversationRoomKey[]=['central','operations','solvency','assets','hilal','advisor'];
  const published:string[]=[];

  for(const roomKey of roomKeys){
    const threads=await sql`
      select id from public.conversation_threads
      where user_id=${userId}::uuid and room_key=${roomKey}
      limit 1
    `;
    const threadId=threads[0]?.id?String(threads[0].id):null;
    if(!threadId) continue;

    const exists=await sql`
      select id from public.conversation_messages
      where user_id=${userId}::uuid
        and thread_id=${threadId}::uuid
        and structured_data->>'weekly_entity_report'='true'
        and structured_data->>'period_start'=${periodStart}
      limit 1
    `;
    if(exists[0]?.id) continue;

    const dashboard=await getEntityOperationalDashboard(userId,roomKey);
    const planSummary=dashboard.plans.map(plan=>`${plan.ownerName}: ${plan.nextAction}`).join(' ');
    const attention=dashboard.attention.length
      ? dashboard.attention.join(' ')
      : 'لا توجد نقطة عاجلة مسجلة ضمن البيانات الحالية.';
    const body=`التقرير الأسبوعي — ${dashboard.title}: ${dashboard.headline} ${attention} ${planSummary}`.trim();

    await sql`
      insert into public.conversation_messages(
        id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
      ) values(
        ${randomUUID()},${threadId}::uuid,${userId}::uuid,'agent',
        ${roomKey==='central'?'central-governor':roomKey==='advisor'?'economic-advisor':roomKey+'-manager'},
        ${dashboard.title},
        'followup',
        ${body},
        ${JSON.stringify({
          weekly_entity_report:true,
          period_start:periodStart,
          room_key:roomKey,
          dashboard_state:dashboard.state,
          headline:dashboard.headline,
          metrics:dashboard.metrics,
          attention:dashboard.attention,
          plans:dashboard.plans,
          weekly_report:dashboard.weeklyReport,
          external_execution:false,
          execution_boundary:'تقرير متابعة وتخطيط فقط؛ لا تحويل ولا سداد ولا استثمار تلقائي',
        })}::jsonb
      )
    `;
    await sql`update public.conversation_threads set updated_at=now() where id=${threadId}::uuid`;
    published.push(roomKey);
  }

  return {published};
}
