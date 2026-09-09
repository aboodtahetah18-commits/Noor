import { Money } from '@/financial-engine/money';
import { getSalaryAllocationOptimizer } from '@/features/budget-optimizer/queries/get-salary-allocation-optimizer';

export type AffordableRecoveryRecommendation={
  approvedAmount:string;
  growthRate:string;
  totalRepayment:string;
  requestedMonthlyCap:string;
  safeMonthlyCapacity:string;
  recommendedMonthlyRepayment:string;
  recoveryCycleCount:number;
  feasible:boolean;
  reason:string;
};

function rateBasisPoints(value:string):bigint{
  const normalized=value.trim();
  if(!/^\d+(?:\.\d{1,4})?$/.test(normalized)) throw new Error('معدل الزيادة غير صالح.');
  const [whole='0',fraction='']=normalized.split('.');
  const tenThousandths=BigInt(whole)*10_000n+BigInt(fraction.padEnd(4,'0'));
  return tenThousandths>1000n?1000n:tenThousandths;
}
function growthFor(amount:Money,basisPoints:bigint):Money{
  const rounded=(amount.minorUnits*basisPoints+5000n)/10_000n;
  return Money.fromMinorUnits(rounded);
}

export function calculateAffordableRecoveryRecommendation(input:{
  approvedAmount:string;
  requestedMonthlyCap:string;
  safeMonthlyCapacity:string;
  growthRate?:string;
}):AffordableRecoveryRecommendation{
  const growthRate=input.growthRate??'0.10';
  const basisPoints=rateBasisPoints(growthRate);
  const approvedAmount=Money.parse(input.approvedAmount).max(Money.zero());
  const requestedMonthlyCap=Money.parse(input.requestedMonthlyCap).max(Money.zero());
  const safeMonthlyCapacity=Money.parse(input.safeMonthlyCapacity).max(Money.zero());
  const totalRepayment=approvedAmount.add(growthFor(approvedAmount,basisPoints));
  const affordableCap=requestedMonthlyCap.min(safeMonthlyCapacity);

  if(!approvedAmount.isPositive()||!requestedMonthlyCap.isPositive()){
    return {approvedAmount:approvedAmount.toString(),growthRate,totalRepayment:totalRepayment.toString(),requestedMonthlyCap:requestedMonthlyCap.toString(),safeMonthlyCapacity:safeMonthlyCapacity.toString(),recommendedMonthlyRepayment:'0.00',recoveryCycleCount:0,feasible:false,reason:'أدخل مبلغ التمويل والحد الشهري للسداد.'};
  }
  if(!affordableCap.isPositive()){
    return {approvedAmount:approvedAmount.toString(),growthRate,totalRepayment:totalRepayment.toString(),requestedMonthlyCap:requestedMonthlyCap.toString(),safeMonthlyCapacity:safeMonthlyCapacity.toString(),recommendedMonthlyRepayment:'0.00',recoveryCycleCount:0,feasible:false,reason:'لا توجد سعة شهرية آمنة حاليًا بعد الخطة والالتزامات والاستردادات القائمة.'};
  }

  const cycles=(totalRepayment.minorUnits+affordableCap.minorUnits-1n)/affordableCap.minorUnits;
  const recoveryCycleCount=Number(cycles);
  if(recoveryCycleCount>36){
    return {approvedAmount:approvedAmount.toString(),growthRate,totalRepayment:totalRepayment.toString(),requestedMonthlyCap:requestedMonthlyCap.toString(),safeMonthlyCapacity:safeMonthlyCapacity.toString(),recommendedMonthlyRepayment:affordableCap.toString(),recoveryCycleCount,feasible:false,reason:'المبلغ يحتاج أكثر من 36 دورة بالسعة الحالية. خفّض التمويل أو ارفع الحد الشهري بعد تعديل الخطة.'};
  }
  const installmentMinor=(totalRepayment.minorUnits+cycles-1n)/cycles;
  const recommendedMonthlyRepayment=Money.fromMinorUnits(installmentMinor).min(affordableCap);
  return {approvedAmount:approvedAmount.toString(),growthRate,totalRepayment:totalRepayment.toString(),requestedMonthlyCap:requestedMonthlyCap.toString(),safeMonthlyCapacity:safeMonthlyCapacity.toString(),recommendedMonthlyRepayment:recommendedMonthlyRepayment.toString(),recoveryCycleCount,feasible:true,reason:'القسط المقترح بقي داخل الفائض الشهري الحالي، لذلك لا يُحمّل على مخصص البند نفسه.'};
}

export async function recommendAffordableRecovery(
  userId:string,
  input:{approvedAmount:string;requestedMonthlyCap:string;growthRate?:string},
):Promise<AffordableRecoveryRecommendation>{
  const optimizer=await getSalaryAllocationOptimizer(userId);
  const safeMonthlyCapacity=optimizer?.surplus??'0.00';
  return calculateAffordableRecoveryRecommendation({...input,safeMonthlyCapacity});
}
