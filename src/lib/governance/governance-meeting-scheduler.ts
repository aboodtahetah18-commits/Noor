import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import { getLivePersonalBudgetCalculation } from '@/lib/finance/live-personal-budget-calculation';
import { syncFinancialLearningLifecycle } from '@/lib/finance/financial-learning-lifecycle';

export type GovernanceMeetingScheduleItem={
  id:string;
  title:string;
  kind:'مجلس'|'لجنة دائمة'|'لجنة مؤقتة';
  scheduled_at:string;
  cadence:string;
  status:string;
  agenda:string[];
  minimum_annual_meetings?:number;
  periodic?:boolean;
  sensitivity?:'عادية'|'رقابية حساسة';
  ready?:boolean;
  missing_data?:string[];
  editable?:boolean;
  deletable?:boolean;
  custom?:boolean;
};

export const governanceCommitteeCadencePolicy={
  permanent:{minimum_annual_meetings:2,periodic:true,rule:'اللجان الدائمة محدودة العدد، وتجتمع دوريًا عند نقاط المراجعة أو عند وجود حدث جوهري؛ لا ينشأ اجتماع لمجرد مرور الوقت.'},
  temporary:{minimum_annual_meetings:0,periodic:false,rule:'اللجنة المؤقتة لا تنشأ إلا لسبب محدد لا يغطيه المسار التشغيلي أو إحدى اللجنتين الدائمتين، وتنتهي بإغلاق السبب.'},
  sensitiveOversight:{minimum_annual_meetings:2,periodic:true,rule:'المراجعة الرقابية والتعلم تتم نصف سنويًا مبدئيًا، مع جلسة إضافية فقط عند تغير جوهري أو خلل يتطلب قرارًا.'},
} as const;

function addHours(date:Date,hours:number){return new Date(date.getTime()+hours*60*60*1000)}
function addDays(date:Date,days:number){return new Date(date.getTime()+days*24*60*60*1000)}

export function compactCommitteeTriggers(args:{
  cycleCount:number;
  operatingDeficit:number;
  utilizationPercent:number;
}){
  const normalizedCycle=Math.max(1,args.cycleCount);
  const thirdCycle=normalizedCycle%3===0;
  const sixthCycle=normalizedCycle%6===0;
  return {
    financialBalance:args.cycleCount<=1||thirdCycle||args.operatingDeficit>0||args.utilizationPercent>=90,
    oversightLearning:sixthCycle,
    thirdCycle,
    sixthCycle,
  };
}

export async function getGovernanceMeetingSchedule(userId:string){
  const sql=getRawSql();
  const onboardingRows=await sql`
    select m.created_at
    from public.conversation_messages m
    join public.conversation_threads t on t.id=m.thread_id
    where m.user_id=${userId}::uuid
      and t.user_id=${userId}::uuid
      and t.room_key='central'
      and coalesce(m.structured_data->>'onboarding_complete','false')='true'
    order by m.created_at desc
    limit 1
  `;
  const completedAt=onboardingRows[0]?.created_at?new Date(String(onboardingRows[0].created_at)):null;
  if(!completedAt) return {onboarding_complete:false,cycle_anchor:null,cycle_count:0,meetings:[] as GovernanceMeetingScheduleItem[]};

  const [cycleRows,cycleCountRows,liveCalculation,learningLifecycle]=await Promise.all([
    sql`
      select id,start_date::text,expected_next_income_date::text,status,created_at
      from public.financial_cycles
      where user_id=${userId}::uuid
      order by start_date desc,created_at desc
      limit 1
    `,
    sql`select count(*)::int as count from public.financial_cycles where user_id=${userId}::uuid`,
    getLivePersonalBudgetCalculation(userId).catch(()=>null),
    syncFinancialLearningLifecycle(userId).catch(()=>null),
  ]);

  const cycleCount=Number(cycleCountRows[0]?.count??0);
  const cycleId=cycleRows[0]?.id?String(cycleRows[0].id):'foundation';
  const councilAt=addHours(completedAt,24);
  const anchor=cycleRows[0]?.start_date?new Date(String(cycleRows[0].start_date)+'T00:00:00Z'):new Date(completedAt);
  const calculationValues=liveCalculation?.calculation.values??null;
  const utilization=calculationValues?.utilizationPercent===null||calculationValues?.utilizationPercent===undefined
    ?0:Number(calculationValues.utilizationPercent);
  const operatingDeficit=calculationValues?Number(calculationValues.operatingDeficit):0;
  const committeeTriggers=compactCommitteeTriggers({
    cycleCount,
    operatingDeficit:Number.isFinite(operatingDeficit)?operatingDeficit:0,
    utilizationPercent:Number.isFinite(utilization)?utilization:0,
  });
  const financialBalanceTrigger=committeeTriggers.financialBalance;
  const learningItems=learningLifecycle?Object.values(learningLifecycle.store.items):[];
  const learningReviewItems=learningItems.filter(item=>['BACKTEST_PASSED','IN_REVIEW','APPROVED'].includes(item.status));
  const oversightTrigger=committeeTriggers.oversightLearning||learningReviewItems.length>0;
  const now=new Date();

  const readinessRows=await sql`
    select fact_key,value_json
    from public.user_foundation_facts
    where user_id=${userId}::uuid
      and status='ACTIVE'
      and fact_key in ('accounts','extended:bills','extended:subscriptions','extended:budget_behavior','extended:vehicle_details','meeting_overrides')
  `;
  const readiness=new Map(readinessRows.map(row=>[String(row.fact_key),row.value_json]));
  const hasAccounts=(()=>{
    const value=readiness.get('accounts');
    return Boolean(value&&typeof value==='object'&&!Array.isArray(value)&&Array.isArray((value as Record<string,unknown>).items)&&((value as Record<string,unknown>).items as unknown[]).length);
  })();
  const hasTable=(key:string)=>{
    const value=readiness.get(key);
    return Boolean(value&&typeof value==='object'&&!Array.isArray(value)&&Array.isArray((value as Record<string,unknown>).items));
  };
  const budgetMissing=[
    !hasAccounts?'الحسابات':null,
    !hasTable('extended:bills')?'الفواتير':null,
    !hasTable('extended:subscriptions')?'الاشتراكات':null,
    !readiness.has('extended:budget_behavior')?'سلوك المصروفات':null,
    !readiness.has('extended:vehicle_details')?'بيانات المركبة والتنقل':null,
  ].filter((item):item is string=>Boolean(item));
  const budgetReady=budgetMissing.length===0;

  let meetings:GovernanceMeetingScheduleItem[]=[
    {
      id:'council-foundation',
      title:'الاجتماع التأسيسي لمجلس نماء الأعلى',
      kind:'مجلس',
      scheduled_at:councilAt.toISOString(),
      cadence:'مرة واحدة بعد 24 ساعة من اعتماد التأسيس',
      status:councilAt>now?'مجدول':'مستحق للمراجعة',
      agenda:['مراجعة فهم المجلس للمستخدم','مناقشة الأهداف والالتزامات والسيولة والأصول','معايرة أسلوب الخوارزميات وأسئلتها ومستوى الشرح','تثبيت تفضيلات الحوكمة والاجتماعات'],
      ready:true,editable:true,deletable:false,
    },
    ...(financialBalanceTrigger?[{
      id:`financial-balance-${cycleId}`,
      title:'لجنة الدورة المالية والتوازن',
      kind:'لجنة دائمة' as const,
      scheduled_at:addDays(anchor,0).toISOString(),
      cadence:'عند أول دورة، ثم كل ثالث دورة، أو فور ظهور عجز أو انحراف جوهري',
      status:budgetReady?'مطلوبة للمراجعة':'بانتظار اكتمال البيانات',
      agenda:[
        'الميزانية والإنفاق والانحرافات',
        'الالتزامات والاستحقاقات',
        'السيولة والحماية',
        'الأهداف والتخصيصات',
        'التعارضات التي لا تستطيع الخوارزميات حسمها تشغيليًا',
      ],
      minimum_annual_meetings:2,
      periodic:true,
      sensitivity:'عادية' as const,
      ready:budgetReady,
      missing_data:budgetMissing,
      editable:true,
      deletable:false,
    }]:[]),
    ...(oversightTrigger?[{
      id:`oversight-learning-${cycleId}`,
      title:'لجنة المراجعة والمخاطر والتعلم',
      kind:'لجنة دائمة' as const,
      scheduled_at:addDays(anchor,5).toISOString(),
      cadence:'كل سادس دورة مالية، أو عند وجود مقترح تعلم اجتاز الاختبار الخلفي ويحتاج مراجعة',
      status:'مطلوبة للمراجعة',
      agenda:[
        'جودة الحسابات ومصدر الحقيقة',
        'المخاطر والحدود الصارمة',
        'أداء الخوارزميات ودقة التوقع',
        learningReviewItems.length
          ?'مراجعة '+learningReviewItems.length+' مقترح تعلم اجتاز الاختبار الخلفي'
          :'التعلم المستمر والتغييرات المقترحة',
        'قرار قبول أو رفض المعايرة دون تغيير القواعد الصارمة',
      ],
      minimum_annual_meetings:2,
      periodic:true,
      sensitivity:'رقابية حساسة' as const,
      ready:true,
      editable:true,
      deletable:false,
    }]:[]),
  ];

  const overrideValue=readiness.get('meeting_overrides');
  const overrides=overrideValue&&typeof overrideValue==='object'&&!Array.isArray(overrideValue)
    ? overrideValue as Record<string,Record<string,unknown>>
    : {};
  meetings=meetings.flatMap(meeting=>{
    const override=overrides[meeting.id];
    if(override?.deleted===true)return [];
    if(!override)return [meeting];
    return [{
      ...meeting,
      title:typeof override.title==='string'?override.title:meeting.title,
      scheduled_at:typeof override.scheduled_at==='string'?override.scheduled_at:meeting.scheduled_at,
      cadence:typeof override.cadence==='string'?override.cadence:meeting.cadence,
      status:typeof override.status==='string'?override.status:meeting.status,
      agenda:Array.isArray(override.agenda)?override.agenda.filter((item):item is string=>typeof item==='string'):meeting.agenda,
      editable:true,deletable:false,
    }];
  });
  for(const [id,override] of Object.entries(overrides)){
    if(override.deleted===true||meetings.some(meeting=>meeting.id===id)||override.custom!==true)continue;
    const scheduled=typeof override.scheduled_at==='string'?override.scheduled_at:new Date().toISOString();
    meetings.push({
      id,
      title:typeof override.title==='string'&&override.title.trim()?override.title:'اجتماع مخصص',
      kind:override.kind==='مجلس'?'مجلس':override.kind==='لجنة دائمة'?'لجنة دائمة':'لجنة مؤقتة',
      scheduled_at:scheduled,
      cadence:typeof override.cadence==='string'?override.cadence:'حسب الحاجة فقط',
      status:typeof override.status==='string'?override.status:'مجدول',
      agenda:Array.isArray(override.agenda)?override.agenda.filter((item):item is string=>typeof item==='string'):[],
      ready:true,editable:true,deletable:true,custom:true,
    });
  }

  return {onboarding_complete:true,cycle_anchor:anchor.toISOString(),cycle_count:cycleCount,meetings};
}

export async function syncGovernanceMeetingInvitations(userId:string){
  const schedule=await getGovernanceMeetingSchedule(userId);
  if(!schedule.onboarding_complete||!schedule.meetings.length) return schedule;
  const sql=getRawSql();
  const secretaryThreads=await sql`
    select id from public.conversation_threads
    where user_id=${userId}::uuid and room_key='secretary'
    limit 1
  `;
  const threadId=secretaryThreads[0]?.id?String(secretaryThreads[0].id):null;
  if(!threadId) return schedule;

  for(const meeting of schedule.meetings){
    const exists=await sql`
      select id from public.conversation_messages
      where thread_id=${threadId}::uuid and user_id=${userId}::uuid
        and structured_data->>'meeting_id'=${meeting.id}
      limit 1
    `;
    if(exists[0]?.id) continue;
    const when=meeting.kind==='مجلس'
      ? new Intl.DateTimeFormat('ar-SA',{dateStyle:'medium',timeStyle:'short'}).format(new Date(meeting.scheduled_at))
      : new Intl.DateTimeFormat('ar-SA',{dateStyle:'medium'}).format(new Date(meeting.scheduled_at));
    const body=meeting.kind==='مجلس'
      ? `تمت جدولة ${meeting.title} في ${when}. سأجهز قبلها ملف التأسيس والصورة المالية والخوارزميات النشطة ونقاط النقاش معك.`
      : meeting.kind==='لجنة دائمة'
        ? `تمت إضافة ${meeting.title} إلى تقويمك الحوكمي في ${when}. اللجان الدائمة في الهيكل المبسط محدودة العدد، وتجتمع عند نقطة مراجعة مقررة أو عند وجود سبب جوهري يستدعي قرارًا؛ المتابعة التشغيلية اليومية تبقى للخوارزميات والبنوك ولا تحتاج اجتماعًا مستقلًا.`
        : `تمت إضافة ${meeting.title} في ${when} بسبب حاجة محددة. هذه لجنة مؤقتة تنتهي بإغلاق سببها ولا تتحول إلى لجنة دائمة تلقائيًا.`;
    await sql`
      insert into public.conversation_messages(
        id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
      ) values(
        ${randomUUID()},${threadId}::uuid,${userId}::uuid,'agent','central-secretary','أمين السر المركزي',
        'followup',${body},${JSON.stringify({
          meeting:true,
          meeting_id:meeting.id,
          meeting_kind:meeting.kind,
          scheduled_at:meeting.scheduled_at,
          cadence:meeting.cadence,
          agenda:meeting.agenda,
          minimum_annual_meetings:meeting.minimum_annual_meetings??null,
          periodic:meeting.periodic??false,
          sensitivity:meeting.sensitivity??null,
          execution_boundary:'لا تنفيذ مالي من الاجتماع ذاته',
        })}::jsonb
      )
    `;
  }
  await sql`update public.conversation_threads set updated_at=now() where id=${threadId}::uuid`;
  return schedule;
}
