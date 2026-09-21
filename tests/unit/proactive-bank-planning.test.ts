import { describe, expect, it } from "vitest";
import type { BankForwardNeed } from "../../src/algorithmic-systems/domain/interbank-planning";
import {
  buildActiveGoal,
  negotiateInterbankAllocation,
  shouldProactivelyOpenCase,
  validateForwardNeed
} from "../../src/algorithmic-systems/orchestration/proactive-bank-planning";

const malaaNeed:BankForwardNeed = {
  id:"malaa-protection-gap",
  bank:"MALAA",
  domain:"LIQUIDITY_PROTECTION",
  title:"رفع احتياط الحماية",
  currentAmount:8000,
  targetAmount:14000,
  gapAmount:6000,
  horizonDays:60,
  minimumAcceptableAmount:3000,
  idealAmount:6000,
  priority:"HIGH",
  rationale:"إعادة بناء قدرة تحمل الصدمات",
  sourceCandidates:["فائض الدورة","مكافأة محققة"],
  status:"ACTIVE",
  confidenceScore:90
};

describe("التخطيط والمبادرة بين بنوك نماء", () => {
  it("يفتح حالة استباقية للاحتياج المرتفع القريب", () => {
    expect(validateForwardNeed(malaaNeed)).toEqual([]);
    expect(shouldProactivelyOpenCase(malaaNeed)).toBe(true);
  });

  it("يحوله إلى هدف نماء نشط دون تغيير ملكية البنك", () => {
    const goal = buildActiveGoal(malaaNeed,["HILAL","ASSETS"]);
    expect(goal.owningBank).toBe("MALAA");
    expect(goal.supportingBanks).toEqual(["HILAL","ASSETS"]);
    expect(goal.targetAmount).toBe(14000);
  });

  it("يفاوض على المال المتاح ويرفع التعارض للمركزي عند عدم كفاية المال", () => {
    const result = negotiateInterbankAllocation(4000,[malaaNeed],[
      {
        bank:"MALAA",
        requestedAmount:6000,
        minimumAmount:3000,
        rationale:"فجوة حماية",
        objections:[],
        conditionalConcessions:["تمديد إعادة البناء إلى ثلاثة أشهر"]
      }
    ]);
    expect(result.allocations[0]?.amount).toBe(4000);
    expect(result.requiresCentralReview).toBe(true);
    expect(result.requiresUserAction).toBe(true);
  });
});
