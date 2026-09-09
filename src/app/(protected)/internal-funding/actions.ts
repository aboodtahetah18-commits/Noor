'use server';
import { redirect } from 'next/navigation';
import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { rawSql, type SqlQuery } from '@/infrastructure/db/client';
import { Money } from '@/financial-engine/money';

function money(value:FormDataEntryValue|null){
  const text=String(value??'').trim().replace(/,/g,'');
  if(!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  return Money.parse(text);
}

export async function createInternalFundingCaseAction(formData:FormData){
  const user=await requireAuthenticatedMutationUser('internal-funding-create');
  const title=String(formData.get('title')??'').trim();
  const caseType=String(formData.get('caseType')??'TRIP').trim();
  const destinationCity=String(formData.get('destinationCity')??'').trim()||null;
  const seasonKey=String(formData.get('seasonKey')??'').trim()||null;
  const approved=money(formData.get('approvedAmount'));
  const emergencyAccountId=String(formData.get('emergencyAccountId')??'').trim()||null;
  const emergencyAmount=money(formData.get('emergencyAmount'))??Money.zero();
  const investmentAccountId=String(formData.get('investmentAccountId')??'').trim()||null;
  const investmentAmount=money(formData.get('investmentAmount'))??Money.zero();
  if(!title||!['TRIP','GOAL','URGENT','OTHER'].includes(caseType)||approved===null||!approved.isPositive()) return redirect('/internal-funding?error=بيانات التمويل غير مكتملة');
  if(emergencyAmount.add(investmentAmount).compare(approved)!==0) redirect('/internal-funding?error=مجموع مصادر التمويل يجب أن يساوي المبلغ المعتمد');
  if(emergencyAmount.isPositive()&&!emergencyAccountId) redirect('/internal-funding?error=اختر حساب الطوارئ');
  if(investmentAmount.isPositive()&&!investmentAccountId) redirect('/internal-funding?error=اختر المحفظة الاستثمارية');
  try{
    const ids=[emergencyAccountId,investmentAccountId].filter(Boolean) as string[];
    for(const id of ids){
      const account=await rawSql`select id from public.accounts where id=${id} and user_id=${user.id} and is_active=true limit 1`;
      if(!account[0]) throw new Error('أحد حسابات التمويل غير صالح.');
    }
    const caseId=crypto.randomUUID();
    const statements:SqlQuery[]=[rawSql`insert into public.internal_funding_cases(id,user_id,case_type,title,destination_city,season_key,status,approved_amount,growth_rate) values(${caseId},${user.id},${caseType},${title.slice(0,180)},${destinationCity?.slice(0,120)??null},${seasonKey?.slice(0,120)??null},'PLANNING',${approved.toString()},0.10)`];
    if(emergencyAmount.isPositive()) statements.push(rawSql`insert into public.internal_funding_sources(user_id,case_id,account_id,source_type,priority,approved_amount) values(${user.id},${caseId},${emergencyAccountId},'EMERGENCY',10,${emergencyAmount.toString()})`);
    if(investmentAmount.isPositive()) statements.push(rawSql`insert into public.internal_funding_sources(user_id,case_id,account_id,source_type,priority,approved_amount) values(${user.id},${caseId},${investmentAccountId},'INVESTMENT',20,${investmentAmount.toString()})`);
    await rawSql.transaction(statements);
  }catch(error){
    const message=error instanceof Error?error.message:'تعذر إنشاء التمويل';
    redirect(`/internal-funding?error=${encodeURIComponent(message.slice(0,180))}`);
  }
  redirect('/internal-funding?created=1');
}


export async function createCategoryFundingRequestAction(formData:FormData){
  const user=await requireAuthenticatedMutationUser('internal-funding-category-request');
  const title=String(formData.get('title')??'').trim();
  const categoryId=String(formData.get('categoryId')??'').trim();
  const approved=money(formData.get('approvedAmount'));
  const maxMonthly=money(formData.get('maxMonthlyRepayment'));
  if(!title||!categoryId||approved===null||!approved.isPositive()||maxMonthly===null||!maxMonthly.isPositive()) return redirect('/internal-funding?error=أكمل بيانات طلب تمويل البند');
  try{
    const [categoryRows,emergencyRows]=await Promise.all([
      rawSql`select id,name from public.budget_categories where id=${categoryId}::uuid and user_id=${user.id} and is_active=true limit 1`,
      rawSql`select a.id,a.name,a.bank_name as "bankName",coalesce(ab.balance,0)::text as balance from public.accounts a left join public.account_balances_v ab on ab.account_id=a.id and ab.user_id=a.user_id where a.user_id=${user.id} and a.is_active=true and a.financial_role='EMERGENCY_FUND' order by a.created_at limit 1`,
    ]);
    if(!categoryRows[0]) throw new Error('البند المحدد غير صالح.');
    const emergency=emergencyRows[0];if(!emergency) throw new Error('أنشئ حساب طوارئ أولًا ليعمل كمصدر التمويل الداخلي.');
    if(Money.parse(String(emergency.balance??'0')).compare(approved)<0) throw new Error('رصيد حساب الطوارئ لا يغطي مبلغ التمويل المطلوب.');
    const {recommendAffordableRecovery}=await import('@/features/internal-funding/services/recommend-affordable-recovery');
    const recommendation=await recommendAffordableRecovery(user.id,{approvedAmount:approved.toString(),requestedMonthlyCap:maxMonthly.toString(),growthRate:'0.10'});
    if(!recommendation.feasible) throw new Error(recommendation.reason);
    const caseId=crypto.randomUUID();
    await rawSql.transaction([
      rawSql`insert into public.internal_funding_cases(id,user_id,case_type,title,status,approved_amount,growth_rate,target_category_id,recovery_cycle_count,recovery_strategy,max_monthly_repayment,notes) values(${caseId},${user.id},'CATEGORY',${title.slice(0,180)},'PLANNING',${approved.toString()},0.10,${categoryId},${recommendation.recoveryCycleCount},'PROPORTIONAL_ACTUAL_USE',${maxMonthly.toString()},${`قسط آمن مقترح ${recommendation.recommendedMonthlyRepayment} عبر ${recommendation.recoveryCycleCount} دورة`})`,
      rawSql`insert into public.internal_funding_sources(user_id,case_id,account_id,source_type,priority,approved_amount) values(${user.id},${caseId},${String(emergency.id)},'EMERGENCY',10,${approved.toString()})`,
    ]);
  }catch(error){
    const message=error instanceof Error?error.message:'تعذر إنشاء طلب تمويل البند';
    redirect(`/internal-funding?error=${encodeURIComponent(message.slice(0,180))}`);
  }
  redirect('/internal-funding?categoryCreated=1');
}

export async function beginFundingRecoveryAction(formData:FormData){
  const user=await requireAuthenticatedMutationUser('internal-funding-begin-recovery');
  const caseId=String(formData.get('caseId')??'').trim();
  if(!caseId) redirect('/internal-funding?error=التمويل غير محدد');
  try{
    const { beginInternalFundingRecovery }=await import('@/features/internal-funding/commands/begin-recovery');
    await beginInternalFundingRecovery(user.id,caseId);
  }catch(error){
    const message=error instanceof Error?error.message:'تعذر بدء الاسترداد';
    redirect(`/internal-funding?error=${encodeURIComponent(message.slice(0,180))}`);
  }
  redirect('/internal-funding?recovery=1');
}

export async function buildFundingRecoveryScheduleAction(formData:FormData){
  const user=await requireAuthenticatedMutationUser('internal-funding-build-recovery-schedule');
  const caseId=String(formData.get('caseId')??'').trim();
  try{const {ensureRecoverySchedule}=await import('@/features/internal-funding/services/recovery-schedule');await ensureRecoverySchedule(user.id,caseId)}catch(error){const message=error instanceof Error?error.message:'تعذر بناء جدول الاسترداد';redirect(`/internal-funding?error=${encodeURIComponent(message.slice(0,180))}`)}
  redirect('/internal-funding?schedule=1');
}

export async function payRecoveryInstallmentAction(formData:FormData){
  const user=await requireAuthenticatedMutationUser('internal-funding-pay-recovery-installment');
  const caseId=String(formData.get('caseId')??'').trim();
  const sourceId=String(formData.get('sourceId')??'').trim();
  const fromAccountId=String(formData.get('fromAccountId')??'').trim();
  const installmentNumber=Number(String(formData.get('installmentNumber')??'0'));
  try{const {payRecoverySourceInstallment}=await import('@/features/internal-funding/commands/pay-recovery-installment');await payRecoverySourceInstallment(user.id,{caseId,sourceId,fromAccountId,installmentNumber})}catch(error){const message=error instanceof Error?error.message:'تعذر تنفيذ دفعة الاسترداد';redirect(`/internal-funding?error=${encodeURIComponent(message.slice(0,180))}`)}
  redirect('/internal-funding?paid=1');
}

export async function planCategoryRepaymentAction(formData:FormData){
  const user=await requireAuthenticatedMutationUser('internal-funding-plan-repayment');
  const caseId=String(formData.get('caseId')??'').trim();
  const categoryId=String(formData.get('categoryId')??'').trim();
  const requested=money(formData.get('amount'));
  if(!caseId||!categoryId||requested===null||!requested.isPositive()) return redirect('/internal-funding?error=مبلغ الاسترداد غير صالح');
  const requestedAmount=requested;
  try{
    const cycles=await rawSql`select id from public.financial_cycles where user_id=${user.id} and status='ACTIVE' order by start_date desc limit 1`;
    if(!cycles[0]) throw new Error('لا توجد دورة مالية نشطة.');
    const cycleId=String(cycles[0].id);
    const debts=await rawSql`
      select s.id as "sourceId",s.priority,
        (coalesce(sum(a.amount+a.growth_contribution),0)-coalesce((select sum(r.amount) from public.internal_funding_repayments r where r.user_id=${user.id} and r.case_id=${caseId} and r.category_id=${categoryId} and r.source_id=s.id and r.status in ('PLANNED','PAID')),0))::text as outstanding
      from public.internal_funding_sources s
      left join public.internal_funding_expense_allocations a on a.source_id=s.id and a.user_id=s.user_id and a.category_id=${categoryId}
      where s.user_id=${user.id} and s.case_id=${caseId}
      group by s.id,s.priority order by s.priority asc`;
    let remaining=requestedAmount;
    const statements:SqlQuery[]=[];
    for(const debt of debts){
      if(!remaining.isPositive()) break;
      const outstanding=Money.parse(String(debt.outstanding??'0')).max(Money.zero());
      const take=remaining.min(outstanding);
      if(!take.isPositive()) continue;
      statements.push(rawSql`insert into public.internal_funding_repayments(user_id,case_id,source_id,category_id,cycle_id,amount,status) values(${user.id},${caseId},${String(debt.sourceId)},${categoryId},${cycleId},${take.toString()},'PLANNED')`);
      remaining=remaining.subtract(take);
    }
    if(remaining.isPositive()) throw new Error('المبلغ المقترح أكبر من مديونية هذا البند المتبقية.');
    await rawSql.transaction(statements);
  }catch(error){
    const message=error instanceof Error?error.message:'تعذر حفظ خطة الاسترداد';
    redirect(`/internal-funding?error=${encodeURIComponent(message.slice(0,180))}`);
  }
  redirect('/internal-funding?planned=1');
}
