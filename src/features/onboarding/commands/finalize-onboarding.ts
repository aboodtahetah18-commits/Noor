import { randomUUID } from 'node:crypto';
import { rawSql } from '@/infrastructure/db/client';
import { getOnboardingStatus } from '../queries/get-onboarding-status';
import { transition } from '@/state-machines';

export async function finalizeOnboarding(userId:string){
  const s=await getOnboardingStatus(userId);
  if(!s.cycleId)return{success:false as const,message:'الدورة الأولى غير موجودة'};
  if(s.planStatus!=='ACTIVE_PLAN')return{success:false as const,message:'اعتمد الخطة الأولى قبل إنهاء الإعداد'};
  if(s.cycleStatus==='ACTIVE'){
    await rawSql.transaction([
      rawSql`update public.obligation_occurrences o set cycle_id=c.id,is_reserved=(o.status in ('UPCOMING','DUE','OVERDUE') and o.due_date<=c.expected_next_income_date),updated_at=now()
        from public.financial_cycles c where c.id=${s.cycleId}::uuid and c.user_id=${userId} and c.status='ACTIVE' and o.user_id=${userId} and o.cycle_id is null and o.due_date between c.start_date and c.expected_next_income_date returning o.id`,
      rawSql`insert into public.onboarding_progress(user_id,current_step,obligations_reviewed,controls_reviewed,completed_at) values(${userId},6,true,true,now())
        on conflict(user_id) do update set current_step=6,completed_at=coalesce(public.onboarding_progress.completed_at,now()),updated_at=now() returning user_id`
    ]);
    return{success:true as const};
  }
  if(s.cycleStatus!=='DRAFT')return{success:false as const,message:'لا يمكن إنهاء الإعداد من حالة الدورة الحالية'};
  const cycleRows=await rawSql`select id,start_date::text,expected_next_income_date::text,status from public.financial_cycles where id=${s.cycleId}::uuid and user_id=${userId} limit 1`;
  const cycle=cycleRows[0];
  if(!cycle)return{success:false as const,message:'الدورة الأولى غير موجودة'};
  try{
    transition({entityType:'FINANCIAL_CYCLE',entityId:s.cycleId,currentState:'DRAFT',event:'ACTIVATE_CYCLE',actorUserId:userId,preconditions:[{code:'HAS_START_DATE',satisfied:Boolean(cycle.start_date)},{code:'HAS_NEXT_INCOME_DATE',satisfied:Boolean(cycle.expected_next_income_date)}]});
    const auditId=randomUUID();
    const res=await rawSql.transaction([
      rawSql`update public.financial_cycles set status='ACTIVE',activated_at=now(),updated_at=now() where id=${s.cycleId}::uuid and user_id=${userId} and status='DRAFT' and exists(select 1 from public.financial_plans p where p.cycle_id=${s.cycleId}::uuid and p.user_id=${userId} and p.status='ACTIVE_PLAN') returning id`,
      rawSql`insert into public.state_transition_logs(id,user_id,entity_type,entity_id,from_state,to_state,event,reason)
        select ${auditId},${userId},'FINANCIAL_CYCLE',${s.cycleId},'DRAFT','ACTIVE','ACTIVATE_CYCLE','إكمال الإعداد الأولي' where exists(select 1 from public.financial_cycles where id=${s.cycleId}::uuid and user_id=${userId} and status='ACTIVE') returning id`,
      rawSql`update public.obligation_occurrences o set cycle_id=c.id,is_reserved=(o.status in ('UPCOMING','DUE','OVERDUE') and o.due_date<=c.expected_next_income_date),updated_at=now()
        from public.financial_cycles c where c.id=${s.cycleId}::uuid and c.user_id=${userId} and c.status='ACTIVE' and o.user_id=${userId} and o.cycle_id is null and o.due_date between c.start_date and c.expected_next_income_date returning o.id`,
      rawSql`insert into public.onboarding_progress(user_id,current_step,obligations_reviewed,controls_reviewed,completed_at) values(${userId},6,true,true,now())
        on conflict(user_id) do update set current_step=6,completed_at=coalesce(public.onboarding_progress.completed_at,now()),updated_at=now() returning user_id`
    ]);
    if((res[0] as unknown[]).length!==1||(res[1] as unknown[]).length!==1||(res[3] as unknown[]).length!==1)return{success:false as const,message:'تعذر إنهاء الإعداد بصورة ذرية'};
    return{success:true as const};
  }catch{return{success:false as const,message:'تعذر تفعيل الدورة وإنهاء الإعداد'};}
}
