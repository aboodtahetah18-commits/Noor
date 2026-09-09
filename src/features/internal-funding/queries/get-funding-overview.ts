import { rawSql } from '@/infrastructure/db/client';

export type FundingOverviewCase = { id:string; title:string; caseType:string; destinationCity:string|null; seasonKey:string|null; status:string; approvedAmount:string; growthRate:string; goalEventId:string|null; targetCategoryId:string|null; targetCategoryName:string|null; maxMonthlyRepayment:string|null; recoveryCycleCount:number|null; recoveryStrategy:string|null; usedAmount:string; growthContribution:string };
export type FundingOverviewCategory = { caseId:string; categoryId:string; categoryName:string; principal:string; growthContribution:string; remaining:string; plannedRepayment:string };
export type FundingOverviewSource = { id:string; caseId:string; sourceType:string; priority:number; approvedAmount:string; usedAmount:string; returnedUnusedAmount:string; accountName:string; bankName:string|null };
export type FundingOverviewAccount = { id:string; name:string; bankName:string|null; accountType:string; financialRole:string|null };
export type FundingOverviewCategoryCapacity = { categoryId:string; plannedAmount:string; actualAmount:string; availableHeadroom:string };
export type FundingOverviewFlexibleRelief = { caseId:string; planId:string; categoryId:string; categoryName:string; previousAmount:string; proposedAmount:string; reliefAmount:string; status:string };
export type FundingOverviewRecoverySchedule = { id:string; caseId:string; sourceId:string; categoryId:string; categoryName:string; installmentNumber:number; principalAmount:string; growthAmount:string; totalAmount:string; status:string; cycleId:string|null; transferId:string|null; paidAt:string|null; sourceType:string; sourceAccountName:string; sourceBankName:string|null };
export type FundingOverviewBudgetCategory = { id:string; name:string; categoryGroup:string };


export async function getFundingOverview(userId:string){
  const [cases,categories,sources,accounts,categoryCapacity,flexibleReliefs,recoverySchedule,emergencyGrowthRows,budgetCategories]=await Promise.all([
    rawSql`
      select c.id,c.title,c.case_type as "caseType",c.destination_city as "destinationCity",c.season_key as "seasonKey",c.status,
        c.approved_amount::text as "approvedAmount",c.growth_rate::text as "growthRate",c.goal_event_id as "goalEventId",c.target_category_id as "targetCategoryId",bc_target.name as "targetCategoryName",c.max_monthly_repayment::text as "maxMonthlyRepayment",c.recovery_cycle_count as "recoveryCycleCount",c.recovery_strategy as "recoveryStrategy",
        coalesce(sum(a.amount),0)::text as "usedAmount",coalesce(sum(a.growth_contribution),0)::text as "growthContribution"
      from public.internal_funding_cases c
      left join public.internal_funding_expense_allocations a on a.case_id=c.id and a.user_id=c.user_id
      left join public.budget_categories bc_target on bc_target.id=c.target_category_id and bc_target.user_id=c.user_id
      where c.user_id=${userId}
      group by c.id,bc_target.name order by c.created_at desc limit 100`,
    rawSql`
      select a.case_id as "caseId",a.category_id as "categoryId",bc.name as "categoryName",sum(a.amount)::text as principal,sum(a.growth_contribution)::text as "growthContribution",
        (sum(a.amount)+sum(a.growth_contribution)-coalesce((select sum(r.amount) from public.internal_funding_repayments r where r.user_id=${userId} and r.case_id=a.case_id and r.category_id=a.category_id and r.status='PAID'),0))::text as remaining,
        coalesce((select sum(r.amount) from public.internal_funding_repayments r where r.user_id=${userId} and r.case_id=a.case_id and r.category_id=a.category_id and r.status='PLANNED'),0)::text as "plannedRepayment"
      from public.internal_funding_expense_allocations a
      join public.budget_categories bc on bc.id=a.category_id and bc.user_id=a.user_id
      where a.user_id=${userId}
      group by a.case_id,a.category_id,bc.name order by bc.name`,
    rawSql`
      select s.id,s.case_id as "caseId",s.source_type as "sourceType",s.priority,s.approved_amount::text as "approvedAmount",s.used_amount::text as "usedAmount",s.returned_unused_amount::text as "returnedUnusedAmount",a.name as "accountName",a.bank_name as "bankName"
      from public.internal_funding_sources s join public.accounts a on a.id=s.account_id and a.user_id=s.user_id
      where s.user_id=${userId} order by s.case_id,s.priority`,
    rawSql`select id,name,bank_name as "bankName",account_type as "accountType",financial_role as "financialRole" from public.accounts where user_id=${userId} and is_active=true order by created_at`,
    rawSql`
      select ba.category_id as "categoryId",ba.planned_amount::text as "plannedAmount",
        coalesce(sum(t.amount) filter(where t.status='POSTED' and t.transaction_type in ('EXPENSE','OBLIGATION_PAYMENT')),0)::text as "actualAmount",
        greatest(ba.planned_amount-coalesce(sum(t.amount) filter(where t.status='POSTED' and t.transaction_type in ('EXPENSE','OBLIGATION_PAYMENT')),0),0)::text as "availableHeadroom"
      from public.financial_cycles c
      join public.financial_plans p on p.cycle_id=c.id and p.user_id=c.user_id and p.status in ('ACTIVE_PLAN','REVISED')
      join public.plan_versions pv on pv.plan_id=p.id and pv.is_current=true
      join public.budget_allocations ba on ba.plan_version_id=pv.id
      left join public.transactions t on t.user_id=c.user_id and t.cycle_id=c.id and t.category_id=ba.category_id
      where c.user_id=${userId} and c.status='ACTIVE'
      group by ba.category_id,ba.planned_amount`,
    rawSql`select fr.case_id as "caseId",fr.plan_id as "planId",fr.category_id as "categoryId",bc.name as "categoryName",fr.previous_amount::text as "previousAmount",fr.proposed_amount::text as "proposedAmount",fr.relief_amount::text as "reliefAmount",fr.status from public.internal_funding_flexible_reliefs fr join public.budget_categories bc on bc.id=fr.category_id and bc.user_id=fr.user_id where fr.user_id=${userId} order by fr.created_at`,
    rawSql`
      select rs.id,rs.case_id as "caseId",rs.source_id as "sourceId",rs.category_id as "categoryId",bc.name as "categoryName",
        rs.installment_number as "installmentNumber",rs.principal_amount::text as "principalAmount",rs.growth_amount::text as "growthAmount",rs.total_amount::text as "totalAmount",rs.status,
        rs.cycle_id as "cycleId",rs.transfer_id as "transferId",rs.paid_at::text as "paidAt",s.source_type as "sourceType",a.name as "sourceAccountName",a.bank_name as "sourceBankName"
      from public.internal_funding_recovery_schedule rs
      join public.internal_funding_sources s on s.id=rs.source_id and s.user_id=rs.user_id
      join public.accounts a on a.id=s.account_id and a.user_id=s.user_id
      join public.budget_categories bc on bc.id=rs.category_id and bc.user_id=rs.user_id
      where rs.user_id=${userId}
      order by rs.case_id,rs.installment_number,s.priority,bc.name`,
    rawSql`select coalesce(sum(rs.growth_amount),0)::text as amount from public.internal_funding_recovery_schedule rs join public.internal_funding_sources s on s.id=rs.source_id and s.user_id=rs.user_id where rs.user_id=${userId} and rs.status='PAID' and s.source_type='EMERGENCY'`,
    rawSql`select id,name,category_group as "categoryGroup" from public.budget_categories where user_id=${userId} and is_active=true order by category_group,name`,
  ]);
  const emergencyGrowth=String(emergencyGrowthRows[0]?.amount??'0.00');
  return {
    cases: cases as unknown as FundingOverviewCase[],
    categories: categories as unknown as FundingOverviewCategory[],
    sources: sources as unknown as FundingOverviewSource[],
    accounts: accounts as unknown as FundingOverviewAccount[],
    categoryCapacity: categoryCapacity as unknown as FundingOverviewCategoryCapacity[],
    flexibleReliefs: flexibleReliefs as unknown as FundingOverviewFlexibleRelief[],
    recoverySchedule: recoverySchedule as unknown as FundingOverviewRecoverySchedule[],
    emergencyGrowth,
    budgetCategories: budgetCategories as unknown as FundingOverviewBudgetCategory[],
  };
}
