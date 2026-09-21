import { describe, expect, it } from "vitest";
import { algorithmRoleByKey } from "../../../src/lib/governance/algorithm-role-registry";

describe("اتساق الهيكل المؤسسي للأدوار", () => {
  it("يفصل بين محافظ نماء ومدير بنك نماء المركزي", () => {
    expect(algorithmRoleByKey("central-governor")?.name).toBe("محافظ نماء");
    expect(algorithmRoleByKey("central-bank-manager")?.name).toBe("مدير بنك نماء المركزي");
    expect(algorithmRoleByKey("central-bank-manager")?.reportsTo).toBe("محافظ نماء");
  });

  it("يجعل مديري البنوك تحت إشراف محافظ نماء", () => {
    expect(algorithmRoleByKey("hilal-manager")?.reportsTo).toBe("محافظ نماء");
    expect(algorithmRoleByKey("solvency-manager")?.reportsTo).toBe("محافظ نماء");
    expect(algorithmRoleByKey("assets-manager")?.reportsTo).toBe("محافظ نماء");
  });

  it("يجعل أصحاب المسؤوليات تحت الإشراف التشغيلي لمدير بنك نماء المركزي", () => {
    for (const key of [
      "budget-spending-owner",
      "obligations-owner",
      "goals-owner",
      "investment-owner",
      "liquidity-protection-owner",
    ]) {
      expect(algorithmRoleByKey(key)?.reportsTo).toBe("مدير بنك نماء المركزي");
    }
  });

  it("يبقي المستشار الاقتصادي دورًا استشاريًا أفقيًا تحت التشغيل المركزي", () => {
    expect(algorithmRoleByKey("economic-advisor")?.reportsTo).toBe("مدير بنك نماء المركزي");
  });
});
