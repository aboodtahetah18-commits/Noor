import { rawSql, type SqlQuery } from '@/infrastructure/db/client';
import { Money } from '@/financial-engine/money';
import { ensureRecoverySchedule } from '@/features/internal-funding/services/recovery-schedule';
import { assignRecoveryInstallmentsToCycle } from '@/features/internal-funding/services/assign-recovery-installments-to-cycle';

export async function beginInternalFundingRecovery(userId:string,caseId:string){
  const cases=await rawSql`select id,status from public.internal_funding_cases where id=${caseId}::uuid and user_id=${userId} limit 1`;
  const fundingCase=cases[0];if(!fundingCase)throw new Error('التمويل غير موجود.');
  if(String(fundingCase.status)==='RECOVERY'){
    const result=await ensureRecoverySchedule(userId,caseId);
    const cycles=await rawSql`select id from public.financial_cycles where user_id=${userId} and status='ACTIVE' order by start_date desc limit 1`;
    if(cycles[0])await assignRecoveryInstallmentsToCycle(userId,String(cycles[0].id));
    return result;
  }
  if(!['PLANNING','ACTIVE'].includes(String(fundingCase.status)))throw new Error('حالة التمويل لا تسمح ببدء الاسترداد.');
  const sources=await rawSql`select id,approved_amount::text as "approvedAmount",used_amount::text as "usedAmount" from public.internal_funding_sources where user_id=${userId} and case_id=${caseId}`;
  if(!sources.length)throw new Error('لا توجد مصادر لهذا التمويل.');
  const statements:SqlQuery[]=[];
  for(const source of sources){
    const approved=Money.parse(String(source.approvedAmount??'0'));
    const used=Money.parse(String(source.usedAmount??'0'));
    const unused=approved.subtract(used).max(Money.zero());
    statements.push(rawSql`update public.internal_funding_sources set returned_unused_amount=${unused.toString()},updated_at=now() where id=${String(source.id)} and user_id=${userId}`);
  }
  statements.push(rawSql`update public.internal_funding_cases set status='RECOVERY',updated_at=now() where id=${caseId} and user_id=${userId} and status in ('PLANNING','ACTIVE')`);
  await rawSql.transaction(statements);
  const result=await ensureRecoverySchedule(userId,caseId);
  const cycles=await rawSql`select id from public.financial_cycles where user_id=${userId} and status='ACTIVE' order by start_date desc limit 1`;
  if(cycles[0])await assignRecoveryInstallmentsToCycle(userId,String(cycles[0].id));
  return result;
}
