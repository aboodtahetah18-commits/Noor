import { Money, sumMoney } from '@/financial-engine/money';
import { calculatePercentage } from '@/financial-engine/percentage';
import { assertKnownPersonalBudgetVariable } from '@/lib/finance/personal-budget-variable-registry';

export type PersonalBudgetCalculationInputs={
  verifiedIncome:string;
  expectedIncome?:string;
  openingAvailableBalance?:string;
  verifiedOperatingInflows?:string;
  excludedOperatingFunds?:string;
  operatingResourcesOverride?:string;
  protectedObligations:string;
  reservedEssentials:string;
  requiredProtection:string;
  requiredGoalAllocations:string;
  otherActiveReservations?:string;
  plannedAmount?:string;
  realizedAmount?:string;
  netRealizedSavings?:string;
  flexibleBudget?:string;
  flexibleRealized?:string;
  remainingCycleDays?:number;
  goalTargetAmount?:string;
  goalFundedAmount?:string;
  remainingGoalCycles?:number;
  currentAvailableBalance?:string;
  confirmedRemainingOutflows?:string;
  forecastEligibleInflows?:string;
  calculationConfidence?:number;
};

export type PersonalBudgetCalculationTraceItem={
  variable:string;
  arabicName:string;
  formula:string;
  value:string|null;
  status:'CALCULATED'|'NOT_APPLICABLE';
  inputs:Record<string,string|number|null>;
};

export type PersonalBudgetCalculationResult={
  engineVersion:'NMC-PBCE-1.0';
  calculatedAt:string;
  values:{
    verifiedIncome:string;
    expectedIncome:string;
    operatingResources:string;
    protectedObligations:string;
    reservedEssentials:string;
    requiredProtection:string;
    requiredGoalAllocations:string;
    otherActiveReservations:string;
    rawAvailable:string;
    trueAvailable:string;
    operatingDeficit:string;
    trueSurplus:string;
    plannedAmount:string;
    realizedAmount:string;
    varianceAmount:string;
    utilizationPercent:string|null;
    netRealizedSavings:string;
    savingsRatePercent:string|null;
    goalRemainingAmount:string|null;
    requiredGoalContribution:string|null;
    safeGoalCapacity:string|null;
    flexibleRemaining:string|null;
    remainingCycleDays:number|null;
    dailyGuidance:string|null;
    projectedEndBalance:string|null;
    calculationConfidence:number;
  };
  invariants:{
    moneyConservationSatisfied:boolean;
    noNegativeSpendableAmount:boolean;
    protectedAmountsDoNotExceedResources:boolean;
  };
  trace:PersonalBudgetCalculationTraceItem[];
};

function parseMoney(value:string|undefined,field:string){
  try{
    return Money.parse(value??'0.00');
  }catch{
    throw new Error('INVALID_PERSONAL_BUDGET_MONEY:'+field);
  }
}

function nonNegative(value:Money){
  return value.max(Money.zero());
}

function nonNegativeInput(value:string|undefined,field:string){
  const money=parseMoney(value,field);
  if(money.isNegative()) throw new Error('NEGATIVE_PERSONAL_BUDGET_INPUT:'+field);
  return money;
}

function percentString(numerator:Money,denominator:Money){
  if(!denominator.isPositive()) return null;
  return calculatePercentage(numerator.minorUnits,denominator.minorUnits)?.percent??null;
}

function traceItem(
  variable:string,
  formula:string,
  value:string|null,
  inputs:Record<string,string|number|null>,
):PersonalBudgetCalculationTraceItem{
  const definition=assertKnownPersonalBudgetVariable(variable);
  return {
    variable,
    arabicName:definition.arabicName,
    formula,
    value,
    status:value===null?'NOT_APPLICABLE':'CALCULATED',
    inputs,
  };
}

function safeConfidence(value:number|undefined){
  if(value===undefined)return 100;
  if(!Number.isFinite(value))return 0;
  return Math.min(100,Math.max(0,Math.round(value)));
}

export function calculatePersonalBudget(input:PersonalBudgetCalculationInputs):PersonalBudgetCalculationResult{
  const verifiedIncome=nonNegativeInput(input.verifiedIncome,'verifiedIncome');
  const expectedIncome=nonNegativeInput(input.expectedIncome,'expectedIncome');
  const openingAvailableBalance=nonNegativeInput(input.openingAvailableBalance,'openingAvailableBalance');
  const verifiedOperatingInflows=nonNegativeInput(input.verifiedOperatingInflows,'verifiedOperatingInflows');
  const excludedOperatingFunds=nonNegativeInput(input.excludedOperatingFunds,'excludedOperatingFunds');
  const protectedObligations=nonNegativeInput(input.protectedObligations,'protectedObligations');
  const reservedEssentials=nonNegativeInput(input.reservedEssentials,'reservedEssentials');
  const requiredProtection=nonNegativeInput(input.requiredProtection,'requiredProtection');
  const requiredGoalAllocations=nonNegativeInput(input.requiredGoalAllocations,'requiredGoalAllocations');
  const otherActiveReservations=nonNegativeInput(input.otherActiveReservations,'otherActiveReservations');

  const grossOperatingResources=sumMoney([
    openingAvailableBalance,
    verifiedIncome,
    verifiedOperatingInflows,
  ]);
  const calculatedOperatingResources=nonNegative(grossOperatingResources.subtract(excludedOperatingFunds));
  const operatingResources=input.operatingResourcesOverride!==undefined
    ?nonNegativeInput(input.operatingResourcesOverride,'operatingResourcesOverride')
    :calculatedOperatingResources;

  const protectedAndReserved=sumMoney([
    protectedObligations,
    reservedEssentials,
    requiredProtection,
    requiredGoalAllocations,
    otherActiveReservations,
  ]);
  const rawAvailable=operatingResources.subtract(protectedAndReserved);
  const trueAvailable=nonNegative(rawAvailable);
  const operatingDeficit=rawAvailable.isNegative()?rawAvailable.abs():Money.zero();
  const trueSurplus=operatingDeficit.isPositive()?Money.zero():trueAvailable;

  const plannedAmount=nonNegativeInput(input.plannedAmount,'plannedAmount');
  const realizedAmount=nonNegativeInput(input.realizedAmount,'realizedAmount');
  const varianceAmount=realizedAmount.subtract(plannedAmount);
  const utilizationPercent=percentString(realizedAmount,plannedAmount);

  const netRealizedSavings=nonNegativeInput(input.netRealizedSavings,'netRealizedSavings');
  const savingsRatePercent=percentString(netRealizedSavings,verifiedIncome);

  const hasGoal=input.goalTargetAmount!==undefined||input.goalFundedAmount!==undefined||input.remainingGoalCycles!==undefined;
  const goalTargetAmount=nonNegativeInput(input.goalTargetAmount,'goalTargetAmount');
  const goalFundedAmount=nonNegativeInput(input.goalFundedAmount,'goalFundedAmount');
  const goalRemainingAmount=hasGoal?nonNegative(goalTargetAmount.subtract(goalFundedAmount)):null;
  const remainingGoalCycles=input.remainingGoalCycles??null;
  if(remainingGoalCycles!==null&&(!Number.isInteger(remainingGoalCycles)||remainingGoalCycles<0)){
    throw new Error('INVALID_REMAINING_GOAL_CYCLES');
  }
  const requiredGoalContribution=goalRemainingAmount&&remainingGoalCycles!==null&&remainingGoalCycles>0
    ?Money.fromMinorUnits((goalRemainingAmount.minorUnits+BigInt(remainingGoalCycles)-1n)/BigInt(remainingGoalCycles))
    :null;
  const safeGoalCapacity=hasGoal?trueAvailable:null;

  const hasFlexible=input.flexibleBudget!==undefined||input.flexibleRealized!==undefined;
  const flexibleBudget=nonNegativeInput(input.flexibleBudget,'flexibleBudget');
  const flexibleRealized=nonNegativeInput(input.flexibleRealized,'flexibleRealized');
  const flexibleRemaining=hasFlexible?nonNegative(flexibleBudget.subtract(flexibleRealized)):null;

  const remainingCycleDays=input.remainingCycleDays??null;
  if(remainingCycleDays!==null&&(!Number.isInteger(remainingCycleDays)||remainingCycleDays<0)){
    throw new Error('INVALID_REMAINING_CYCLE_DAYS');
  }
  const dailyGuidance=flexibleRemaining&&remainingCycleDays!==null
    ?Money.fromMinorUnits(flexibleRemaining.minorUnits/BigInt(Math.max(1,remainingCycleDays)))
    :null;

  const hasForecast=input.currentAvailableBalance!==undefined
    ||input.confirmedRemainingOutflows!==undefined
    ||input.forecastEligibleInflows!==undefined;
  const currentAvailableBalance=nonNegativeInput(input.currentAvailableBalance,'currentAvailableBalance');
  const confirmedRemainingOutflows=nonNegativeInput(input.confirmedRemainingOutflows,'confirmedRemainingOutflows');
  const forecastEligibleInflows=nonNegativeInput(input.forecastEligibleInflows,'forecastEligibleInflows');
  const projectedEndBalance=hasForecast
    ?currentAvailableBalance.subtract(confirmedRemainingOutflows).add(forecastEligibleInflows)
    :null;

  const calculationConfidence=safeConfidence(input.calculationConfidence);
  const protectedAmountsDoNotExceedResources=protectedAndReserved.compare(operatingResources)<=0;
  const moneyConservationSatisfied=rawAvailable.add(protectedAndReserved).compare(operatingResources)===0;

  const trace:PersonalBudgetCalculationTraceItem[]=[
    traceItem('verifiedIncome','verifiedIncome = مجموع الدخل المتحقق المؤهل',verifiedIncome.toString(),{verifiedIncome:input.verifiedIncome}),
    traceItem('expectedIncome','expectedIncome = دخل تنبؤي مستقل عن المتاح',expectedIncome.toString(),{expectedIncome:input.expectedIncome??'0.00'}),
    traceItem(
      'operatingResources',
      input.operatingResourcesOverride!==undefined
        ?'operatingResources = قيمة السيولة التشغيلية الحالية المعتمدة من مصدر الحقيقة'
        :'openingAvailableBalance + verifiedIncome + verifiedOperatingInflows - excludedOperatingFunds',
      operatingResources.toString(),
      input.operatingResourcesOverride!==undefined
        ?{operatingResourcesOverride:operatingResources.toString()}
        :{
          openingAvailableBalance:openingAvailableBalance.toString(),
          verifiedIncome:verifiedIncome.toString(),
          verifiedOperatingInflows:verifiedOperatingInflows.toString(),
          excludedOperatingFunds:excludedOperatingFunds.toString(),
        },
    ),
    traceItem('protectedObligations','protectedObligations = مجموع الالتزامات المحمية النشطة',protectedObligations.toString(),{protectedObligations:protectedObligations.toString()}),
    traceItem('reservedEssentials','reservedEssentials = المتبقي المحجوز للأساسيات',reservedEssentials.toString(),{reservedEssentials:reservedEssentials.toString()}),
    traceItem('requiredProtection','requiredProtection = حد الحماية الصادر من بنك ملاءة',requiredProtection.toString(),{requiredProtection:requiredProtection.toString()}),
    traceItem('requiredGoalAllocations','requiredGoalAllocations = مجموع مخصصات الأهداف الواجبة',requiredGoalAllocations.toString(),{requiredGoalAllocations:requiredGoalAllocations.toString()}),
    traceItem('otherActiveReservations','otherActiveReservations = مجموع الحجوزات الأخرى غير المكررة',otherActiveReservations.toString(),{otherActiveReservations:otherActiveReservations.toString()}),
    traceItem('trueAvailable','max(0, operatingResources - protectedObligations - reservedEssentials - requiredProtection - requiredGoalAllocations - otherActiveReservations)',trueAvailable.toString(),{
      operatingResources:operatingResources.toString(),
      protectedAndReserved:protectedAndReserved.toString(),
    }),
    traceItem('operatingDeficit','max(0, -rawAvailable)',operatingDeficit.toString(),{rawAvailable:rawAvailable.toString()}),
    traceItem('trueSurplus','operatingDeficit > 0 ? 0 : trueAvailable',trueSurplus.toString(),{trueAvailable:trueAvailable.toString(),operatingDeficit:operatingDeficit.toString()}),
    traceItem('realizedAmount','realizedAmount = المنفذ الفعلي المؤكد',realizedAmount.toString(),{realizedAmount:realizedAmount.toString()}),
    traceItem('plannedAmount','plannedAmount = المخطط لنفس الفترة والنطاق',plannedAmount.toString(),{plannedAmount:plannedAmount.toString()}),
    traceItem('varianceAmount','realizedAmount - plannedAmount',varianceAmount.toString(),{realizedAmount:realizedAmount.toString(),plannedAmount:plannedAmount.toString()}),
    traceItem('utilizationPercent','realizedAmount / plannedAmount × 100',utilizationPercent,{realizedAmount:realizedAmount.toString(),plannedAmount:plannedAmount.toString()}),
    traceItem('netRealizedSavings','netRealizedSavings = الزيادة الصافية المؤكدة في الادخار',netRealizedSavings.toString(),{netRealizedSavings:netRealizedSavings.toString()}),
    traceItem('savingsRatePercent','netRealizedSavings / verifiedIncome × 100',savingsRatePercent,{netRealizedSavings:netRealizedSavings.toString(),verifiedIncome:verifiedIncome.toString()}),
    traceItem('goalRemainingAmount','max(0, goalTargetAmount - goalFundedAmount)',goalRemainingAmount?.toString()??null,{goalTargetAmount:goalTargetAmount.toString(),goalFundedAmount:goalFundedAmount.toString()}),
    traceItem('requiredGoalContribution','ceil(goalRemainingAmount / remainingGoalCycles)',requiredGoalContribution?.toString()??null,{goalRemainingAmount:goalRemainingAmount?.toString()??null,remainingGoalCycles}),
    traceItem('safeGoalCapacity','أكبر تخصيص لا يسبب عجزًا ولا يكسر الحماية؛ في المحرك الأساسي يساوي trueAvailable بعد إدخال الحماية',safeGoalCapacity?.toString()??null,{trueAvailable:trueAvailable.toString(),requiredProtection:requiredProtection.toString()}),
    traceItem('flexibleRemaining','max(0, flexibleBudget - flexibleRealized)',flexibleRemaining?.toString()??null,{flexibleBudget:flexibleBudget.toString(),flexibleRealized:flexibleRealized.toString()}),
    traceItem('remainingCycleDays','عدد الأيام التقويمية المتبقية حتى نهاية الدورة',remainingCycleDays===null?null:String(remainingCycleDays),{remainingCycleDays}),
    traceItem('dailyGuidance','flexibleRemaining / max(1, remainingCycleDays)',dailyGuidance?.toString()??null,{flexibleRemaining:flexibleRemaining?.toString()??null,remainingCycleDays}),
    traceItem('projectedEndBalance','currentAvailableBalance - confirmedRemainingOutflows + forecastEligibleInflows',projectedEndBalance?.toString()??null,{
      currentAvailableBalance:currentAvailableBalance.toString(),
      confirmedRemainingOutflows:confirmedRemainingOutflows.toString(),
      forecastEligibleInflows:forecastEligibleInflows.toString(),
    }),
    traceItem('calculationConfidence','قيمة جودة مستقلة بين 0 و100',String(calculationConfidence),{calculationConfidence}),
  ];

  return {
    engineVersion:'NMC-PBCE-1.0',
    calculatedAt:new Date().toISOString(),
    values:{
      verifiedIncome:verifiedIncome.toString(),
      expectedIncome:expectedIncome.toString(),
      operatingResources:operatingResources.toString(),
      protectedObligations:protectedObligations.toString(),
      reservedEssentials:reservedEssentials.toString(),
      requiredProtection:requiredProtection.toString(),
      requiredGoalAllocations:requiredGoalAllocations.toString(),
      otherActiveReservations:otherActiveReservations.toString(),
      rawAvailable:rawAvailable.toString(),
      trueAvailable:trueAvailable.toString(),
      operatingDeficit:operatingDeficit.toString(),
      trueSurplus:trueSurplus.toString(),
      plannedAmount:plannedAmount.toString(),
      realizedAmount:realizedAmount.toString(),
      varianceAmount:varianceAmount.toString(),
      utilizationPercent,
      netRealizedSavings:netRealizedSavings.toString(),
      savingsRatePercent,
      goalRemainingAmount:goalRemainingAmount?.toString()??null,
      requiredGoalContribution:requiredGoalContribution?.toString()??null,
      safeGoalCapacity:safeGoalCapacity?.toString()??null,
      flexibleRemaining:flexibleRemaining?.toString()??null,
      remainingCycleDays,
      dailyGuidance:dailyGuidance?.toString()??null,
      projectedEndBalance:projectedEndBalance?.toString()??null,
      calculationConfidence,
    },
    invariants:{
      moneyConservationSatisfied,
      noNegativeSpendableAmount:!trueAvailable.isNegative(),
      protectedAmountsDoNotExceedResources,
    },
    trace,
  };
}
