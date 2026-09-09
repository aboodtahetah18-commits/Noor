import { Money, sumMoney } from '@/financial-engine/money';
import { calculatePercentage } from '@/financial-engine/percentage';
import { rawSql } from '@/infrastructure/db/client';

export type TripPlanProgressItem = {
  categoryId:string; categoryName:string; plannedAmount:string; actualAmount:string; remainingAmount:string; varianceAmount:string; utilizationPercent:number|null;
  planSource:'MANUAL'|'HISTORICAL_REFERENCE'; historicalReferenceAmount:string|null; historicalReferenceScope:'CITY_CONTEXT'|'CITY_ONLY'|null;
  historicalVarianceAmount:string|null; sourceBenchmarkTripCount:number; varianceReasonCode:string|null; varianceReason:string|null; needsExplanation:boolean;
};
export type TripPlanProgress = {
  eventId:string; eventTitle:string; eventStatus:string; destinationCity:string|null; overallPlannedAmount:string|null; plannedCategoryTotal:string;
  actualTotal:string; remainingTotal:string|null; utilizationPercent:number|null; items:TripPlanProgressItem[];
};
function pct(actual:Money,planned:Money){return planned.isPositive()?Number(calculatePercentage(actual.minorUnits,planned.minorUnits)?.percent??'0'):null;}

export async function getTripPlanProgress(userId:string,eventId:string):Promise<TripPlanProgress|null>{
  const events=await rawSql`select id,title,status,destination_city as "destinationCity",planned_amount::text as "plannedAmount"
    from public.goal_events where id=${eventId}::uuid and user_id=${userId} limit 1`;
  const event=events[0];if(!event)return null;
  const rows=await rawSql`select p.category_id as "categoryId",c.name as "categoryName",p.planned_amount::text as "plannedAmount",
      p.plan_source as "planSource",p.historical_reference_amount::text as "historicalReferenceAmount",
      p.source_benchmark_trip_count as "sourceBenchmarkTripCount",p.historical_reference_scope as "historicalReferenceScope",p.variance_reason_code as "varianceReasonCode",p.variance_reason as "varianceReason",
      coalesce(sum(l.amount),0)::numeric(18,2)::text as "actualAmount"
    from public.goal_event_category_plans p
    join public.budget_categories c on c.id=p.category_id and c.user_id=p.user_id
    left join public.goal_event_transaction_links l on l.goal_event_id=p.goal_event_id and l.user_id=p.user_id and l.category_id=p.category_id
    where p.user_id=${userId} and p.goal_event_id=${eventId}::uuid
    group by p.id,c.name order by p.planned_amount desc,c.name`;
  const actualRows=await rawSql`select coalesce(sum(l.amount),0)::numeric(18,2)::text as total from public.goal_event_transaction_links l where l.user_id=${userId} and l.goal_event_id=${eventId}::uuid`;
  const items:TripPlanProgressItem[]=rows.map((r)=>{
    const planned=Money.parse(String(r.plannedAmount??'0.00'));const actual=Money.parse(String(r.actualAmount??'0.00'));
    const reference=r.historicalReferenceAmount==null?null:Money.parse(String(r.historicalReferenceAmount));const variance=actual.subtract(planned);
    return {categoryId:String(r.categoryId),categoryName:String(r.categoryName),plannedAmount:planned.toString(),actualAmount:actual.toString(),remainingAmount:planned.subtract(actual).max(Money.zero()).toString(),varianceAmount:variance.toString(),utilizationPercent:pct(actual,planned),planSource:String(r.planSource) as 'MANUAL'|'HISTORICAL_REFERENCE',historicalReferenceAmount:reference?.toString()??null,historicalReferenceScope:r.historicalReferenceScope?String(r.historicalReferenceScope) as 'CITY_CONTEXT'|'CITY_ONLY':null,historicalVarianceAmount:reference?actual.subtract(reference).toString():null,sourceBenchmarkTripCount:Number(r.sourceBenchmarkTripCount??0),varianceReasonCode:r.varianceReasonCode?String(r.varianceReasonCode):null,varianceReason:r.varianceReason?String(r.varianceReason):null,needsExplanation:variance.isPositive()&&!r.varianceReasonCode};
  });
  const plannedTotal=sumMoney(items.map((item)=>Money.parse(item.plannedAmount)));const actualTotal=Money.parse(String(actualRows[0]?.total??'0.00'));
  const overall=event.plannedAmount==null?null:Money.parse(String(event.plannedAmount));
  return {eventId:String(event.id),eventTitle:String(event.title),eventStatus:String(event.status),destinationCity:event.destinationCity?String(event.destinationCity):null,overallPlannedAmount:overall?.toString()??null,plannedCategoryTotal:plannedTotal.toString(),actualTotal:actualTotal.toString(),remainingTotal:overall?overall.subtract(actualTotal).max(Money.zero()).toString():null,utilizationPercent:pct(actualTotal,overall??plannedTotal),items};
}
