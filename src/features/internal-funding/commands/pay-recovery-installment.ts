import { randomUUID } from 'node:crypto';
import { rawSql, type SqlQuery } from '@/infrastructure/db/client';
import { Money } from '@/financial-engine/money';

export async function payRecoverySourceInstallment(userId:string,input:{caseId:string;sourceId:string;installmentNumber:number;fromAccountId:string}){
  if(!Number.isInteger(input.installmentNumber)||input.installmentNumber<1||input.installmentNumber>36)throw new Error('رقم دفعة الاسترداد غير صالح.');
  const cycleRows=await rawSql`select id from public.financial_cycles where user_id=${userId} and status='ACTIVE' order by start_date desc limit 1`;
  if(!cycleRows[0])throw new Error('لا توجد دورة مالية نشطة لتنفيذ الاسترداد.');
  const cycleId=String(cycleRows[0].id);
  const sourceRows=await rawSql`select s.id,s.account_id as "targetAccountId",s.source_type as "sourceType",c.status from public.internal_funding_sources s join public.internal_funding_cases c on c.id=s.case_id and c.user_id=s.user_id where s.user_id=${userId} and s.id=${input.sourceId}::uuid and s.case_id=${input.caseId}::uuid limit 1`;
  const source=sourceRows[0];if(!source)throw new Error('مصدر الاسترداد غير موجود.');
  if(String(source.status)!=='RECOVERY')throw new Error('التمويل ليس في مرحلة الاسترداد.');
  const targetAccountId=String(source.targetAccountId);
  if(targetAccountId===input.fromAccountId)throw new Error('حساب السداد يجب أن يختلف عن حساب المصدر المسترد.');
  const fromRows=await rawSql`select a.id,coalesce(ab.balance,0)::text as balance from public.accounts a left join public.account_balances_v ab on ab.account_id=a.id and ab.user_id=a.user_id where a.id=${input.fromAccountId}::uuid and a.user_id=${userId} and a.is_active=true limit 1`;
  if(!fromRows[0])throw new Error('حساب السداد غير صالح.');
  const nextRows=await rawSql`select min(installment_number)::int as next from public.internal_funding_recovery_schedule where user_id=${userId} and case_id=${input.caseId}::uuid and source_id=${input.sourceId}::uuid and status='PLANNED'`;
  const nextInstallment=Number(nextRows[0]?.next??0);
  if(nextInstallment&&input.installmentNumber!==nextInstallment)throw new Error(`يجب تنفيذ دفعة الاسترداد رقم ${nextInstallment} لهذا المصدر قبل الدفعات اللاحقة.`);
  const paidThisCycle=await rawSql`select 1 from public.internal_funding_recovery_schedule where user_id=${userId} and case_id=${input.caseId}::uuid and source_id=${input.sourceId}::uuid and cycle_id=${cycleId}::uuid and status='PAID' limit 1`;
  if(paidThisCycle[0])throw new Error('تم تنفيذ دفعة لهذا المصدر في الدورة الحالية بالفعل. الدفعة التالية تخص دورة لاحقة.');

  const schedules=await rawSql`select id,category_id as "categoryId",principal_amount::text as principal,growth_amount::text as growth,total_amount::text as total,status,transfer_id as "transferId" from public.internal_funding_recovery_schedule where user_id=${userId} and case_id=${input.caseId}::uuid and source_id=${input.sourceId}::uuid and installment_number=${input.installmentNumber} order by category_id`;
  if(!schedules.length)throw new Error('لا توجد دفعة مجدولة لهذا المصدر في هذا الرقم.');
  if(schedules.every(x=>String(x.status)==='PAID'))return {alreadyPaid:true,transferId:String(schedules[0]?.transferId??'')};
  if(schedules.some(x=>String(x.status)!=='PLANNED'))throw new Error('حالة جدول الاسترداد غير متجانسة وتحتاج مراجعة.');
  const total=schedules.reduce((sum,row)=>sum.add(Money.parse(String(row.total))),Money.zero());
  if(!total.isPositive())throw new Error('قيمة دفعة الاسترداد صفر.');
  const availableBalance=Money.parse(String(fromRows[0]?.balance??'0'));
  if(availableBalance.compare(total)<0)throw new Error(`رصيد حساب السداد لا يغطي الدفعة. المتاح ${availableBalance.toString()} ريال.`);

  const transferId=randomUUID(),outId=randomUUID(),inId=randomUUID();
  const key=`internal-recovery:${input.caseId}:${input.sourceId}:${input.installmentNumber}`;
  const postedAt=new Date(),transactionDate=postedAt.toISOString().slice(0,10);
  const description=`استرداد تمويل داخلي - دفعة ${input.installmentNumber}`;
  const statements:SqlQuery[]=[
    rawSql`insert into public.transfers(id,user_id,cycle_id,from_account_id,to_account_id,amount,transaction_date,description,idempotency_key,posted_at)
      values(${transferId},${userId},${cycleId},${input.fromAccountId},${targetAccountId},${total.toString()},${transactionDate},${description},${key},${postedAt})
      on conflict(user_id,idempotency_key) do nothing`,
    rawSql`insert into public.transactions(id,user_id,cycle_id,account_id,transaction_type,status,amount,transaction_date,description,transaction_direction,transfer_id,idempotency_key,posted_at)
      select ${outId},${userId},${cycleId},${input.fromAccountId},'TRANSFER','POSTED',${total.toString()},${transactionDate},${description},'OUT',tr.id,${key+':OUT'},${postedAt}
      from public.transfers tr where tr.user_id=${userId} and tr.idempotency_key=${key}
      on conflict(user_id,idempotency_key) where idempotency_key is not null do nothing`,
    rawSql`insert into public.transactions(id,user_id,cycle_id,account_id,transaction_type,status,amount,transaction_date,description,transaction_direction,transfer_id,idempotency_key,posted_at)
      select ${inId},${userId},${cycleId},${targetAccountId},'TRANSFER','POSTED',${total.toString()},${transactionDate},${description},'IN',tr.id,${key+':IN'},${postedAt}
      from public.transfers tr where tr.user_id=${userId} and tr.idempotency_key=${key}
      on conflict(user_id,idempotency_key) where idempotency_key is not null do nothing`,
  ];
  for(const row of schedules){
    statements.push(rawSql`insert into public.internal_funding_repayments(user_id,case_id,source_id,category_id,cycle_id,amount,paid_at,status,recovery_schedule_id,transfer_id,principal_component,growth_component,installment_number)
      select ${userId},${input.caseId},${input.sourceId},${String(row.categoryId)},${cycleId},${String(row.total)},${postedAt},'PAID',${String(row.id)},tr.id,${String(row.principal)},${String(row.growth)},${input.installmentNumber}
      from public.transfers tr where tr.user_id=${userId} and tr.idempotency_key=${key}
      on conflict(recovery_schedule_id) where recovery_schedule_id is not null do nothing`);
    statements.push(rawSql`update public.internal_funding_recovery_schedule rs set status='PAID',cycle_id=${cycleId},transfer_id=tr.id,paid_at=${postedAt},updated_at=now()
      from public.transfers tr where rs.id=${String(row.id)}::uuid and rs.user_id=${userId} and rs.status='PLANNED' and tr.user_id=${userId} and tr.idempotency_key=${key}`);
  }
  statements.push(rawSql`update public.internal_funding_cases c set status='CLOSED',updated_at=now()
    where c.id=${input.caseId}::uuid and c.user_id=${userId} and c.status='RECOVERY'
      and not exists(select 1 from public.internal_funding_recovery_schedule rs where rs.user_id=c.user_id and rs.case_id=c.id and rs.status='PLANNED')`);
  await rawSql.transaction(statements);
  const tr=await rawSql`select id from public.transfers where user_id=${userId} and idempotency_key=${key} limit 1`;
  if(!tr[0])throw new Error('تعذر توثيق تحويل الاسترداد.');
  return {alreadyPaid:false,transferId:String(tr[0].id),amount:total.toString()};
}
