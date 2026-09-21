import { describe, expect, it } from "vitest";
import { getLocalGovernanceDocument, LOCAL_GOVERNANCE_DOCUMENTS } from "../../../src/content/governance";
import { governedRoomDetails } from "../../../src/lib/conversations/governed-room-details";

describe("ربط مراجع الحوكمة النافذة بالواجهة", () => {
  it("يعرض المرجع الحالي للعلاقة دون مسمى المستشارين القديم", () => {
    const item=governedRoomDetails.central.policies.find(x=>x.referenceCode==="NMC-POL-06");
    expect(item?.title).toContain("أصحاب المسؤوليات");
    expect(item?.title).not.toContain("المستشارين");
  });

  it("يستخدم مصفوفة الصلاحيات النافذة من CURRENT", () => {
    const doc=getLocalGovernanceDocument("NMC-POL-02");
    expect(doc?.url).toContain("1wO7h__Ny-816agBXJ9m2HNsZLjZN_ggHL6pAf3tBguE");
    expect(doc?.content).toContain("مدير بنك نماء المركزي");
  });

  it("يعطي CURRENT الأولوية ويمنع تكرار referenceCode", () => {
    const codes=LOCAL_GOVERNANCE_DOCUMENTS.map(x=>x.referenceCode);
    expect(new Set(codes).size).toBe(codes.length);
    expect(getLocalGovernanceDocument("NMC-POL-06")?.content).toContain("أصحاب المسؤوليات");
  });

  it("يضيف الدستور وسياسة التعلم والسياسة المركزية للقضايا إلى شاشة المركزي", () => {
    const refs=governedRoomDetails.central.policies.map(x=>x.referenceCode);
    expect(refs).toEqual(expect.arrayContaining(["NMC-CONST-01","NMC-POL-09","NMC-POL-10"]));
  });
});
