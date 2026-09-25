import { rawSql } from '@/infrastructure/db/client';
import { Money } from '@/financial-engine/money';
import { getCurrentFinancialState } from '@/features/financial-engine/queries/get-current-financial-state';
import { goalRepository } from '@/repositories/goal-repository';
import {
  calculatePersonalBudget,
  type PersonalBudgetCalculationResult,
} from '@/lib/finance/personal-budget-calculation-engine';

export type LivePersonalBudgetGoal={
  id:string;
  name:string;
  status:string;
  targetAmount:string;
  currentBalance:string;
  remainingAmount:string;
  remainingCycles:number|null;
  requiredContribution:string|null;
  targetDate:string|null;
};

export type LivePersonalBudgetCalculation={
  cycle:{
    id:string;
    name:string;
    status:string;
    startDate:string;
    expectedNextIncomeDate:string;
    remainingDays:number;
  };
  source:{
    engineSnapshotId:string;
    engineAsOfAt:string;
    planVersionId:string|null;
    sourceOfLiquidity:'cycle_financial_engine_current_v';
    sourceOfPlan:'budget_allocations';
    sourceOfTransactions:'transactions';
    sourceOfGoals:'financial_goals';
  };
  calculation:PersonalBudgetCalculationResult;
  goals:LivePersonalBudgetGoal[];
};

function daysUntil(dateValue:string){
  const today=new Date();
  const todayUtc=Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate());
  const target=new Date(dateValue+'T00:00:00Z').getTime();
  return Math.max(0,Math.ceil((target-todayUtc)/86_400_000));
}

function nonNegativeDifference(a:string,b:string){
  const result=Money.parse(a).subtract(Money.parse(b));
  return result.isNegative()?'0.00':result.toString();
}

export async function getLivePersonalBudgetCalculation(
  userId:string,
  cycleId?:string,
):Promise<LivePersonalBudgetCalculation|null>{
  const cycleRows=cycleId
    ?await rawSql`
      select id,name,status,start_date::text,expected_next_income_date::text
      from public.financial_cycles
      where id=${cycleId}::uuid and user_id=${userId}::uuid
      limit 1
    `
    :await rawSql`
      select id,name,status,start_date::text,expected_next_income_date::text
      from public.financial_cycles
      where user_id=${userId}::uuid and status in ('ACTIVE','CLOSING')
      order by case status when 'ACTIVE' then 1 else 2 end,created_at desc
      limit 1
    `;
  const cycle=cycleRows[0] as Record<string,unknown>|undefined;
  if(!cycle)return null;
  const resolvedCycleId=String(cycle.id);

  const [state,planRows,goals]=await Promise.all([
    getCurrentFinancialState(userId,resolvedCycleId),
    rawSql`
      with current_plan as (
        select p.current_version_id
        from public.financial_plans p
        where p.user_id=${userId}::uuid
          and p.cycle_id=${resolvedCycleId}::uuid
          and p.current_version_id is not null
        order by p.updated_at desc
        limit 1
      ),
      allocations as (
        select
          coalesce(sum(ba.planned_amount) filter(where ba.allocation_type='ESSENTIAL'),0) essential_planned,
          coalesce(sum(ba.planned_amount) filter(where ba.allocation_type='FLEXIBLE'),0) flexible_planned,
          coalesce(sum(ba.planned_amount) filter(where ba.allocation_type='GOAL'),0) goal_planned,
          coalesce(sum(ba.planned_amount) filter(where ba.allocation_type in ('ESSENTIAL','FLEXIBLE')),0) spending_planned,
          max(ba.plan_version_id)::text plan_version_id
        from public.budget_allocations ba
        join current_plan cp on cp.current_version_id=ba.plan_version_id
        where ba.user_id=${userId}::uuid
      ),
      actual_by_type as (
        select
          coalesce(sum(t.amount) filter(where t.transaction_type='EXPENSE' and t.status='POSTED' and t.reversed_at is null),0) expense_actual,
          coalesce(sum(t.amount) filter(where t.transaction_type='GOAL_CONTRIBUTION' and t.status='POSTED' and t.reversed_at is null),0) goal_actual
        from public.transactions t
        where t.user_id=${userId}::uuid and t.cycle_id=${resolvedCycleId}::uuid
      ),
      refunds as (
        select coalesce(sum(r.amount),0) amount
        from public.transactions r
        join public.transactions original
          on original.id=r.related_transaction_id and original.user_id=r.user_id
        where r.user_id=${userId}::uuid
          and r.cycle_id=${resolvedCycleId}::uuid
          and r.transaction_type='REFUND'
          and r.status='POSTED'
          and r.reversed_at is null
          and original.transaction_type='EXPENSE'
      ),
      essential_actual as (
        select coalesce(sum(t.amount),0) amount
        from public.transactions t
        where t.user_id=${userId}::uuid
          and t.cycle_id=${resolvedCycleId}::uuid
          and t.transaction_type='EXPENSE'
          and t.status='POSTED'
          and t.reversed_at is null
          and t.category_id in (
            select ba.category_id
            from public.budget_allocations ba
            join current_plan cp on cp.current_version_id=ba.plan_version_id
            where ba.user_id=${userId}::uuid and ba.allocation_type='ESSENTIAL'
          )
      ),
      flexible_actual as (
        select coalesce(sum(t.amount),0) amount
        from public.transactions t
        where t.user_id=${userId}::uuid
          and t.cycle_id=${resolvedCycleId}::uuid
          and t.transaction_type='EXPENSE'
          and t.status='POSTED'
          and t.reversed_at is null
          and t.category_id in (
            select ba.category_id
            from public.budget_allocations ba
            join current_plan cp on cp.current_version_id=ba.plan_version_id
            where ba.user_id=${userId}::uuid and ba.allocation_type='FLEXIBLE'
          )
      ),
      savings as (
        select coalesce(sum(st.amount),0) actual
        from public.saving_transfers st
        where st.user_id=${userId}::uuid and st.cycle_id=${resolvedCycleId}::uuid
      )
      select
        allocations.plan_version_id,
        allocations.essential_planned::text,
        allocations.flexible_planned::text,
        allocations.goal_planned::text,
        allocations.spending_planned::text,
        greatest(essential_planned-essential_actual.amount,0)::text remaining_essentials,
        greatest(goal_planned-actual_by_type.goal_actual,0)::text remaining_goals,
        greatest(flexible_planned-flexible_actual.amount,0)::text flexible_remaining,
        flexible_actual.amount::text flexible_actual,
        greatest(actual_by_type.expense_actual-refunds.amount,0)::text spending_actual,
        savings.actual::text saving_actual
      from allocations,actual_by_type,refunds,essential_actual,flexible_actual,savings
    `,
    goalRepository.list(userId),
  ]);

  const plan=(planRows[0]??{}) as Record<string,unknown>;
  const remainingDays=daysUntil(String(cycle.expected_next_income_date));
  const confidence=state.confidenceScore===null?undefined:Number(state.confidenceScore);

  const calculation=calculatePersonalBudget({
    verifiedIncome:state.verifiedIncomeReceived,
    expectedIncome:state.expectedIncomeUnreceived,
    operatingResourcesOverride:state.actualLiquidity,
    protectedObligations:state.reservedObligations,
    reservedEssentials:String(plan.remaining_essentials??'0.00'),
    requiredProtection:state.requiredProtection,
    requiredGoalAllocations:String(plan.remaining_goals??'0.00'),
    otherActiveReservations:'0.00',
    plannedAmount:String(plan.spending_planned??'0.00'),
    realizedAmount:String(plan.spending_actual??'0.00'),
    netRealizedSavings:String(plan.saving_actual??'0.00'),
    flexibleBudget:String(plan.flexible_planned??'0.00'),
    flexibleRealized:String(plan.flexible_actual??'0.00'),
    remainingCycleDays:remainingDays,
    currentAvailableBalance:state.actualLiquidity,
    confirmedRemainingOutflows:Money.parse(state.reservedObligations)
      .add(Money.parse(String(plan.remaining_essentials??'0.00')))
      .toString(),
    forecastEligibleInflows:state.expectedIncomeUnreceived,
    calculationConfidence:Number.isFinite(confidence)?confidence:undefined,
  });

  return {
    cycle:{
      id:resolvedCycleId,
      name:String(cycle.name),
      status:String(cycle.status),
      startDate:String(cycle.start_date),
      expectedNextIncomeDate:String(cycle.expected_next_income_date),
      remainingDays,
    },
    source:{
      engineSnapshotId:state.snapshotId,
      engineAsOfAt:state.asOfAt,
      planVersionId:plan.plan_version_id?String(plan.plan_version_id):null,
      sourceOfLiquidity:'cycle_financial_engine_current_v',
      sourceOfPlan:'budget_allocations',
      sourceOfTransactions:'transactions',
      sourceOfGoals:'financial_goals',
    },
    calculation,
    goals:goals
      .filter(goal=>goal.status!=='CANCELLED')
      .map(goal=>({
        id:goal.id,
        name:goal.name,
        status:goal.status,
        targetAmount:goal.targetAmount,
        currentBalance:goal.currentBalance,
        remainingAmount:goal.remainingAmount,
        remainingCycles:goal.remainingCycles,
        requiredContribution:goal.requiredContribution,
        targetDate:goal.targetDate,
      })),
  };
}
