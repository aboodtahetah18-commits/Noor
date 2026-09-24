import { getRawSql } from '@/infrastructure/db/client';
import { extendedProfileSections } from '@/lib/conversations/extended-profile-catalog';

export type FinancialJourneyStage=
  | 'FOUNDATION'
  | 'DETAILED_PROFILE'
  | 'FOUNDING_MEETING_READY'
  | 'FOUNDING_MEETING'
  | 'BUDGET_PREPARATION'
  | 'SALARY_ACTIVATION'
  | 'ACTIVE_CYCLE'
  | 'NEXT_CYCLE_REFRESH';

export type FinancialJourneySectionProgress={
  key:string;
  title:string;
  completed_fields:number;
  total_fields:number;
  completion_percent:number;
  complete:boolean;
  not_applicable:boolean;
  missing_fields:Array<{key:string;label:string}>;
};

export type FinancialJourneyStatus={
  stage:FinancialJourneyStage;
  completion_percent:number;
  foundation_complete:boolean;
  detailed_profile_complete:boolean;
  reviewed_sections:number;
  total_sections:number;
  section_progress:FinancialJourneySectionProgress[];
  missing_sections:Array<{key:string;title:string}>;
  next_section:{key:string;title:string}|null;
  next_field:{section_key:string;section_title:string;key:string;label:string}|null;
  founding_meeting_eligible:boolean;
  founding_meeting_proposed_at:string|null;
  salary_cycle_active:boolean;
  monthly_refresh_due:boolean;
  next_action:string;
};

function addHours(date:Date,hours:number){
  return new Date(date.getTime()+hours*60*60*1000);
}

function hasAnsweredValue(value:unknown){
  if(typeof value==='number') return Number.isFinite(value)&&value>=0;
  if(typeof value==='string') return value.trim().length>0;
  if(typeof value==='boolean') return true;
  return value!==null&&value!==undefined;
}

export async function getFinancialJourneyStatus(userId:string):Promise<FinancialJourneyStatus>{
  const sql=getRawSql();
  const [stateRows,factRows,meetingRows,cycleRows]=await Promise.all([
    sql`select status,completed_at,updated_at from public.user_onboarding_state where user_id=${userId}::uuid limit 1`,
    sql`select fact_key,value_json,verified_at,updated_at from public.user_foundation_facts
        where user_id=${userId}::uuid and status='ACTIVE' and fact_key like 'extended:%'`,
    sql`select created_at,structured_data from public.conversation_messages
        where user_id=${userId}::uuid
          and structured_data->>'meeting_id'='council-foundation'
        order by created_at desc limit 1`,
    sql`select id,start_date::text,expected_next_income_date::text,status,created_at
        from public.financial_cycles
        where user_id=${userId}::uuid
        order by start_date desc,created_at desc limit 1`,
  ]);

  const foundationComplete=String(stateRows[0]?.status??'')==='COMPLETED';
  const valuesBySection=new Map<string,Record<string,unknown>>();
  for(const row of factRows){
    const key=String(row.fact_key??'').replace(/^extended:/,'');
    const value=row.value_json&&typeof row.value_json==='object'&&!Array.isArray(row.value_json)
      ?row.value_json as Record<string,unknown>
      :{};
    if(key) valuesBySection.set(key,value);
  }

  const sectionProgress:FinancialJourneySectionProgress[]=extendedProfileSections.map(section=>{
    const values=valuesBySection.get(section.key)??{};
    const notApplicable=values.__not_applicable===true;
    const missingFields=notApplicable?[]:section.fields
      .filter(field=>!hasAnsweredValue(values[field.key]))
      .map(field=>({key:field.key,label:field.label}));
    const completedFields=notApplicable?section.fields.length:section.fields.length-missingFields.length;
    const totalFields=section.fields.length;
    return {
      key:section.key,
      title:section.title,
      completed_fields:completedFields,
      total_fields:totalFields,
      completion_percent:totalFields?Math.round((completedFields/totalFields)*100):100,
      complete:notApplicable||missingFields.length===0,
      not_applicable:notApplicable,
      missing_fields:missingFields,
    };
  });

  const missingSections=sectionProgress
    .filter(section=>!section.complete)
    .map(section=>({key:section.key,title:section.title}));
  const totalSections=sectionProgress.length;
  const reviewedSections=sectionProgress.filter(section=>section.complete).length;
  const totalFields=sectionProgress.reduce((sum,section)=>sum+section.total_fields,0);
  const completedFields=sectionProgress.reduce((sum,section)=>sum+section.completed_fields,0);
  const detailComplete=foundationComplete&&missingSections.length===0;

  // التأسيس الأساسي نصف الجاهزية، والتفاصيل الدقيقة نصفها الآخر محسوبة على مستوى الحقول.
  const foundationWeight=foundationComplete?50:0;
  const detailWeight=totalFields>0?Math.round((completedFields/totalFields)*50):50;
  const completion=Math.min(100,foundationWeight+detailWeight);

  const meeting=meetingRows[0]??null;
  const meetingScheduled=Boolean(meeting);
  const cycleActive=Boolean(cycleRows[0]?.id)&&!['CLOSED','ARCHIVED'].includes(String(cycleRows[0]?.status??'').toUpperCase());

  const foundationCompletedAt=stateRows[0]?.completed_at
    ?new Date(String(stateRows[0].completed_at))
    :stateRows[0]?.updated_at
      ?new Date(String(stateRows[0].updated_at))
      :null;
  const proposedAt=detailComplete&&!meetingScheduled
    ?addHours(foundationCompletedAt&&Number.isFinite(foundationCompletedAt.getTime())?foundationCompletedAt:new Date(),1).toISOString()
    :null;

  const now=new Date();
  const refreshDue=now.getUTCDate()>=20;
  const nextSectionProgress=sectionProgress.find(section=>!section.complete)??null;
  const firstMissing=nextSectionProgress?.missing_fields[0]??null;

  let stage:FinancialJourneyStage='FOUNDATION';
  let nextAction='استكمال بيانات التأسيس الأساسية مع المحافظ.';
  if(foundationComplete&&!detailComplete){
    stage='DETAILED_PROFILE';
    nextAction=nextSectionProgress&&firstMissing
      ?`استكمال «${nextSectionProgress.title}»: ${firstMissing.label}.`
      :nextSectionProgress
        ?`استكمال قسم «${nextSectionProgress.title}».`
        :'مراجعة الملف المالي التفصيلي.';
  }else if(detailComplete&&!meetingScheduled){
    stage='FOUNDING_MEETING_READY';
    nextAction='اقتراح أقرب موعد مناسب للاجتماع المالي التأسيسي وتأكيده مع المستخدم.';
  }else if(detailComplete&&meetingScheduled&&!cycleActive){
    stage='BUDGET_PREPARATION';
    nextAction='إعداد الميزانية الشهرية والأهداف وحدود الصرف وخطة توزيع الحسابات.';
  }else if(cycleActive){
    stage=refreshDue?'NEXT_CYCLE_REFRESH':'ACTIVE_CYCLE';
    nextAction=refreshDue
      ?'بدء تحديث بيانات الشهر القادم وبناء الميزانية الجديدة مقدمًا.'
      :'متابعة الصرف الفعلي والتنبيه الفوري على الانحرافات والمراجعة الأسبوعية.';
  }

  return {
    stage,
    completion_percent:completion,
    foundation_complete:foundationComplete,
    detailed_profile_complete:detailComplete,
    reviewed_sections:reviewedSections,
    total_sections:totalSections,
    section_progress:sectionProgress,
    missing_sections:missingSections,
    next_section:nextSectionProgress?{key:nextSectionProgress.key,title:nextSectionProgress.title}:null,
    next_field:nextSectionProgress&&firstMissing
      ?{section_key:nextSectionProgress.key,section_title:nextSectionProgress.title,key:firstMissing.key,label:firstMissing.label}
      :null,
    founding_meeting_eligible:detailComplete,
    founding_meeting_proposed_at:proposedAt,
    salary_cycle_active:cycleActive,
    monthly_refresh_due:refreshDue,
    next_action:nextAction,
  };
}
