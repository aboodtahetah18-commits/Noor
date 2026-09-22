import { describe, expect, it } from "vitest";
import { getLocalGovernanceDocument, LOCAL_GOVERNANCE_DOCUMENTS } from "../../../src/content/governance";
import { governedRoomDetails } from "../../../src/lib/conversations/governed-room-details";

describe("ربط مراجع الحوكمة النافذة بالواجهة", () => {
  it("يعرض الحزمة المركزية الجديدة كاملة داخل شاشة بنك نماء المركزي", () => {
    const refs=governedRoomDetails.central.policies.map(x=>x.referenceCode);
    expect(refs).toEqual(expect.arrayContaining([
      "NMC-CONST-01",
      "NMC-POL-01","NMC-POL-02","NMC-POL-03","NMC-POL-04",
      "NMC-POL-05","NMC-POL-06","NMC-POL-07","NMC-POL-08",
    ]));
    expect(refs).not.toContain("NMC-POL-09");
    expect(refs).not.toContain("NMC-POL-10");
  });

  it("يعرض سياسة الصلاحيات الجديدة ويتضمن صلاحيات مدير البنك", () => {
    const doc=getLocalGovernanceDocument("NMC-POL-02");
    expect(doc?.title).toContain("الصلاحيات والتفويض والتصعيد");
    expect(doc?.content).toContain("صلاحيات مدير البنك");
    expect(doc?.content).toContain("أصحاب المسؤوليات");
  });

  it("يعطي CURRENT الأولوية ويمنع تكرار referenceCode ويستبعد المراجع المؤرشفة", () => {
    const codes=LOCAL_GOVERNANCE_DOCUMENTS.map(x=>x.referenceCode);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).not.toContain("NMC-POL-09");
    expect(codes).not.toContain("NMC-POL-10");
    expect(codes).not.toContain("ADV-POL-01");
    expect(codes).not.toContain("SEC-POL-01");
    expect(codes).not.toContain("COU-POL-01");
    expect(codes).not.toContain("COU-POL-03");
  });

  it("يثبت أدوار البنوك ومديريها وأصحاب المسؤوليات في السياسات الجديدة", () => {
    expect(getLocalGovernanceDocument("NMC-POL-01")?.content).toContain("مدير كل بنك");
    expect(getLocalGovernanceDocument("NMC-POL-04")?.content).toContain("أصحاب المسؤوليات");
    expect(getLocalGovernanceDocument("NMC-POL-06")?.content).toContain("أصحاب المسؤوليات");
    expect(getLocalGovernanceDocument("NMC-POL-07")?.content).toContain("دور مدير البنك");
  });
});
