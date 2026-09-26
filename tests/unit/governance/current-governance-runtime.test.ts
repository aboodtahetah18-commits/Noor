import { describe, expect, it } from "vitest";
import { COMPACT_CORE_GOVERNANCE_DOCUMENTS } from "../../../src/content/governance/compact-core-documents";
import { getLocalGovernanceDocument, LOCAL_GOVERNANCE_DOCUMENTS } from "../../../src/content/governance";
import { COMPACT_AUTHORITIES, compactProcedure } from "../../../src/lib/governance/compact-authority-model";
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

  it("يربط المرجع NMC-CORE-07 بنطاق الصلاحيات الحالي لأصحاب المسؤوليات ومديري البنوك", () => {
    const doc=getLocalGovernanceDocument("NMC-CORE-07");
    expect(doc?.referenceCode).toBe("NMC-CORE-07");
    expect(COMPACT_AUTHORITIES.some((authority)=>authority.allowedKinds.includes("responsibility_owner"))).toBe(true);
    expect(COMPACT_AUTHORITIES.some((authority)=>authority.allowedKinds.includes("bank_manager"))).toBe(true);
    const approval=COMPACT_AUTHORITIES.find((authority)=>authority.action==="APPROVE_GOVERNANCE_CHANGE");
    expect(approval?.allowedKinds).toEqual(["council"]);
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

  it("يثبت عقد الصلاحيات الفصل بين القرار الداخلي والتنفيذ المالي الخارجي", () => {
    expect(getLocalGovernanceDocument("NMC-CORE-01")?.referenceCode).toBe("NMC-CORE-01");
    expect(getLocalGovernanceDocument("NMC-CORE-07")?.referenceCode).toBe("NMC-CORE-07");
    expect(COMPACT_AUTHORITIES).toHaveLength(7);
    expect(COMPACT_AUTHORITIES.every((authority)=>authority.externalExecution===false)).toBe(true);
    const verification=compactProcedure("VERIFY_USER_EXECUTION");
    expect(verification?.key).toBe("VERIFY_USER_EXECUTION");
    expect(verification?.ownerKinds).toEqual(["operations","secretary","central_bank_manager"]);
  });
});
