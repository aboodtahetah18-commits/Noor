import { rawSql } from '@/infrastructure/db/client';

function normalizeLabel(value:string){
  return value
    .trim()
    .toLocaleLowerCase('ar')
    .replace(/[أإآ]/g,'ا')
    .replace(/ى/g,'ي')
    .replace(/ة/g,'ه')
    .replace(/[^\p{L}\p{N}\s]/gu,' ')
    .replace(/\s+/g,' ')
    .trim();
}

export async function syncTemporaryAmountOutcomes(userId:string){
  const outcomeTable=await rawSql`select to_regclass('public.budget_temporary_amount_outcomes')::text table_name`;
  if(!(outcomeTable[0] as Record<string,unknown>|undefined)?.table_name) return {evaluated:0};

  const rows=await rawSql`
    select
      ba.id allocation_id,
      ba.category_id,
      bc.name category_name,
      ba.priority_override_reason,
      ba.temporary_applied_extra_amount::text predicted_extra_amount,
      ba.temporary_baseline_amount::text baseline_amount,
      p.cycle_id,
      greatest(
        coalesce(sum(case when t.status='POSTED' and t.transaction_type in ('EXPENSE','OBLIGATION_PAYMENT') then t.amount else 0 end),0)
        - coalesce(sum(case when t.status='POSTED' and t.transaction_type='REFUND' then t.amount else 0 end),0),
        0
      )::text actual_category_spend
    from public.budget_allocations ba
    join public.plan_versions pv on pv.id=ba.plan_version_id and pv.user_id=ba.user_id
    join public.financial_plans p on p.id=pv.plan_id and p.user_id=pv.user_id
    join public.financial_cycles c on c.id=p.cycle_id and c.user_id=p.user_id
    join public.budget_categories bc on bc.id=ba.category_id and bc.user_id=ba.user_id
    left join public.transactions t on t.user_id=ba.user_id and t.cycle_id=p.cycle_id and t.category_id=ba.category_id
    where ba.user_id=${userId}::uuid
      and ba.temporary_applied_extra_amount is not null
      and ba.temporary_baseline_amount is not null
      and ba.priority_override_reason is not null
      and c.expected_next_income_date<current_date
      and not exists(
        select 1
        from public.budget_temporary_amount_outcomes o
        where o.user_id=ba.user_id and o.allocation_id=ba.id
      )
    group by ba.id,ba.category_id,bc.name,ba.priority_override_reason,ba.temporary_applied_extra_amount,ba.temporary_baseline_amount,p.cycle_id
  `;

  let evaluated=0;
  for(const row of rows){
    const predicted=Math.max(0,Number(row.predicted_extra_amount??0));
    const baseline=Math.max(0,Number(row.baseline_amount??0));
    const actualSpend=Math.max(0,Number(row.actual_category_spend??0));
    if(!(predicted>0)) continue;

    const actualExtra=Math.max(0,actualSpend-baseline);
    const absoluteError=Math.abs(actualExtra-predicted);
    const errorRatio=predicted>0?absoluteError/predicted:null;
    const tolerance=Math.max(10,predicted*0.05);
    const direction=Math.abs(actualExtra-predicted)<=tolerance
      ? 'MATCH'
      : actualExtra>predicted
        ? 'UNDER'
        : 'OVER';
    const normalizedLabel=normalizeLabel(String(row.category_name??''));
    const reason=String(row.priority_override_reason??'');
    if(!normalizedLabel||!['TRAVEL','OCCASION','HEALTH','MAINTENANCE','UNUSUAL_MONTH','OTHER'].includes(reason)) continue;

    const inserted=await rawSql`
      insert into public.budget_temporary_amount_outcomes(
        user_id,cycle_id,allocation_id,category_id,normalized_label,context_reason,
        predicted_extra_amount,baseline_amount,actual_category_spend,actual_extra_amount,
        absolute_error,error_ratio,direction
      ) values(
        ${userId}::uuid,${String(row.cycle_id)}::uuid,${String(row.allocation_id)}::uuid,${String(row.category_id)}::uuid,
        ${normalizedLabel},${reason},${predicted},${baseline},${actualSpend},${actualExtra},
        ${absoluteError},${errorRatio},${direction}
      )
      on conflict(user_id,allocation_id) do nothing
      returning id
    `;
    if(!inserted.length) continue;
    evaluated+=1;

    await rawSql`
      update public.budget_temporary_amount_preferences p
      set outcome_count=p.outcome_count+1,
          average_error_ratio=(
            coalesce(p.average_error_ratio,0)*p.outcome_count + ${errorRatio??0}
          )/(p.outcome_count+1),
          accuracy_weight=greatest(
            0.25,
            least(
              1,
              1-(
                (coalesce(p.average_error_ratio,0)*p.outcome_count + ${errorRatio??0})
                /(p.outcome_count+1)
              )
            )
          ),
          updated_at=now()
      where p.user_id=${userId}::uuid
        and p.normalized_label=${normalizedLabel}
        and p.context_reason=${reason}
    `;
  }

  return {evaluated};
}
