'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { Money } from '@/financial-engine/money';
import { rawSql } from '@/infrastructure/db/client';

const parseMoney=(value:FormDataEntryValue|null)=>{
  const text=String(value??'').trim().replace(/,/g,'');
  if(!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  try { const amount=Money.parse(text); return amount.isNegative()?null:amount; } catch { return null; }
};

export async function saveOptimizerReductionAction(formData:FormData){
  const user=await requireAuthenticatedMutationUser('budget-optimizer-save-reduction');
  const categoryId=String(formData.get('categoryId')??'').trim();
  const amount=parseMoney(formData.get('amount'));
  if(!categoryId||amount===null) { redirect('/budget/optimizer?error=مبلغ التخفيض غير صالح'); return; }
  const rows=await rawSql`
    select c.id as "cycleId",ba.planned_amount::text as "plannedAmount"
    from public.financial_cycles c
    join public.financial_plans p on p.cycle_id=c.id and p.user_id=c.user_id and p.status in ('ACTIVE_PLAN','REVISED')
    join public.plan_versions pv on pv.id=p.current_version_id and pv.user_id=p.user_id
    join public.budget_allocations ba on ba.plan_version_id=pv.id and ba.category_id=${categoryId}
    where c.user_id=${user.id} and c.status='ACTIVE' limit 1`;
  const row=rows[0];
  if(!row) { redirect('/budget/optimizer?error=تعذر العثور على البند في الخطة الحالية'); return; }
  if(amount.compare(Money.parse(String(row.plannedAmount)))>0) redirect('/budget/optimizer?error=لا يمكن أن يتجاوز التخفيض ميزانية البند');
  if(amount.isZero()){
    await rawSql`delete from public.cycle_budget_optimization_adjustments where user_id=${user.id} and cycle_id=${String(row.cycleId)} and category_id=${categoryId} and status='DRAFT'`;
  }else{
    await rawSql`
      insert into public.cycle_budget_optimization_adjustments(user_id,cycle_id,category_id,reduction_amount,status)
      values(${user.id},${String(row.cycleId)},${categoryId},${amount.toString()},'DRAFT')
      on conflict(user_id,cycle_id,category_id) do update set reduction_amount=excluded.reduction_amount,status='DRAFT',updated_at=now()`;
  }
  revalidatePath('/budget/optimizer');
  redirect('/budget/optimizer?saved=1');
}

export async function updateCategoryPriorityAction(formData:FormData){
  const user=await requireAuthenticatedMutationUser('budget-optimizer-category-priority');
  const categoryId=String(formData.get('categoryId')??'').trim();
  const priority=String(formData.get('priorityClass')??'').trim();
  if(!categoryId||!['BASIC','IMPORTANT','FLEXIBLE','DEFERRED'].includes(priority)) redirect('/budget/optimizer?error=تصنيف البند غير صالح');
  await rawSql`update public.budget_categories set planning_priority_class=${priority},updated_at=now() where id=${categoryId} and user_id=${user.id}`;
  revalidatePath('/budget/optimizer');
  redirect('/budget/optimizer?priority=1');
}
