/**
 * Namaa advisory allocation engine.
 * All amounts are non-negative integer halalas. No database writes, automatic
 * transfers, investment orders or policy mutations are performed here.
 * Approvals must use the existing bank-governance decision workflow.
 */
export type AllocationBucket = 'OPERATIONS' | 'RESERVE' | 'INVESTMENTS';
export interface AllocationInput {
  incomeHalalas:number;
  operatingNeedHalalas:number;
  operatingCashHalalas:number;
  reserveCashHalalas:number;
  protectedReserveHalalas:number;
  /** Optional amount of reserve replenishment desired above the protected floor. */
  reserveTargetHalalas:number;
}
export interface AllocationPlan {
  allocations:Record<AllocationBucket,number>;
  operatingShortfallHalalas:number;
  reserveShortfallHalalas:number;
  requiresApproval:true;
  explanation:string[];
}
const money=(value:number):void=>{
  if(!Number.isSafeInteger(value)||value<0)throw new Error('INVALID_HALALAS');
};
function safeAdd(a:number,b:number):number{
  const result=a+b;
  if(!Number.isSafeInteger(result))throw new Error('HALALAS_OVERFLOW');
  return result;
}
export function smartAllocate(input:AllocationInput):AllocationPlan{
  for(const v of Object.values(input))money(v);
  const operationalGap=Math.max(0,input.operatingNeedHalalas-input.operatingCashHalalas);
  const requiredReserve=Math.max(input.protectedReserveHalalas,input.reserveTargetHalalas);
  const reserveGap=Math.max(0,requiredReserve-input.reserveCashHalalas);
  const operations=Math.min(input.incomeHalalas,operationalGap);
  const remainingAfterOperations=input.incomeHalalas-operations;
  const reserve=Math.min(remainingAfterOperations,reserveGap);
  const investments=remainingAfterOperations-reserve;
  return {
    allocations:{OPERATIONS:operations,RESERVE:reserve,INVESTMENTS:investments},
    operatingShortfallHalalas:operationalGap-operations,
    reserveShortfallHalalas:reserveGap-reserve,
    requiresApproval:true,
    explanation:[
      'تغطية التشغيل والالتزامات المستحقة أولاً',
      'استكمال الاحتياطي إلى حد الحماية والهدف قبل الاستثمار',
      investments>0?'المتبقي متاح كمقترح استثمار بعد موافقة المستخدم':'لا مخصص للاستثمار حتى تُغطى الأولويات',
    ],
  };
}

export interface MonthlyCashFlow { incomeHalalas:number; spendingHalalas:number }
export interface CashFlowInput {
  history:readonly MonthlyCashFlow[];
  currentOperatingCashHalalas:number;
  expectedMonthlyIncomeHalalas:number;
  knownNextMonthObligationsHalalas:number;
  /** Safety buffer above zero: crossing it triggers a warning. */
  operatingSafetyFloorHalalas:number;
}
export interface CashFlowForecast {
  estimatedMonthlySpendingHalalas:number;
  projectedNextMonthEndHalalas:number;
  likelyLiquidityShortfallHalalas:number;
  estimatedMonthsToSafetyFloor:number|null;
  reserveSupportSuggestedHalalas:number;
  confidence:'LOW'|'MEDIUM';
  technique:'WEIGHTED_MOVING_AVERAGE';
  requiresApproval:true;
}
export function predictiveCashFlow(input:CashFlowInput):CashFlowForecast{
  for(const v of [input.currentOperatingCashHalalas,input.expectedMonthlyIncomeHalalas,input.knownNextMonthObligationsHalalas,input.operatingSafetyFloorHalalas])money(v);
  if(input.history.length>12)throw new Error('FORECAST_HISTORY_LIMIT');
  for(const h of input.history){money(h.incomeHalalas);money(h.spendingHalalas)}
  // Three recent months, oldest to newest, weighted 1:2:3. Deterministic
  // statistical learning, no external model or sensitive-data transfer.
  const recent=input.history.slice(-3);
  let weighted=0,weights=0;
  recent.forEach((h,i)=>{const weight=i+1;weighted=safeAdd(weighted,h.spendingHalalas*weight);weights+=weight});
  if(!Number.isSafeInteger(weighted))throw new Error('HALALAS_OVERFLOW');
  const monthly=weights?Math.round(weighted/weights):0;
  const monthlyOut=safeAdd(monthly,input.knownNextMonthObligationsHalalas);
  const next=input.currentOperatingCashHalalas+input.expectedMonthlyIncomeHalalas-monthlyOut;
  if(!Number.isSafeInteger(next))throw new Error('HALALAS_OVERFLOW');
  const gap=Math.max(0,input.operatingSafetyFloorHalalas-next);
  const netBurn=monthlyOut-input.expectedMonthlyIncomeHalalas;
  const months=netBurn>0?Math.max(0,(input.currentOperatingCashHalalas-input.operatingSafetyFloorHalalas)/netBurn):null;
  return{
    estimatedMonthlySpendingHalalas:monthly,
    projectedNextMonthEndHalalas:next,
    likelyLiquidityShortfallHalalas:gap,
    estimatedMonthsToSafetyFloor:months,
    reserveSupportSuggestedHalalas:gap,
    confidence:recent.length>=3?'MEDIUM':'LOW',
    technique:'WEIGHTED_MOVING_AVERAGE',
    requiresApproval:true,
  };
}
export interface RebalanceInput {
  incomingSurplusHalalas:number;
  reserveCashHalalas:number;
  protectedReserveHalalas:number;
  reserveTargetHalalas:number;
  proposedInvestmentHalalas:number;
}
export interface RebalancePlan {
  reserveReplenishmentHalalas:number;
  investmentAllocationHalalas:number;
  investmentReductionHalalas:number;
  reserveGapRemainingHalalas:number;
  reserveBelowSafetyFloor:boolean;
  requiresApproval:true;
}
export function dynamicRebalance(input:RebalanceInput):RebalancePlan{
  for(const v of Object.values(input))money(v);
  const target=Math.max(input.protectedReserveHalalas,input.reserveTargetHalalas);
  const gap=Math.max(0,target-input.reserveCashHalalas);
  const replenish=Math.min(gap,input.incomingSurplusHalalas);
  const availableAfterReserve=input.incomingSurplusHalalas-replenish;
  const invest=Math.min(input.proposedInvestmentHalalas,availableAfterReserve);
  return{
    reserveReplenishmentHalalas:replenish,
    investmentAllocationHalalas:invest,
    investmentReductionHalalas:input.proposedInvestmentHalalas-invest,
    reserveGapRemainingHalalas:gap-replenish,
    reserveBelowSafetyFloor:input.reserveCashHalalas<input.protectedReserveHalalas,
    requiresApproval:true,
  };
}
