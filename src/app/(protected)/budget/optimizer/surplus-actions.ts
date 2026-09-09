'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { rawSql } from '@/infrastructure/db/client';
import { Money } from '@/financial-engine/money';
import { getSalaryAllocationOptimizer } from '@/features/budget-optimizer/queries/get-salary-allocation-optimizer';

const types=['EMERGENCY','GOAL','INTERNAL_RECOVERY','INVESTMENT','CYCLE_RESERVE'] as const;
type DestinationType=(typeof types)[number];
const parseMoney=(value:FormDataEntryValue|null)=>{const t=String(value??'').trim().replace(/,/g,'');if(!/^\d+(?:\.\d{1,2})?$/.test(t))return null;return Money.parse(t);};
const isDestinationType=(value:string):value is DestinationType=>types.includes(value as DestinationType);

export async function saveSurplusRoutingDraftAction(formData:FormData){
  const user=await requireAuthenticatedMutationUser('surplus-routing-draft');
  const type=String(formData.get('destinationType')??'');
  const amount=parseMoney(formData.get('amount'));
  if(!isDestinationType(type)||amount===null) return redirect('/budget/optimizer?routeError=بيانات توجيه الفائض غير صالحة#surplus-routing');
  const optimizer=await getSalaryAllocationOptimizer(user.id);
  if(!optimizer) return redirect('/budget/optimizer?routeError=لا توجد دورة نشطة#surplus-routing');
  if(Money.parse(optimizer.deficit).isPositive()) return redirect('/budget/optimizer?routeError=يجب معالجة العجز قبل توزيع الفائض#surplus-routing');
  const cycleId=String(optimizer.cycle.id);
  const goalId=String(formData.get('goalId')??'').trim()||null;
  const emergencyFundId=String(formData.get('emergencyFundId')??'').trim()||null;
  const fundingSourceId=String(formData.get('fundingSourceId')??'').trim()||null;
  const investmentAccountId=String(formData.get('investmentAccountId')??'').trim()||null;
  const existingRows=await rawSql`select coalesce(sum(amount),0)::text as total from public.cycle_surplus_routing_drafts where user_id=${user.id} and cycle_id=${cycleId} and status='DRAFT' and not (destination_type=${type} and coalesce(goal_id::text,'')=coalesce(${goalId}::text,'') and coalesce(emergency_fund_id::text,'')=coalesce(${emergencyFundId}::text,'') and coalesce(internal_funding_source_id::text,'')=coalesce(${fundingSourceId}::text,'') and coalesce(investment_account_id::text,'')=coalesce(${investmentAccountId}::text,''))`;
  const other=Money.parse(String(existingRows[0]?.total??'0'));
  if(other.add(amount).compare(Money.parse(optimizer.surplus))>0) return redirect('/budget/optimizer?routeError=إجمالي التوزيع يتجاوز الفائض المتاح#surplus-routing');

  if(!amount.isPositive()){
    await rawSql`delete from public.cycle_surplus_routing_drafts where user_id=${user.id} and cycle_id=${cycleId} and status='DRAFT' and destination_type=${type} and coalesce(goal_id::text,'')=coalesce(${goalId}::text,'') and coalesce(emergency_fund_id::text,'')=coalesce(${emergencyFundId}::text,'') and coalesce(internal_funding_source_id::text,'')=coalesce(${fundingSourceId}::text,'') and coalesce(investment_account_id::text,'')=coalesce(${investmentAccountId}::text,'')`;
  }else{
    const rows=await rawSql`select id from public.cycle_surplus_routing_drafts where user_id=${user.id} and cycle_id=${cycleId} and status='DRAFT' and destination_type=${type} and coalesce(goal_id::text,'')=coalesce(${goalId}::text,'') and coalesce(emergency_fund_id::text,'')=coalesce(${emergencyFundId}::text,'') and coalesce(internal_funding_source_id::text,'')=coalesce(${fundingSourceId}::text,'') and coalesce(investment_account_id::text,'')=coalesce(${investmentAccountId}::text,'') limit 1`;
    const existing=rows[0];
    if(existing) await rawSql`update public.cycle_surplus_routing_drafts set amount=${amount.toString()},updated_at=now() where id=${String(existing.id)} and user_id=${user.id}`;
    else await rawSql`insert into public.cycle_surplus_routing_drafts(user_id,cycle_id,destination_type,goal_id,emergency_fund_id,internal_funding_source_id,investment_account_id,amount,status) values(${user.id},${cycleId},${type},${goalId},${emergencyFundId},${fundingSourceId},${investmentAccountId},${amount.toString()},'DRAFT')`;
  }
  revalidatePath('/budget/optimizer');
  redirect('/budget/optimizer?routeSaved=1#surplus-routing');
}
