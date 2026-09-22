import { describe, expect, it } from "vitest";
import { CENTRAL_ACTIVE_POLICIES } from "../../../src/content/governance/central-active-policies";
import { getLocalGovernanceDocument, LOCAL_GOVERNANCE_DOCUMENTS } from "../../../src/content/governance";
import { governedRoomDetails } from "../../../src/lib/conversations/governed-room-details";

describe("ربط مراجع الحوكمة النافذة بالواجهة", () => {
  it("يعرض سجل السياسات المركزية الجديد تلقائيًا داخل شاشة بنك نماء المركزي", () => {
    const expected=CENTRAL_ACTIVE_POLICIES.map(x=>x.referenceCode);
    const actual=governedRoomDetails.central.policies
      .filter(x=>x.referenceCode.startsWith("NMC-POL-"))
      .map(x=>x.referenceCode);
    expect(actual).toEqual(expected);
  });

  it("يعرض سياسة الصلاحيات الجديدة ويتضمن صلاحيات مدير البنك", () => {
    const doc=getLocalGovernanceDocument("NMC-POL-02");
    expect(doc?.title).toContain("الصلاحيات والتفويض والتصعيد");
    expect(doc?.content).toContain("صلاحيات مدير البنك");
    expect(doc?.content).toContain("أصحاب المسؤوليات");
  });

  it("لا يحتوي السجل النشط على رموز السياسات المركزية القديمة", () => {
    const codes=LOCAL_GOVERNANCE_DOCUMENTS.map(x=>x.referenceCode);
    expect(new Set(codes).size).toBe(codes.length);
    for(const code of [
      "NMC-POL-09","NMC-POL-10","ADV-POL-01","ADV-POL-02",
      "OPS-POL-01","SEC-POL-01","SEC-POL-02","SEC-POL-03",
      "COU-POL-01","COU-POL-02","COU-POL-03","COU-POL-04",
    ]) expect(codes).not.toContain(code);
  });

  it("يثبت أدوار البنوك ومديريها وأصحاب المسؤوليات في السياسات الجديدة", () => {
    expect(getLocalGovernanceDocument("NMC-POL-01")?.content).toContain("مدير كل بنك");
    expect(getLocalGovernanceDocument("NMC-POL-04")?.content).toContain("أصحاب المسؤوليات");
    expect(getLocalGovernanceDocument("NMC-POL-06")?.content).toContain("أصحاب المسؤوليات");
    expect(getLocalGovernanceDocument("NMC-POL-07")?.content).toContain("دور مدير البنك");
  });
});
