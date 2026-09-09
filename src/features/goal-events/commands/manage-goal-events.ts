import { rawSql } from '@/infrastructure/db/client';
import { Money } from '@/financial-engine/money';
const TRIP_CONTEXTS=new Set(['STANDARD','OCCASION','WORK','FAMILY','LONG_STAY','MEDICAL','OTHER']);
const TRIP_VARIANCE_REASONS=new Set(['MORE_PEOPLE','LONGER_STAY','EXTRA_OCCASION_ACTIVITY','PRICE_CHANGE','ROUTE_TRANSPORT_CHANGE','UNPLANNED_PURCHASE','UPGRADE_CHOICE','OTHER']);
export async function createGoalEvent(userId:string,input:{goalId:string;title:string;destinationCity?:string|null;startsAt?:string|null;endsAt?:string|null;plannedAmount?:string|null;tripContextCode?:string|null;tripContextName?:string|null}){if(!input.title.trim())throw new Error('أدخل اسم الرحلة أو الحدث.');let plannedAmount:string|null=null;if(input.plannedAmount?.trim()){const parsed=Money.parse(input.plannedAmount.trim().replace(/,/g,''));if(parsed.isNegative())throw new Error('المبلغ المخطط غير صالح.');plannedAmount=parsed.toString();}const context=input.tripContextCode?.trim()||'STANDARD';if(!TRIP_CONTEXTS.has(context))throw new Error('نوع الرحلة غير صالح.');if(context==='OTHER'&&!input.tripContextName?.trim())throw new Error('اكتب اسم نوع الرحلة المخصص.');const g=await rawSql`select id from public.financial_goals where id=${input.goalId}::uuid and user_id=${userId} limit 1`;if(!g[0])throw new Error('الهدف غير موجود.');const r=await rawSql`insert into public.goal_events(user_id,goal_id,event_type,title,destination_city,starts_at,ends_at,planned_amount,status,trip_context_code,trip_context_name) values(${userId},${input.goalId},'TRIP',${input.title.trim()},${input.destinationCity??null},${input.startsAt??null},${input.endsAt??null},${plannedAmount},'PLANNED',${context},${context==='OTHER'?input.tripContextName?.trim()||null:null}) returning id`;return String(r[0]?.id)}
export async function linkGoalEventTransaction(userId:string,input:{eventId:string;bankStatementRowId:string}){const rows=await rawSql`select e.id,e.goal_id as "goalId",r.id as "rowId",r.final_transaction_id as "transactionId",r.category_id as "categoryId",r.amount::text from public.goal_events e cross join public.bank_statement_rows r where e.id=${input.eventId}::uuid and e.user_id=${userId} and r.id=${input.bankStatementRowId}::uuid and r.user_id=${userId} limit 1`;const r=rows[0];if(!r)throw new Error('الرحلة أو العملية غير موجودة.');await rawSql`insert into public.goal_event_transaction_links(user_id,goal_id,goal_event_id,transaction_id,bank_statement_row_id,category_id,amount,link_source,confidence) values(${userId},${r.goalId},${input.eventId},${r.transactionId??null},${r.rowId},${r.categoryId??null},${r.amount},'USER_CONFIRMED',100) on conflict(user_id,bank_statement_row_id) where bank_statement_row_id is not null do nothing`}
export async function closeGoalEvent(userId:string,eventId:string){const rows=await rawSql`update public.goal_events set status='CLOSED',updated_at=now() where id=${eventId}::uuid and user_id=${userId} and status in ('PLANNED','ACTIVE') returning goal_id as "goalId"`;if(!rows[0])throw new Error('الرحلة غير متاحة للإغلاق.');return String(rows[0].goalId)}
export async function setGoalEventBenchmark(userId:string,input:{eventId:string;eligible:boolean;note?:string|null}){const rows=await rawSql`update public.goal_events set benchmark_eligible=${input.eligible},benchmark_note=${input.note?.trim()||null},updated_at=now() where id=${input.eventId}::uuid and user_id=${userId} and event_type='TRIP' returning goal_id as "goalId"`;if(!rows[0])throw new Error('الرحلة غير موجودة.');return String(rows[0].goalId)}

export async function startGoalEvent(userId:string,eventId:string){
  const rows=await rawSql`update public.goal_events set status='ACTIVE',updated_at=now()
    where id=${eventId}::uuid and user_id=${userId} and status='PLANNED' returning goal_id as "goalId"`;
  if(!rows[0])throw new Error('الرحلة غير متاحة للبدء.');
  return String(rows[0].goalId);
}

export async function seedTripPlanFromHistory(userId:string,eventId:string){
  const events=await rawSql`select id,goal_id as "goalId",destination_city as "destinationCity",status,coalesce(trip_context_code,'STANDARD') as "tripContextCode",trip_context_name as "tripContextName" from public.goal_events
    where id=${eventId}::uuid and user_id=${userId} and event_type='TRIP' limit 1`;
  const event=events[0];if(!event)throw new Error('الرحلة غير موجودة.');
  if(event.status==='CLOSED')throw new Error('لا يمكن تغيير خطة رحلة مغلقة.');
  const city=String(event.destinationCity??'').trim();if(!city)throw new Error('حدد مدينة الرحلة أولًا حتى يمكن استخدام المرجع التاريخي.');
  const context=String(event.tripContextCode??'STANDARD');const custom=String(event.tripContextName??'').trim();
  const exactCountRows=await rawSql`select count(*)::int count from public.goal_events e
    where e.user_id=${userId} and e.event_type='TRIP' and e.status='CLOSED' and e.benchmark_eligible=true
      and lower(trim(coalesce(e.destination_city,'')))=lower(trim(${city}))
      and coalesce(e.trip_context_code,'STANDARD')=${context}
      and (${context}<>'OTHER' or coalesce(trim(e.trip_context_name),'')=${custom})`;
  const exactCount=Number(exactCountRows[0]?.count??0);
  const scope=exactCount>0?'CITY_CONTEXT':'CITY_ONLY';
  const countRows=scope==='CITY_CONTEXT'?exactCountRows:await rawSql`select count(*)::int count from public.goal_events e
    where e.user_id=${userId} and e.event_type='TRIP' and e.status='CLOSED' and e.benchmark_eligible=true
      and lower(trim(coalesce(e.destination_city,'')))=lower(trim(${city}))`;
  const count=Number(countRows[0]?.count??0);if(count<1)throw new Error('لا توجد رحلة مرجعية مكتملة لهذه المدينة.');
  const refs=scope==='CITY_CONTEXT'?await rawSql`select l.category_id as "categoryId",(sum(l.amount)/${count})::numeric(18,2)::text as amount
    from public.goal_events e join public.goal_event_transaction_links l on l.goal_event_id=e.id and l.user_id=e.user_id
    where e.user_id=${userId} and e.event_type='TRIP' and e.status='CLOSED' and e.benchmark_eligible=true
      and lower(trim(coalesce(e.destination_city,'')))=lower(trim(${city})) and l.category_id is not null
      and coalesce(e.trip_context_code,'STANDARD')=${context}
      and (${context}<>'OTHER' or coalesce(trim(e.trip_context_name),'')=${custom})
    group by l.category_id`:await rawSql`select l.category_id as "categoryId",(sum(l.amount)/${count})::numeric(18,2)::text as amount
    from public.goal_events e join public.goal_event_transaction_links l on l.goal_event_id=e.id and l.user_id=e.user_id
    where e.user_id=${userId} and e.event_type='TRIP' and e.status='CLOSED' and e.benchmark_eligible=true
      and lower(trim(coalesce(e.destination_city,'')))=lower(trim(${city})) and l.category_id is not null
    group by l.category_id`;
  if(!refs.length)throw new Error('الرحلات المرجعية لا تحتوي بنودًا مصنفة يمكن بناء خطة منها.');
  for(const raw of refs){
    await rawSql`insert into public.goal_event_category_plans(user_id,goal_id,goal_event_id,category_id,planned_amount,plan_source,historical_reference_amount,source_benchmark_trip_count,historical_reference_scope)
      values(${userId},${event.goalId},${eventId},${raw.categoryId},${raw.amount},'HISTORICAL_REFERENCE',${raw.amount},${count},${scope})
      on conflict(user_id,goal_event_id,category_id) do update set planned_amount=excluded.planned_amount,plan_source='HISTORICAL_REFERENCE',historical_reference_amount=excluded.historical_reference_amount,source_benchmark_trip_count=excluded.source_benchmark_trip_count,historical_reference_scope=excluded.historical_reference_scope,updated_at=now()`;
  }
  const totalRows=await rawSql`select coalesce(sum(planned_amount),0)::numeric(18,2)::text total from public.goal_event_category_plans where user_id=${userId} and goal_event_id=${eventId}::uuid`;
  const total=String(totalRows[0]?.total??'0');
  await rawSql`update public.goal_events set planned_amount=${total},updated_at=now() where id=${eventId}::uuid and user_id=${userId}`;
  return {scope,count};
}

export async function updateTripCategoryPlan(userId:string,input:{eventId:string;categoryId:string;plannedAmount:string}){
  let plannedAmount:Money;
  try{plannedAmount=Money.parse(input.plannedAmount.trim().replace(/,/g,''));}catch{throw new Error('المبلغ المخطط غير صالح.');}
  if(plannedAmount.isNegative())throw new Error('المبلغ المخطط غير صالح.');
  const rows=await rawSql`select e.goal_id as "goalId" from public.goal_events e join public.budget_categories c on c.id=${input.categoryId}::uuid and c.user_id=e.user_id
    where e.id=${input.eventId}::uuid and e.user_id=${userId} and e.status<>'CLOSED' limit 1`;
  if(!rows[0])throw new Error('الرحلة أو البند غير متاح للتخطيط.');
  await rawSql`insert into public.goal_event_category_plans(user_id,goal_id,goal_event_id,category_id,planned_amount,plan_source)
    values(${userId},${rows[0].goalId},${input.eventId},${input.categoryId},${plannedAmount.toString()},'MANUAL')
    on conflict(user_id,goal_event_id,category_id) do update set planned_amount=excluded.planned_amount,plan_source='MANUAL',updated_at=now()`;
  const totalRows=await rawSql`select coalesce(sum(planned_amount),0)::numeric(18,2)::text total from public.goal_event_category_plans where user_id=${userId} and goal_event_id=${input.eventId}::uuid`;
  await rawSql`update public.goal_events set planned_amount=${String(totalRows[0]?.total??'0')},updated_at=now() where id=${input.eventId}::uuid and user_id=${userId}`;
}

export async function saveTripVarianceReason(userId:string,input:{eventId:string;categoryId:string;reasonCode:string;reasonNote?:string|null}){
  const reasonCode=input.reasonCode.trim();if(!TRIP_VARIANCE_REASONS.has(reasonCode))throw new Error('اختر سبب انحراف صالحًا.');
  const note=input.reasonNote?.trim()||null;if(reasonCode==='OTHER'&&!note)throw new Error('اكتب توضيح السبب الآخر.');
  const rows=await rawSql`update public.goal_event_category_plans set variance_reason_code=${reasonCode},variance_reason=${note},variance_reviewed_at=now(),updated_at=now()
    where user_id=${userId} and goal_event_id=${input.eventId}::uuid and category_id=${input.categoryId}::uuid returning goal_id as "goalId"`;
  if(!rows[0])throw new Error('بند الرحلة غير موجود.');
}

export async function updateGoalEventContext(userId:string,input:{eventId:string;tripContextCode:string;tripContextName?:string|null}){
  const context=input.tripContextCode.trim();if(!TRIP_CONTEXTS.has(context))throw new Error('نوع الرحلة غير صالح.');if(context==='OTHER'&&!input.tripContextName?.trim())throw new Error('اكتب اسم النوع المخصص.');
  const rows=await rawSql`update public.goal_events set trip_context_code=${context},trip_context_name=${context==='OTHER'?input.tripContextName?.trim()||null:null},updated_at=now() where id=${input.eventId}::uuid and user_id=${userId} and event_type='TRIP' and status<>'CLOSED' returning goal_id as "goalId"`;
  if(!rows[0])throw new Error('لا يمكن تغيير نوع رحلة مغلقة أو غير موجودة.');
  return String(rows[0].goalId);
}

export async function reserveGoalFundingForTrip(userId:string,input:{eventId:string;reservedAmount:string;notes?:string|null}){
  const amount=input.reservedAmount.trim().replace(/,/g,'');
  if(!/^\d+(?:\.\d{1,2})?$/.test(amount))throw new Error('مبلغ الحجز غير صالح.');
  const events=await rawSql`select e.id,e.goal_id as "goalId",e.status,g.opening_balance::text as "openingBalance",
    coalesce(sum(t.amount) filter(where t.transaction_type='GOAL_CONTRIBUTION' and t.status='POSTED'),0)::text as contributions
    from public.goal_events e join public.financial_goals g on g.id=e.goal_id and g.user_id=e.user_id
    left join public.transactions t on t.goal_id=g.id and t.user_id=g.user_id
    where e.id=${input.eventId}::uuid and e.user_id=${userId} group by e.id,g.id limit 1`;
  const event=events[0];if(!event)throw new Error('الرحلة غير موجودة.');if(event.status==='CLOSED'||event.status==='CANCELLED')throw new Error('لا يمكن حجز تمويل لرحلة مغلقة أو ملغاة.');
  const other=await rawSql`select coalesce(sum(r.reserved_amount),0)::text total from public.goal_event_funding_reservations r
    join public.goal_events e on e.id=r.goal_event_id and e.user_id=r.user_id
    where r.user_id=${userId} and r.goal_id=${event.goalId}::uuid and r.goal_event_id<>${input.eventId}::uuid and r.status='ACTIVE' and e.status in ('PLANNED','ACTIVE')`;
  const goalBalance=Money.parse(String(event.openingBalance)).add(Money.parse(String(event.contributions)));
  const otherReserved=Money.parse(String(other[0]?.total??'0'));
  const requested=Money.parse(amount);
  if(requested.isNegative())throw new Error('مبلغ الحجز غير صالح.');
  if(requested.compare(goalBalance.subtract(otherReserved))>0)throw new Error('المبلغ المطلوب يتجاوز رصيد الهدف غير المحجوز للرحلات الأخرى.');
  await rawSql`insert into public.goal_event_funding_reservations(user_id,goal_id,goal_event_id,reserved_amount,status,notes)
    values(${userId},${event.goalId},${input.eventId},${requested.toString()},'ACTIVE',${input.notes?.trim()||null})
    on conflict(user_id,goal_event_id) do update set reserved_amount=excluded.reserved_amount,status='ACTIVE',notes=excluded.notes,updated_at=now()`;
  const {syncApprovedPressureDecisionPackagesForUser}=await import('@/features/future-pressure/commands/manage-pressure-decision-packages');
  await syncApprovedPressureDecisionPackagesForUser(userId);
}

export async function updateGoalEventSchedule(userId:string,input:{eventId:string;startsAt:string;endsAt?:string|null}){
  if(!input.startsAt.trim())throw new Error('حدد تاريخ بداية الرحلة.');
  const start=new Date(input.startsAt);if(Number.isNaN(start.getTime()))throw new Error('تاريخ بداية الرحلة غير صالح.');
  const end=input.endsAt?.trim()?new Date(input.endsAt):null;if(end&&Number.isNaN(end.getTime()))throw new Error('تاريخ نهاية الرحلة غير صالح.');if(end&&end.getTime()<start.getTime())throw new Error('تاريخ نهاية الرحلة يجب أن يكون بعد البداية.');
  const rows=await rawSql`update public.goal_events set starts_at=${start.toISOString()},ends_at=${end?end.toISOString():null},updated_at=now() where id=${input.eventId}::uuid and user_id=${userId}::uuid and event_type='TRIP' and status in ('PLANNED','ACTIVE') returning goal_id as "goalId"`;
  if(!rows[0])throw new Error('الرحلة غير موجودة أو لا تسمح بتعديل الموعد.');
  const {syncApprovedPressureDecisionPackagesForUser}=await import('@/features/future-pressure/commands/manage-pressure-decision-packages');
  await syncApprovedPressureDecisionPackagesForUser(userId);
  return String(rows[0].goalId);
}
