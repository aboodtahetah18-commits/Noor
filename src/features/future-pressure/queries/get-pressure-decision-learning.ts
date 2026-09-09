import { rawSql } from '@/infrastructure/db/client';

export type PressureDecisionLearningSummary={
  scenarioKind:string;observations:number;resolvedPackages:number;reducedPackages:number;shiftedPackages:number;worsenedPackages:number;mixedPackages:number;
  observedCommittedRelief:string;observedTripRelief:string;observedShiftedTripGap:string;interpretation:string;
};

const label:Record<string,string>={
  RESERVE_UNASSIGNED_GOAL_FUNDS:'حجز رصيد غير مخصص داخل الهدف',
  DEFER_TRIP_ONE_CYCLE:'تأجيل رحلة دورة واحدة',
  REDUCE_GOAL_CONTRIBUTION_ONE_CYCLE:'خفض مساهمة هدف لدورة واحدة',
  REDIRECT_CURRENT_FLEXIBLE_HEADROOM:'إعادة توجيه رصيد مرن حالي',
};

type LearningRow=Record<string,unknown>;

export async function getPressureDecisionLearning(userId:string):Promise<PressureDecisionLearningSummary[]>{
  const rows=await rawSql`
    select scenario_kind as "scenarioKind",count(*)::int as observations,
      count(*) filter(where package_outcome_class='RESOLVED')::int as "resolvedPackages",
      count(*) filter(where package_outcome_class='REDUCED')::int as "reducedPackages",
      count(*) filter(where package_outcome_class='SHIFTED')::int as "shiftedPackages",
      count(*) filter(where package_outcome_class='WORSENED')::int as "worsenedPackages",
      count(*) filter(where package_outcome_class='MIXED')::int as "mixedPackages",
      coalesce(sum(observed_package_committed_relief),0)::text as "observedCommittedRelief",
      coalesce(sum(observed_package_trip_gap_relief),0)::text as "observedTripRelief",
      coalesce(sum(observed_shifted_trip_gap),0)::text as "observedShiftedTripGap"
    from public.financial_pressure_decision_learning_observations
    where user_id=${userId}::uuid
    group by scenario_kind order by count(*) desc,scenario_kind`;
  return (rows as LearningRow[]).map(row=>{
    const observations=Number(row.observations??0),resolved=Number(row.resolvedPackages??0),reduced=Number(row.reducedPackages??0),shifted=Number(row.shiftedPackages??0),worsened=Number(row.worsenedPackages??0);
    let interpretation='لا توجد ملاحظات كافية لبناء نمط ثابت.';
    if(observations>=2){
      if(worsened>resolved+reduced)interpretation='ظهر هذا القرار غالبًا داخل حزم لم تحسن الضغط؛ يحتاج حذرًا ومراجعة السياق.';
      else if(shifted>resolved+reduced)interpretation='ظهر غالبًا كحل زمني ينقل الضغط أكثر مما يحله ماليًا.';
      else if(resolved+reduced>0)interpretation='ظهر داخل حزم خففت أو حلت الضغط، لكن لا يجوز اعتباره السبب المنفرد دون دليل إضافي.';
    }
    return {scenarioKind:String(row.scenarioKind),observations,resolvedPackages:resolved,reducedPackages:reduced,shiftedPackages:shifted,worsenedPackages:worsened,mixedPackages:Number(row.mixedPackages??0),observedCommittedRelief:String(row.observedCommittedRelief??'0.00'),observedTripRelief:String(row.observedTripRelief??'0.00'),observedShiftedTripGap:String(row.observedShiftedTripGap??'0.00'),interpretation:`${label[String(row.scenarioKind)]??String(row.scenarioKind)}: ${interpretation}`};
  });
}
