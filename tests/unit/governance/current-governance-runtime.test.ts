import { describe, expect, it } from "vitest";
import { COMPACT_CORE_GOVERNANCE_DOCUMENTS } from "../../../src/content/governance/compact-core-documents";
import { getLocalGovernanceDocument, LOCAL_GOVERNANCE_DOCUMENTS } from "../../../src/content/governance";
import { governedRoomDetails } from "../../../src/lib/conversations/governed-room-details";

describe("ربط مراجع الحوكمة النافذة بالواجهة", () => {
  it("يعرض المراجع الحاكمة الحالية المرتبطة بالمركزي من المصدر التنفيذي المختصر", () => {
    const expected=COMPACT_CORE_GOVERNANCE_DOCUMENTS
      .filter((document)=>governedRoomDetails.central.sourceRefs.includes(document.referenceCode))
      .map((document)=>document.referenceCode)
      .sort();
    const actual=[...governedRoomDetails.central.records,...governedRoomDetails.central.policies]
      .map((document)=>document.referenceCode)
      .filter((referenceCode,index,all)=>all.indexOf(referenceCode)===index)
      .sort();
    expect(actual).toEqual(expected);
  });

  it("لا يعرض رموز السياسات واللوائح المركزية القديمة داخل شاشة المركزي", () => {
    const actual=[...governedRoomDetails.central.records,...governedRoomDetails.central.policies]
      .map((document)=>document.referenceCode);
    expect(actual.some((referenceCode)=>referenceCode.startsWith("NMC-POL-"))).toBe(false);
    expect(actual.some((referenceCode)=>referenceCode.startsWith("NMC-REG-"))).toBe(false);
  });

  it("يعرض المرجع المختصر للصلاحيات ويتضمن حدود أصحاب المسؤوليات ومديري البنوك", () => {
    const doc=getLocalGovernanceDocument("NMC-CORE-07");
    expect(doc?.title).toContain("الصلاحيات والحوكمة واللجان");
    expect(doc?.content).toContain("حدود أصحاب المسؤوليات");
    expect(doc?.content).toContain("حدود مديري البنوك");
  });

  it("يحافظ السجل الحاكم الحالي على رموز فريدة ولا يعيد المصادر القديمة", () => {
    const codes=LOCAL_GOVERNANCE_DOCUMENTS.map((document)=>document.referenceCode);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.every((referenceCode)=>referenceCode.startsWith("NMC-CORE-"))).toBe(true);
    for(const code of [
      "NMC-POL-09","NMC-POL-10","ADV-POL-01","ADV-POL-02",
      "OPS-POL-01","SEC-POL-01","SEC-POL-02","SEC-POL-03",
      "COU-POL-01","COU-POL-02","COU-POL-03","COU-POL-04",
    ]) expect(codes).not.toContain(code);
  });

  it("يثبت المرجع الحالي الفصل بين الحساب والتوصية والتنفيذ المالي الخارجي", () => {
    expect(getLocalGovernanceDocument("NMC-CORE-01")?.content).toContain("قاعدة الرقم القابل للتفسير");
    expect(getLocalGovernanceDocument("NMC-CORE-07")?.content).toContain("لا ينفذ حركة مالية");
    expect(getLocalGovernanceDocument("NMC-CORE-07")?.content).toContain("ينفذها المستخدم");
  });
});
