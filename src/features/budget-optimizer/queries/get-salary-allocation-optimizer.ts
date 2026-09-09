import { rawSql } from '@/infrastructure/db/client';
import { Money, sumMoney } from '@/financial-engine/money';
import { getCycleRecoveryReservations } from '@/features/internal-funding/queries/get-cycle-recovery-reservations';

export type OptimizerPriorityClass='BASIC'|'IMPORTANT'|'FLEXIBLE'|'DEFERRED';
export type OptimizerItemKind='CATEGORY'|'GOAL'|'EMERGENCY_RECOVERY'|'INVESTMENT_RECOVERY';
export type SalaryOptimizerItem={
  key:string;kind:OptimizerItemKind;label:string;amount:string;priorityClass:OptimizerPriorityClass;priorityRank:number;
  categoryId:string|null;currentReduction:string;uncovered:string;
  principalAmount?:string;growthAmount?:string;sourceId?:string;caseId?:string;installmentNumber?:number;isOverdue?:boolean;
};

export type SalaryOptimizerCycle={
  id:string;
  name:string;
  startDate:string;
  nextIncomeDate:string|null;
};

const rank=(kind:OptimizerItemKind,priorityClass:OptimizerPriorityClass)=>{
  if(priorityClass==='BASIC') return 10;
  if(kind==='EMERGENCY_RECOVERY') return 20;
  if(kind==='INVESTMENT_RECOVERY') return 30;
  if(kind==='GOAL') return 40;
  if(priorityClass==='IMPORTANT') return 50;
  if(priorityClass==='FLEXIBLE') return 60;
  return 70;
};
const money=(value:unknown)=>Money.parse(String(value??'0'));

export async function getSalaryAllocationOptimizer(userId:string){
  const cycleRows=await rawSql`select id,name,start_date::text as "startDate",expected_next_income_date::text as "nextIncomeDate" from public.financial_cycles where user_id=${userId} and status='ACTIVE' order by start_date desc limit 1`;
  const cycleRow=cycleRows[0];
  if(!cycleRow)return null;
  const cycle:SalaryOptimizerCycle={
    id:String(cycleRow.id),
    name:String(cycleRow.name),
    startDate:String(cycleRow.startDate),
    nextIncomeDate:cycleRow.nextIncomeDate==null?null:String(cycleRow.nextIncomeDate),
  };
  const cycleId=cycle.id;
  const [incomeRows,categoryRows,goalRows,adjustmentRows,recoveryReservations]=await Promise.all([
    rawSql`select coalesce(sum(expected_amount),0)::text as amount from public.expected_incomes where user_id=${userId} and cycle_id=${cycleId}`,
    rawSql`select ba.category_id as "categoryId",bc.name,ba.allocation_type as "allocationType",ba.planned_amount::text as amount,
      coalesce(bc.planning_priority_class,case when bc.category_group in ('OBLIGATION','ESSENTIAL') or bc.is_essential then 'BASIC' when bc.category_group in ('GOAL','SAVING','EMERGENCY') then 'IMPORTANT' when bc.category_group='FLEXIBLE' then 'FLEXIBLE' else 'IMPORTANT' end) as "priorityClass"
      from public.financial_plans p join public.plan_versions pv on pv.id=p.current_version_id and pv.user_id=p.user_id join public.budget_allocations ba on ba.plan_version_id=pv.id join public.budget_categories bc on bc.id=ba.category_id and bc.user_id=p.user_id
      where p.user_id=${userId} and p.cycle_id=${cycleId} and p.status in ('ACTIVE_PLAN','REVISED') order by bc.name`,
    rawSql`select g.id,g.name,gcc.approved_amount::text as amount from public.goal_cycle_commitments gcc join public.financial_goals g on g.id=gcc.goal_id and g.user_id=gcc.user_id where gcc.user_id=${userId} and gcc.cycle_id=${cycleId} and gcc.status in ('APPROVED','FUNDED') and gcc.approved_amount>0 order by g.priority nulls last,g.target_date nulls last,g.name`,
    rawSql`select category_id as "categoryId",reduction_amount::text as amount from public.cycle_budget_optimization_adjustments where user_id=${userId} and cycle_id=${cycleId} and status='DRAFT'`,
    getCycleRecoveryReservations(userId,cycleId),
  ]);

  const expectedIncome=money(incomeRows[0]?.amount);
  const adjustmentMap=new Map(adjustmentRows.map(r=>[String(r.categoryId),money(r.amount)]));
  const hasGoalCommitments=goalRows.some(r=>money(r.amount).isPositive());
  const items:SalaryOptimizerItem[]=[];
  for(const row of categoryRows){
    if(hasGoalCommitments&&String(row.allocationType)==='GOAL')continue;
    const priorityClass=String(row.priorityClass) as OptimizerPriorityClass;
    const amount=money(row.amount).max(Money.zero());
    const currentReduction=(adjustmentMap.get(String(row.categoryId))??Money.zero()).max(Money.zero()).min(amount);
    items.push({key:`category:${row.categoryId}`,kind:'CATEGORY',label:String(row.name),amount:amount.toString(),priorityClass,priorityRank:rank('CATEGORY',priorityClass),categoryId:String(row.categoryId),currentReduction:currentReduction.toString(),uncovered:'0.00'});
  }
  for(const r of recoveryReservations){
    const itemKind:OptimizerItemKind=r.sourceType==='EMERGENCY'?'EMERGENCY_RECOVERY':'INVESTMENT_RECOVERY';
    items.push({key:`recovery:${r.sourceId}:${r.installmentNumber}`,kind:itemKind,label:`${itemKind==='EMERGENCY_RECOVERY'?'استرداد الطوارئ':'استرداد الاستثمار'} · ${r.caseTitle} · دفعة ${r.installmentNumber}`,amount:r.totalAmount,priorityClass:'IMPORTANT',priorityRank:rank(itemKind,'IMPORTANT'),categoryId:null,currentReduction:'0.00',uncovered:'0.00',principalAmount:r.principalAmount,growthAmount:r.growthAmount,sourceId:r.sourceId,caseId:r.caseId,installmentNumber:r.installmentNumber,isOverdue:r.isOverdue});
  }
  for(const row of goalRows){const amount=money(row.amount).max(Money.zero());items.push({key:`goal:${row.id}`,kind:'GOAL',label:`هدف: ${String(row.name)}`,amount:amount.toString(),priorityClass:'IMPORTANT',priorityRank:rank('GOAL','IMPORTANT'),categoryId:null,currentReduction:'0.00',uncovered:'0.00'});}

  const sorted=[...items].sort((a,b)=>a.priorityRank-b.priorityRank||a.label.localeCompare(b.label,'ar'));
  const originalDemand=sumMoney(sorted.map(i=>money(i.amount)));
  const draftReductions=sumMoney(sorted.map(i=>money(i.currentReduction)));
  const adjustedDemand=originalDemand.subtract(draftReductions).max(Money.zero());
  let remainingIncome=expectedIncome;
  for(const item of sorted){
    const demand=money(item.amount).subtract(money(item.currentReduction)).max(Money.zero());
    const covered=remainingIncome.min(demand).max(Money.zero());
    item.uncovered=demand.subtract(covered).max(Money.zero()).toString();
    remainingIncome=remainingIncome.subtract(covered).max(Money.zero());
  }
  const deficit=adjustedDemand.subtract(expectedIncome).max(Money.zero());
  const surplus=expectedIncome.subtract(adjustedDemand).max(Money.zero());
  const recoveryItems=sorted.filter(i=>i.kind==='EMERGENCY_RECOVERY'||i.kind==='INVESTMENT_RECOVERY');
  const recoveryDemand=sumMoney(recoveryItems.map(i=>money(i.amount)));
  const recoveryPrincipal=sumMoney(sorted.map(i=>money(i.principalAmount??'0')));
  const recoveryGrowth=sumMoney(sorted.map(i=>money(i.growthAmount??'0')));
  return {cycle,expectedIncome:expectedIncome.toString(),items:sorted,originalDemand:originalDemand.toString(),draftReductions:draftReductions.toString(),adjustedDemand:adjustedDemand.toString(),deficit:deficit.toString(),surplus:surplus.toString(),recoveryDemand:recoveryDemand.toString(),recoveryPrincipal:recoveryPrincipal.toString(),recoveryGrowth:recoveryGrowth.toString(),recoveryReservations};
}
