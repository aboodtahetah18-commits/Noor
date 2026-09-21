import { describe, expect, it } from "vitest";
import { calculateConfidenceScore } from "../../src/algorithmic-systems/engines/confidence";
import { investableMoney } from "../../src/algorithmic-systems/engines/investment";
import { obligationCoverageGap } from "../../src/algorithmic-systems/engines/obligations";
import { routeCase } from "../../src/algorithmic-systems/orchestration/routing";

describe("منظومات نماء الخوارزمية", () => {
  it("يخفض الثقة عند تعارض البيانات", () => {
    expect(calculateConfidenceScore({
      sourceQuality:100,
      completeness:100,
      recency:100,
      historyDepth:100,
      consistency:100,
      syncStatus:"CONFLICT"
    })).toBe(49);
  });

  it("لا يعتبر المال المحمي أو المحجوز قابلًا للاستثمار", () => {
    expect(investableMoney({
      availableBalance:10000,
      reservedAmount:1000,
      protectedAmount:3000,
      realizedIncome:12000,
      expectedIncome:5000,
      dueObligations:2500,
      nearTermGoalNeed:1500,
      minimumLivingNeed:2000
    })).toBe(0);
  });

  it("يحسب فجوة تغطية الالتزامات دون استخدام الحماية", () => {
    expect(obligationCoverageGap({
      availableBalance:3000,
      reservedAmount:500,
      protectedAmount:1000,
      realizedIncome:5000,
      expectedIncome:4000,
      dueObligations:2500,
      nearTermGoalNeed:0,
      minimumLivingNeed:1000
    })).toBe(2000);
  });

  it("يوجه حالات الالتزام إلى المسؤول والمنظومة المختصين", () => {
    const result = routeCase({caseType:"obligation_due", liquidityImpactMaterial:true});
    expect(result.primaryDomain).toBe("OBLIGATIONS_DEBT");
    expect(result.owners).toContain("مسؤول الالتزامات");
    expect(result.systems).toContain("منظومة المخاطر المركزية");
  });
});
