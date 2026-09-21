import { describe, expect, it } from "vitest";
import { algorithmRoleByKey } from "../../../src/lib/governance/algorithm-role-registry";

describe("اتساق الهيكل المؤسسي للأدوار", () => {
  it("يفصل بين محافظ بنك نماء المركزي ومدير بنك نماء المركزي", () => {
    expect(algorithmRoleByKey("central-governor")?.name).toBe("محافظ بنك نماء المركزي");
    expect(algorithmRoleByKey("central-bank-manager")?.name).toBe("مدير بنك نماء المركزي");
    expect(algorithmRoleByKey("central-bank-manager")?.reportsTo).toBe("محافظ بنك نماء المركزي");
  });

  it("يجعل مديري البنوك تحت إشراف محافظ بنك نماء المركزي", () => {
    expect(algorithmRoleByKey("hilal-manager")?.reportsTo).toBe("محافظ بنك نماء المركزي");
    expect(algorithmRoleByKey("solvency-manager")?.reportsTo).toBe("محافظ بنك نماء المركزي");
    expect(algorithmRoleByKey("assets-manager")?.reportsTo).toBe("محافظ بنك نماء المركزي");
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

  it("يعرض لكل دور حاكم صلاحيات صريحة قابلة للعرض", () => {
    for (const key of ["central-governor","central-bank-manager","hilal-manager","solvency-manager","assets-manager"]) {
      expect(algorithmRoleByKey(key)?.authorities.length).toBeGreaterThan(0);
    }
  });
});
