import { randomUUID } from 'node:crypto';
import { rawSql } from '@/infrastructure/db/client';
import type { OnboardingStatus, OnboardingStep } from '@/features/onboarding/types/onboarding';

class OnboardingRepository {
  async ensureProgress(userId:string){
    await rawSql`insert into public.onboarding_progress(user_id,current_step) values(${userId},1) on conflict(user_id) do nothing`;
  }
  async markStep(userId:string,step:OnboardingStep, flags?:{obligationsReviewed?:boolean;controlsReviewed?:boolean}){
    await this.ensureProgress(userId);
    await rawSql`update public.onboarding_progress set
      current_step=greatest(current_step,${step}),
      obligations_reviewed=case when ${flags?.obligationsReviewed??false} then true else obligations_reviewed end,
      controls_reviewed=case when ${flags?.controlsReviewed??false} then true else controls_reviewed end
      where user_id=${userId}`;
  }
  async complete(userId:string){
    await this.ensureProgress(userId);
    await rawSql`update public.onboarding_progress set current_step=6,completed_at=coalesce(completed_at,now()) where user_id=${userId}`;
  }
  async status(userId:string):Promise<OnboardingStatus>{
    const rows=await rawSql`
      with operational_cycle as (
        select id,status,start_date::text from public.financial_cycles where user_id=${userId} and status in ('DRAFT','ACTIVE','CLOSING') order by created_at desc limit 1
      ), plan_row as (
        select p.id,p.status from public.financial_plans p join operational_cycle c on c.id=p.cycle_id where p.user_id=${userId} limit 1
      )
      select
        op.user_id is not null started, coalesce(op.current_step,1)::int current_step, op.completed_at is not null completed,
        (select count(*)::int from public.accounts where user_id=${userId} and is_active=true) accounts_count,
        (select id::text from operational_cycle) cycle_id,
        (select status from operational_cycle) cycle_status,
        (select start_date from operational_cycle) cycle_start_date,
        (select count(*)::int from public.expected_incomes ei join operational_cycle c on c.id=ei.cycle_id where ei.user_id=${userId}) expected_income_count,
        (select count(*)::int from public.obligation_templates where user_id=${userId} and is_active=true) obligations_count,
        coalesce(op.obligations_reviewed,false) obligations_reviewed,
        coalesce(op.controls_reviewed,false) controls_reviewed,
        exists(select 1 from public.emergency_funds where user_id=${userId} and status<>'NOT_CONFIGURED') emergency_configured,
        (select count(*)::int from public.financial_goals where user_id=${userId} and status<>'CANCELLED') goals_count,
        (select id::text from plan_row) plan_id,
        (select status from plan_row) plan_status,
        (select count(*)::int from public.budget_categories where user_id=${userId} and is_active=true) categories_count
      from (select ${userId}::uuid user_id) u left join public.onboarding_progress op on op.user_id=u.user_id`;
    const r=rows[0] ?? {};
    const planStatus=r.plan_status?String(r.plan_status):null;
    return {started:Boolean(r.started),currentStep:Number(r.current_step) as OnboardingStep,completed:Boolean(r.completed)||planStatus==='ACTIVE_PLAN',accountsCount:Number(r.accounts_count),cycleId:r.cycle_id?String(r.cycle_id):null,cycleStatus:r.cycle_status?String(r.cycle_status):null,cycleStartDate:r.cycle_start_date?String(r.cycle_start_date):null,expectedIncomeCount:Number(r.expected_income_count),obligationsCount:Number(r.obligations_count),obligationsReviewed:Boolean(r.obligations_reviewed),controlsReviewed:Boolean(r.controls_reviewed),emergencyConfigured:Boolean(r.emergency_configured),goalsCount:Number(r.goals_count),planId:r.plan_id?String(r.plan_id):null,planStatus,categoriesCount:Number(r.categories_count)};
  }
  async createDraftCycleWithIncome(userId:string,input:{cycleName:string;startDate:string;expectedNextIncomeDate:string;sourceName:string;expectedAmount:string;expectedDate:string;incomeKind:string;isPrimary:boolean}){
    const cycleId=randomUUID(),incomeId=randomUUID();
    const res=await rawSql.transaction([
      rawSql`insert into public.financial_cycles(id,user_id,name,start_date,expected_next_income_date,status) values(${cycleId},${userId},${input.cycleName},${input.startDate},${input.expectedNextIncomeDate},'DRAFT') returning id`,
      rawSql`insert into public.expected_incomes(id,user_id,cycle_id,source_name,expected_amount,expected_date,income_kind,is_primary)
        select ${incomeId},${userId},${cycleId},${input.sourceName},${input.expectedAmount},${input.expectedDate},${input.incomeKind},${input.isPrimary}
        where exists(select 1 from public.financial_cycles where id=${cycleId} and user_id=${userId}) returning id`
    ]);
    if((res[0] as unknown[]).length!==1||(res[1] as unknown[]).length!==1)throw new Error('ONBOARDING_INCOME_ATOMIC_WRITE_FAILED');
    return cycleId;
  }
}
export const onboardingRepository=new OnboardingRepository();
