import { Money, sumMoney } from '@/financial-engine/money';
import { calculatePercentage } from '@/financial-engine/percentage';
import { rawSql } from '@/infrastructure/db/client';

export type BudgetCommandItem={
  categoryId:string; categoryName:string; allocationType:string; plannedAmount:string; actualAmount:string; remainingAmount:string; utilizationPercent:number|null; status:'NORMAL'|'OVER_BUDGET';
};
export type BudgetCommandCenter={
  plannedTotal:string; actualTotal:string; remainingTotal:string; utilizationPercent:number|null; overBudgetCount:number; items:BudgetCommandItem[];
};

function percentage(actual:Money,planned:Money):number|null{
  if(!planned.isPositive()) return actual.isPositive()?100:null;
  return Number(calculatePercentage(actual.minorUnits,planned.minorUnits)?.percent??'0');
}

export async function getBudgetCommandCenter(userId:string,cycleId:string):Promise<BudgetCommandCenter>{
  const rows=await rawSql`
    with cp as (
      select p.current_version_id
      from public.financial_plans p
      where p.user_id=${userId} and p.cycle_id=${cycleId}::uuid and p.status in ('ACTIVE_PLAN','REVISED')
      limit 1
    ), actual as (
      select t.category_id,
        coalesce(sum(case when t.transaction_type in ('EXPENSE','OBLIGATION_PAYMENT') then t.amount else 0 end),0)
        - coalesce(sum(case when t.transaction_type='REFUND' then t.amount else 0 end),0) amount
      from public.transactions t
      where t.user_id=${userId} and t.cycle_id=${cycleId}::uuid and t.status='POSTED' and t.category_id is not null
      group by t.category_id
    )
    select ba.category_id as "categoryId",bc.name as "categoryName",ba.allocation_type as "allocationType",
      ba.planned_amount::text as "plannedAmount",greatest(coalesce(a.amount,0),0)::text as "actualAmount"
    from public.budget_allocations ba
    join cp on cp.current_version_id=ba.plan_version_id
    join public.budget_categories bc on bc.id=ba.category_id and bc.user_id=ba.user_id
    left join actual a on a.category_id=ba.category_id
    where ba.user_id=${userId}
    order by case ba.allocation_type when 'OBLIGATION' then 1 when 'ESSENTIAL' then 2 when 'SAVING' then 3 when 'EMERGENCY' then 4 when 'GOAL' then 5 when 'FLEXIBLE' then 6 else 7 end,bc.name`;
  const items:BudgetCommandItem[]=rows.map((row)=>{
    const planned=Money.parse(String(row.plannedAmount??'0.00'));
    const actual=Money.parse(String(row.actualAmount??'0.00'));
    return {
      categoryId:String(row.categoryId),categoryName:String(row.categoryName),allocationType:String(row.allocationType),
      plannedAmount:planned.toString(),actualAmount:actual.toString(),remainingAmount:planned.subtract(actual).max(Money.zero()).toString(),
      utilizationPercent:percentage(actual,planned),status:actual.compare(planned)>0?'OVER_BUDGET':'NORMAL',
    };
  });
  const plannedTotal=sumMoney(items.map((item)=>Money.parse(item.plannedAmount)));
  const actualTotal=sumMoney(items.map((item)=>Money.parse(item.actualAmount)));
  return {
    plannedTotal:plannedTotal.toString(),actualTotal:actualTotal.toString(),remainingTotal:plannedTotal.subtract(actualTotal).max(Money.zero()).toString(),
    utilizationPercent:percentage(actualTotal,plannedTotal),overBudgetCount:items.filter((item)=>item.status==='OVER_BUDGET').length,items,
  };
}
