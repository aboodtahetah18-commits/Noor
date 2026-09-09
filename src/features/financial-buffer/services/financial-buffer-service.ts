import { rawSql } from '@/infrastructure/db/client';
import { Money } from '@/financial-engine/money';
import { calculateSafeToSpend } from '@/financial-engine/safe-to-spend';

export type FinancialBufferMode='FIXED'|'PERCENT_INCOME'|'MAX_FIXED_PERCENT';
export type FinancialBufferPolicy={id:string;mode:FinancialBufferMode;fixedAmount:string;percentBps:number;updatedAt:string};

function percentOf(amount:Money,bps:number):Money{
  return Money.fromMinorUnits((amount.minorUnits*BigInt(bps))/10000n);
}

export async function getActiveFinancialBufferPolicy(userId:string):Promise<FinancialBufferPolicy|null>{
  const rows=await rawSql`select id::text,mode,fixed_amount::text,percent_bps,updated_at::text
    from public.financial_buffer_policies where user_id=${userId} and is_active=true order by updated_at desc limit 1`;
  const r=rows[0] as Record<string,unknown>|undefined;
  if(!r)return null;
  return {id:String(r.id),mode:String(r.mode) as FinancialBufferMode,fixedAmount:String(r.fixed_amount),percentBps:Number(r.percent_bps),updatedAt:String(r.updated_at)};
}

export function calculateRequiredFinancialBuffer(policy:FinancialBufferPolicy,cycleIncome:Money):Money{
  const fixed=Money.parse(policy.fixedAmount);
  const percent=percentOf(cycleIncome,policy.percentBps);
  if(policy.mode==='FIXED')return fixed;
  if(policy.mode==='PERCENT_INCOME')return percent;
  return fixed.max(percent);
}

export async function calculateClosingSafeToSpend(userId:string,cycleId:string){
  const policy=await getActiveFinancialBufferPolicy(userId);
  if(!policy)return {success:false as const,code:'BUFFER_POLICY_REQUIRED' as const,message:'اعتمد قاعدة الاحتياطي المالي قبل إغلاق الدورة.'};
  const rows=await rawSql`select
      coalesce((select sum(balance) from public.account_balances_v where user_id=${userId}),0)::text available_liquidity,
      coalesce((select sum(amount) from public.obligation_occurrences where user_id=${userId} and is_reserved=true and status in ('UPCOMING','DUE','OVERDUE')),0)::text reserved_obligations,
      coalesce((select sum(amount) from public.transactions where user_id=${userId} and cycle_id=${cycleId}::uuid and transaction_type='INCOME' and status='POSTED'),0)::text actual_income,
      coalesce((select sum(expected_amount) from public.expected_incomes where user_id=${userId} and cycle_id=${cycleId}::uuid),0)::text expected_income`;
  const r=(rows[0]??{}) as Record<string,unknown>;
  const actualIncome=Money.parse(String(r.actual_income??'0'));
  const expectedIncome=Money.parse(String(r.expected_income??'0'));
  const basisIncome=actualIncome.isPositive()?actualIncome:expectedIncome;
  const requiredFinancialBuffer=calculateRequiredFinancialBuffer(policy,basisIncome);
  const result=calculateSafeToSpend({
    availableLiquidity:Money.parse(String(r.available_liquidity??'0')),
    reservedUnpaidObligations:Money.parse(String(r.reserved_obligations??'0')),
    remainingEssentialNeeds:Money.zero(),
    protectedSavings:Money.zero(),
    protectedEmergencyAllocation:Money.zero(),
    protectedGoalAllocations:Money.zero(),
    requiredFinancialBuffer,
  });
  return {success:true as const,policy,requiredFinancialBuffer:requiredFinancialBuffer.toString(),availableLiquidity:String(r.available_liquidity??'0'),reservedObligations:String(r.reserved_obligations??'0'),safeToSpend:result.displayAmount.toString(),protectionDeficit:result.protectionDeficit.toString(),status:result.status};
}
