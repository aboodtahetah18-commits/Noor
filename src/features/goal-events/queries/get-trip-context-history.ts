import { rawSql } from '@/infrastructure/db/client';

export const TRIP_CONTEXT_LABELS:Record<string,string>={
  STANDARD:'رحلة عادية',OCCASION:'مناسبة',WORK:'عمل',FAMILY:'رحلة عائلية',LONG_STAY:'إقامة طويلة',MEDICAL:'ظرف صحي',OTHER:'نوع مخصص'
};

export type TripContextHistory={
  contextCode:string;
  contextName:string|null;
  label:string;
  benchmarkTrips:number;
  averageAmount:string|null;
  minimumAmount:string|null;
  maximumAmount:string|null;
};

export async function getTripContextHistoriesForCity(userId:string,destinationCity:string):Promise<TripContextHistory[]>{
  const city=destinationCity.trim();if(!city)return[];
  const rows=await rawSql`
    select x.context_code as "contextCode",x.context_name as "contextName",count(*)::int as count,
      avg(x.actual_amount)::numeric(18,2)::text as avg,min(x.actual_amount)::numeric(18,2)::text as min,max(x.actual_amount)::numeric(18,2)::text as max
    from (
      select e.id,coalesce(e.trip_context_code,'STANDARD') as context_code,
        case when e.trip_context_code='OTHER' then nullif(trim(e.trip_context_name),'') else null end as context_name,
        coalesce(sum(l.amount),0)::numeric as actual_amount
      from public.goal_events e
      left join public.goal_event_transaction_links l on l.goal_event_id=e.id and l.user_id=e.user_id
      where e.user_id=${userId} and e.event_type='TRIP' and e.status='CLOSED' and e.benchmark_eligible=true
        and lower(trim(coalesce(e.destination_city,'')))=lower(trim(${city}))
      group by e.id
    ) x
    group by x.context_code,x.context_name
    order by count(*) desc,x.context_code`;
  return rows.map(r=>({
    contextCode:String(r.contextCode),contextName:r.contextName?String(r.contextName):null,
    label:String(r.contextCode)==='OTHER'&&r.contextName?String(r.contextName):(TRIP_CONTEXT_LABELS[String(r.contextCode)]??String(r.contextCode)),
    benchmarkTrips:Number(r.count??0),averageAmount:r.avg?String(r.avg):null,minimumAmount:r.min?String(r.min):null,maximumAmount:r.max?String(r.max):null
  }));
}
