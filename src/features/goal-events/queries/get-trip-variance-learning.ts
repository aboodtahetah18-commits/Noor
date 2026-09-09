import { Money } from '@/financial-engine/money';
import { rawSql } from '@/infrastructure/db/client';

export const TRIP_VARIANCE_REASON_LABELS:Record<string,string>={
  MORE_PEOPLE:'زيادة عدد الأشخاص',
  LONGER_STAY:'زيادة مدة الرحلة',
  EXTRA_OCCASION_ACTIVITY:'مناسبة أو نشاط إضافي',
  PRICE_CHANGE:'تغير الأسعار',
  ROUTE_TRANSPORT_CHANGE:'تغير المسار أو التنقل',
  UNPLANNED_PURCHASE:'شراء غير مخطط',
  UPGRADE_CHOICE:'اختيار مستوى أعلى',
  OTHER:'سبب آخر',
};

export type TripVarianceReasonSignal={
  code:string;
  label:string;
  count:number;
  latestNote:string|null;
};

export type TripCategoryVarianceLearning={
  categoryId:string;
  categoryName:string;
  comparableTrips:number;
  abovePlanTrips:number;
  averagePlanned:string;
  averageActual:string;
  averageVariance:string;
  averagePositiveVariance:string|null;
  reasons:TripVarianceReasonSignal[];
};

export type TripVarianceLearning={
  destinationCity:string;
  contextCode:string;
  contextName:string|null;
  scope:'CITY_CONTEXT';
  comparableTrips:number;
  categories:TripCategoryVarianceLearning[];
};

export async function getTripVarianceLearning(
  userId:string,
  destinationCity:string,
  contextCode:string,
  contextName?:string|null,
):Promise<TripVarianceLearning>{
  const city=destinationCity.trim();
  const context=contextCode.trim()||'STANDARD';
  const custom=context==='OTHER'?(contextName??'').trim():'';
  if(!city)return{destinationCity:city,contextCode:context,contextName:custom||null,scope:'CITY_CONTEXT',comparableTrips:0,categories:[]};

  const rows=await rawSql`
    select e.id as "eventId",p.category_id as "categoryId",c.name as "categoryName",
      p.planned_amount::text as "plannedAmount",
      coalesce(sum(l.amount),0)::numeric(18,2)::text as "actualAmount",
      p.variance_reason_code as "reasonCode",p.variance_reason as "reasonNote",p.variance_reviewed_at as "reasonReviewedAt"
    from public.goal_events e
    join public.goal_event_category_plans p on p.goal_event_id=e.id and p.user_id=e.user_id
    join public.budget_categories c on c.id=p.category_id and c.user_id=p.user_id
    left join public.goal_event_transaction_links l on l.goal_event_id=e.id and l.user_id=e.user_id and l.category_id=p.category_id
    where e.user_id=${userId} and e.event_type='TRIP' and e.status='CLOSED' and e.benchmark_eligible=true
      and lower(trim(coalesce(e.destination_city,'')))=lower(trim(${city}))
      and coalesce(e.trip_context_code,'STANDARD')=${context}
      and (${context}<>'OTHER' or coalesce(trim(e.trip_context_name),'')=${custom})
    group by e.id,p.id,c.name
    order by e.starts_at desc nulls last,e.created_at desc`;

  const eventIds=new Set<string>();
  const grouped=new Map<string,{categoryId:string;categoryName:string;planned:Money;actual:Money;above:number;positiveVariance:Money;rowCount:number;reasonRows:Array<{code:string;note:string|null;reviewedAt:number}>}>();
  for(const raw of rows){
    const eventId=String(raw.eventId);eventIds.add(eventId);
    const categoryId=String(raw.categoryId);const planned=Money.parse(String(raw.plannedAmount??'0.00'));const actual=Money.parse(String(raw.actualAmount??'0.00'));const variance=actual.subtract(planned);
    const current=grouped.get(categoryId)??{categoryId,categoryName:String(raw.categoryName),planned:Money.zero(),actual:Money.zero(),above:0,positiveVariance:Money.zero(),rowCount:0,reasonRows:[]};
    current.planned=current.planned.add(planned);current.actual=current.actual.add(actual);current.rowCount+=1;
    if(variance.isPositive()){current.above+=1;current.positiveVariance=current.positiveVariance.add(variance);}
    if(raw.reasonCode){current.reasonRows.push({code:String(raw.reasonCode),note:raw.reasonNote?String(raw.reasonNote):null,reviewedAt:raw.reasonReviewedAt?new Date(String(raw.reasonReviewedAt)).getTime():0});}
    grouped.set(categoryId,current);
  }

  const categories:TripCategoryVarianceLearning[]=[];
  for(const item of grouped.values()){
    const comparable=item.rowCount;
    const reasonGroups=new Map<string,{count:number;latestNote:string|null;latestAt:number}>();
    for(const rr of item.reasonRows){const existing=reasonGroups.get(rr.code)??{count:0,latestNote:null,latestAt:0};existing.count++;if(rr.reviewedAt>=existing.latestAt){existing.latestAt=rr.reviewedAt;existing.latestNote=rr.note;}reasonGroups.set(rr.code,existing);}
    const reasons=[...reasonGroups.entries()].map(([code,v])=>({code,label:TRIP_VARIANCE_REASON_LABELS[code]??code,count:v.count,latestNote:v.latestNote})).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label,'ar'));
    const average=(value:Money,count:number)=>count>0?Money.fromMinorUnits((value.minorUnits+BigInt(Math.floor(count/2)))/BigInt(count)):Money.zero();
    categories.push({
      categoryId:item.categoryId,categoryName:item.categoryName,comparableTrips:comparable,abovePlanTrips:item.above,
      averagePlanned:average(item.planned,comparable).toString(),averageActual:average(item.actual,comparable).toString(),
      averageVariance:average(item.actual.subtract(item.planned),comparable).toString(),
      averagePositiveVariance:item.above>0?average(item.positiveVariance,item.above).toString():null,reasons,
    });
  }
  categories.sort((a,b)=>{const count=b.abovePlanTrips-a.abovePlanTrips;if(count!==0)return count;const variance=Money.parse(b.averageVariance).abs().compare(Money.parse(a.averageVariance).abs());return variance!==0?variance:a.categoryName.localeCompare(b.categoryName,'ar');});
  return{destinationCity:city,contextCode:context,contextName:custom||null,scope:'CITY_CONTEXT',comparableTrips:eventIds.size,categories};
}
