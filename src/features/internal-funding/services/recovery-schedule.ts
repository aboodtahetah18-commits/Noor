import { rawSql, type SqlQuery } from '@/infrastructure/db/client';
import { Money } from '@/financial-engine/money';

type DebtGroup={sourceId:string;categoryId:string;principal:Money;growth:Money};

function splitMinor(total:bigint,count:number):bigint[]{
  if(count<1) throw new Error('عدد دفعات الاسترداد غير صالح.');
  const n=BigInt(count),base=total/n,remainder=total%n;
  return Array.from({length:count},(_,i)=>base+(BigInt(i)<remainder?1n:0n));
}

export async function ensureRecoverySchedule(userId:string,caseId:string){
  const caseRows=await rawSql`select id,status,recovery_cycle_count as "recoveryCycleCount" from public.internal_funding_cases where id=${caseId}::uuid and user_id=${userId} limit 1`;
  const fundingCase=caseRows[0];if(!fundingCase)throw new Error('التمويل غير موجود.');
  if(!['ACTIVE','PLANNING','RECOVERY'].includes(String(fundingCase.status)))throw new Error('حالة التمويل لا تسمح ببناء الاسترداد.');
  const count=Number(fundingCase.recoveryCycleCount??0);if(!Number.isInteger(count)||count<1||count>36)throw new Error('عدد دورات الاسترداد غير محدد أو غير صالح.');
  const existing=await rawSql`select count(*)::int as count from public.internal_funding_recovery_schedule where user_id=${userId} and case_id=${caseId}`;
  if(Number(existing[0]?.count??0)>0)return {alreadyBuilt:true,count};

  const groups=await rawSql`
    select a.source_id as "sourceId",a.category_id as "categoryId",sum(a.amount)::text as principal,sum(a.growth_contribution)::text as growth
    from public.internal_funding_expense_allocations a
    where a.user_id=${userId} and a.case_id=${caseId}
    group by a.source_id,a.category_id
    order by a.source_id,a.category_id`;
  if(!groups.length)throw new Error('لا يوجد استخدام فعلي للتمويل؛ لا توجد مديونية استرداد لإنشائها.');
  const statements:SqlQuery[]=[];
  for(const row of groups){
    const group:DebtGroup={sourceId:String(row.sourceId),categoryId:String(row.categoryId),principal:Money.parse(String(row.principal)),growth:Money.parse(String(row.growth))};
    const principalParts=splitMinor(group.principal.minorUnits,count);
    const growthParts=splitMinor(group.growth.minorUnits,count);
    for(let i=0;i<count;i++){
      const principal=Money.fromMinorUnits(principalParts[i]??0n),growth=Money.fromMinorUnits(growthParts[i]??0n);
      if(principal.isZero()&&growth.isZero())continue;
      statements.push(rawSql`insert into public.internal_funding_recovery_schedule(user_id,case_id,source_id,category_id,installment_number,principal_amount,growth_amount,status)
        values(${userId},${caseId},${group.sourceId},${group.categoryId},${i+1},${principal.toString()},${growth.toString()},'PLANNED')
        on conflict(case_id,source_id,category_id,installment_number) do nothing`);
    }
  }
  if(statements.length)await rawSql.transaction(statements);
  return {alreadyBuilt:false,count};
}
