import { describe, expect, it } from 'vitest';
import {
  compactAuthorityAllowed,
  compactProcedure,
  COMPACT_AUTHORITIES,
  COMPACT_PROCEDURES,
} from '../../src/lib/governance/compact-authority-model';
import {
  compactAuthoritiesForRole,
  roleHasCompactAuthority,
  assertRoleCompactAuthority,
} from '../../src/lib/governance/algorithm-role-registry';
import { governanceAmendmentActionAllowed } from '../../src/lib/governance/governance-amendments';

describe('نموذج الصلاحيات والإجراءات المختصر',()=>{
  it('يبقي عدد الصلاحيات الأساسية محدودًا',()=>{
    expect(COMPACT_AUTHORITIES).toHaveLength(7);
  });

  it('يبقي عدد الإجراءات التشغيلية محدودًا',()=>{
    expect(COMPACT_PROCEDURES).toHaveLength(7);
  });

  it('لا يمنح صاحب المسؤولية اعتماد التغيير الحوكمي',()=>{
    expect(compactAuthorityAllowed('responsibility_owner','APPROVE_GOVERNANCE_CHANGE')).toBe(false);
    expect(roleHasCompactAuthority('budget-spending-owner','APPROVE_GOVERNANCE_CHANGE')).toBe(false);
  });

  it('يحصر اعتماد التغيير الحوكمي بالمجلس',()=>{
    expect(compactAuthorityAllowed('council','APPROVE_GOVERNANCE_CHANGE')).toBe(true);
    expect(roleHasCompactAuthority('namaa-council','APPROVE_GOVERNANCE_CHANGE')).toBe(true);
  });

  it('يسمح لصاحب المسؤولية بالحساب والتوصية والتصعيد دون تنفيذ خارجي',()=>{
    const actions=compactAuthoritiesForRole('liquidity-protection-owner');
    expect(actions).toContain('CALCULATE_AND_ANALYZE');
    expect(actions).toContain('RECOMMEND_WITHIN_DOMAIN');
    expect(actions).toContain('ESCALATE_CASE');
    expect(COMPACT_AUTHORITIES.every(item=>item.externalExecution===false)).toBe(true);
  });

  it('يمنع انتقالات الحوكمة من مرحلة غير صحيحة',()=>{
    expect(governanceAmendmentActionAllowed('GOVERNOR_REVIEW','COUNCIL_APPROVE')).toBe(false);
    expect(governanceAmendmentActionAllowed('COUNCIL_DISCUSSION','COUNCIL_APPROVE')).toBe(true);
    expect(governanceAmendmentActionAllowed('APPROVED_PENDING_EFFECTIVE','MARK_EFFECTIVE')).toBe(true);
  });

  it('يرفض حارس الصلاحيات اعتماد الحوكمة من صاحب مسؤولية',()=>{
    expect(()=>assertRoleCompactAuthority('budget-spending-owner','APPROVE_GOVERNANCE_CHANGE'))
      .toThrow('GOVERNANCE_AUTHORITY_DENIED');
    expect(()=>assertRoleCompactAuthority('namaa-council','APPROVE_GOVERNANCE_CHANGE'))
      .not.toThrow();
  });

  it('يعرف إجراء التحقق من تنفيذ المستخدم كمسار مطابقة لا تنفيذ آلي',()=>{
    const procedure=compactProcedure('VERIFY_USER_EXECUTION');
    expect(procedure?.steps).toContain('انتظار التنفيذ البشري');
    expect(procedure?.steps).toContain('مطابقة الأثر وإعادة الحساب');
  });
});
