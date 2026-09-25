import { describe, expect, it } from 'vitest';
import { calculatePersonalBudget } from '../../src/lib/finance/personal-budget-calculation-engine';

describe('المحرك الحسابي الموحد للميزانية الشخصية',()=>{
  it('يحفظ توازن المال ويحسب المتاح والعجز دون أرقام سالبة قابلة للصرف',()=>{
    const result=calculatePersonalBudget({
      verifiedIncome:'8000.00',
      openingAvailableBalance:'0.00',
      protectedObligations:'3000.00',
      reservedEssentials:'1700.00',
      requiredProtection:'1000.00',
      requiredGoalAllocations:'780.00',
      otherActiveReservations:'0.00',
      calculationConfidence:95,
    });

    expect(result.values.operatingResources).toBe('8000.00');
    expect(result.values.trueAvailable).toBe('1520.00');
    expect(result.values.operatingDeficit).toBe('0.00');
    expect(result.invariants.moneyConservationSatisfied).toBe(true);
    expect(result.invariants.noNegativeSpendableAmount).toBe(true);
    expect(result.invariants.protectedAmountsDoNotExceedResources).toBe(true);
  });

  it('يفصل العجز عن المتاح ولا يعرض متاحًا سالبًا',()=>{
    const result=calculatePersonalBudget({
      verifiedIncome:'5000.00',
      protectedObligations:'3000.00',
      reservedEssentials:'1500.00',
      requiredProtection:'1000.00',
      requiredGoalAllocations:'500.00',
    });

    expect(result.values.rawAvailable).toBe('-1000.00');
    expect(result.values.trueAvailable).toBe('0.00');
    expect(result.values.operatingDeficit).toBe('1000.00');
    expect(result.invariants.protectedAmountsDoNotExceedResources).toBe(false);
  });

  it('لا يدخل الدخل المتوقع في الموارد التشغيلية',()=>{
    const result=calculatePersonalBudget({
      verifiedIncome:'6000.00',
      expectedIncome:'2500.00',
      protectedObligations:'1000.00',
      reservedEssentials:'1000.00',
      requiredProtection:'500.00',
      requiredGoalAllocations:'500.00',
    });

    expect(result.values.expectedIncome).toBe('2500.00');
    expect(result.values.operatingResources).toBe('6000.00');
    expect(result.values.trueAvailable).toBe('3000.00');
  });

  it('يحسب الانحراف ونسبة الاستخدام من نفس الفترة',()=>{
    const result=calculatePersonalBudget({
      verifiedIncome:'8000.00',
      protectedObligations:'0.00',
      reservedEssentials:'0.00',
      requiredProtection:'0.00',
      requiredGoalAllocations:'0.00',
      plannedAmount:'2000.00',
      realizedAmount:'1750.00',
    });

    expect(result.values.varianceAmount).toBe('-250.00');
    expect(result.values.utilizationPercent).toBe('87.50');
  });

  it('يعيد نسبة الاستخدام غير قابلة للحساب عندما يكون المخطط صفرًا',()=>{
    const result=calculatePersonalBudget({
      verifiedIncome:'8000.00',
      protectedObligations:'0.00',
      reservedEssentials:'0.00',
      requiredProtection:'0.00',
      requiredGoalAllocations:'0.00',
      plannedAmount:'0.00',
      realizedAmount:'100.00',
    });

    expect(result.values.utilizationPercent).toBeNull();
  });

  it('يحسب المساهمة المطلوبة للهدف بالتقريب إلى هللة أعلى',()=>{
    const result=calculatePersonalBudget({
      verifiedIncome:'8000.00',
      protectedObligations:'1000.00',
      reservedEssentials:'1000.00',
      requiredProtection:'500.00',
      requiredGoalAllocations:'0.00',
      goalTargetAmount:'10000.00',
      goalFundedAmount:'1000.00',
      remainingGoalCycles:7,
    });

    expect(result.values.goalRemainingAmount).toBe('9000.00');
    expect(result.values.requiredGoalContribution).toBe('1285.72');
  });

  it('يحسب الحد اليومي الاسترشادي من المتاح المرن المتبقي',()=>{
    const result=calculatePersonalBudget({
      verifiedIncome:'8000.00',
      protectedObligations:'1000.00',
      reservedEssentials:'1000.00',
      requiredProtection:'500.00',
      requiredGoalAllocations:'500.00',
      flexibleBudget:'1400.00',
      flexibleRealized:'700.00',
      remainingCycleDays:7,
    });

    expect(result.values.flexibleRemaining).toBe('700.00');
    expect(result.values.dailyGuidance).toBe('100.00');
  });

  it('يستخدم السيولة التشغيلية الحية كمصدر حقيقة دون مضاعفة الدخل المتحقق',()=>{
    const result=calculatePersonalBudget({
      verifiedIncome:'8000.00',
      expectedIncome:'2000.00',
      operatingResourcesOverride:'4200.00',
      protectedObligations:'1000.00',
      reservedEssentials:'900.00',
      requiredProtection:'500.00',
      requiredGoalAllocations:'300.00',
    });

    expect(result.values.verifiedIncome).toBe('8000.00');
    expect(result.values.operatingResources).toBe('4200.00');
    expect(result.values.trueAvailable).toBe('1500.00');
  });

  it('يرفض المدخلات النقدية السالبة في حقول الموارد والحجوزات',()=>{
    expect(()=>calculatePersonalBudget({
      verifiedIncome:'-1.00',
      protectedObligations:'0.00',
      reservedEssentials:'0.00',
      requiredProtection:'0.00',
      requiredGoalAllocations:'0.00',
    })).toThrow('NEGATIVE_PERSONAL_BUDGET_INPUT:verifiedIncome');
  });
});
