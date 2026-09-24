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

export type FinancialJourneyStatus={
  stage:FinancialJourneyStage;
  completion_percent:number;
  foundation_complete:boolean;
  detailed_profile_complete:boolean;
  reviewed_sections:number;
  total_sections:number;
  missing_sections:Array<{key:string;title:string}>;
  next_section:{key:string;title:string}|null;
  founding_meeting_eligible:boolean;
  founding_meeting_proposed_at:string|null;
  salary_cycle_active:boolean;
  monthly_refresh_due:boolean;
  next_action:string;
};

function addHours(date:Date,hours:number){
  return new Date(date.getTime()+hours*60*60*1000);
}

export async function getFinancialJourneyStatus(userId:string):Promise<FinancialJourneyStatus>{
  const sql=getRawSql();
  const [stateRows,factRows,meetingRows,cycleRows]=await Promise.all([
    sql`select status,completed_at,updated_at from public.user_onboarding_state where user_id=${userId}::uuid limit 1`,
    sql`select fact_key,verified_at,updated_at from public.user_foundation_facts
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
  const reviewed=new Set(
    factRows
      .map(row=>String(row.fact_key??'').replace(/^extended:/,''))
      .filter(Boolean),
  );
  const missingSections=extendedProfileSections
    .filter(section=>!reviewed.has(section.key))
    .map(section=>({key:section.key,title:section.title}));
  const totalSections=extendedProfileSections.length;
  const reviewedSections=totalSections-missingSections.length;
  const detailComplete=foundationComplete&&missingSections.length===0;

  // التأسيس الأساسي يمثل نصف الجاهزية، والنصف الآخر لمراجعة جميع أقسام الملف التفصيلي.
  const foundationWeight=foundationComplete?50:0;
  const detailWeight=totalSections>0?Math.round((reviewedSections/totalSections)*50):50;
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

  let stage:FinancialJourneyStage='FOUNDATION';
  let nextAction='استكمال بيانات التأسيس الأساسية مع المحافظ.';
  if(foundationComplete&&!detailComplete){
    stage='DETAILED_PROFILE';
    nextAction=missingSections[0]
      ?`استكمال قسم «${missingSections[0].title}» ثم متابعة بقية التفاصيل.`
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
    missing_sections:missingSections,
    next_section:missingSections[0]??null,
    founding_meeting_eligible:detailComplete,
    founding_meeting_proposed_at:proposedAt,
    salary_cycle_active:cycleActive,
    monthly_refresh_due:refreshDue,
    next_action:nextAction,
  };
}
