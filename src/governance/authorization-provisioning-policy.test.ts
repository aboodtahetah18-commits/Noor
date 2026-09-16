import { describe, expect, it } from 'vitest';
import {
  statusTransitionAllowed,
  validateBreakGlass,
  validateDelegation,
  validateGrantScope,
  validateIndependentApproval,
} from './authorization-provisioning-policy';

describe('authorization provisioning policy', () => {
  it('requires independent approval', () => {
    expect(() => validateIndependentApproval('u1', 'u1')).toThrow('PROVISIONING_INDEPENDENT_APPROVAL_REQUIRED');
    expect(() => validateIndependentApproval('u1', 'u2')).not.toThrow();
  });

  it('rejects invalid grant amount', () => {
    expect(() => validateGrantScope({ role: 'BANK_MANAGER', action: 'REVIEW', objectType: 'CASE', maxAmount: -1 }))
      .toThrow('GRANT_MAX_AMOUNT_INVALID');
  });

  it('prevents delegation role escalation and self delegation', () => {
    const base = {
      fromUserId: 'u1', fromRole: 'BANK_MANAGER' as const, toUserId: 'u2', toRole: 'BANK_MANAGER' as const,
      permissions: [{ action: 'REVIEW' as const, objectType: 'CASE' as const }], scope: {},
      startsAt: '2026-09-16T10:00:00.000Z', endsAt: '2026-09-16T11:00:00.000Z',
    };
    expect(() => validateDelegation({ ...base, toUserId: 'u1' })).toThrow('DELEGATION_SELF_TARGET_NOT_ALLOWED');
    expect(() => validateDelegation({ ...base, toRole: 'CENTRAL_BANK_MANAGER' })).toThrow('DELEGATION_ROLE_ESCALATION_NOT_ALLOWED');
  });

  it('caps break glass at 60 minutes and blocks governance mutation powers', () => {
    const base = {
      actorUserId: 'u1', scope: {}, maxRisk: 'HIGH' as const,
      justification: 'حالة تشغيلية حرجة تتطلب وصولاً مؤقتاً موثقاً للتحقق من السجلات.',
      incidentReference: 'INC-42', durationMinutes: 30,
    };
    expect(() => validateBreakGlass({ ...base, permissions: [{ action: 'REVIEW', objectType: 'CASE' }] })).not.toThrow();
    expect(() => validateBreakGlass({ ...base, durationMinutes: 61, permissions: [{ action: 'REVIEW', objectType: 'CASE' }] }))
      .toThrow('BREAK_GLASS_DURATION_OUT_OF_RANGE');
    expect(() => validateBreakGlass({ ...base, permissions: [{ action: 'RELEASE', objectType: 'RELEASE' }] }))
      .toThrow('BREAK_GLASS_ACTION_FORBIDDEN:RELEASE');
  });

  it('allows suspension/reactivation but never reactivates revoked or expired assignments', () => {
    expect(statusTransitionAllowed('ACTIVE', 'SUSPENDED')).toBe(true);
    expect(statusTransitionAllowed('SUSPENDED', 'ACTIVE')).toBe(true);
    expect(statusTransitionAllowed('REVOKED', 'ACTIVE')).toBe(false);
    expect(statusTransitionAllowed('EXPIRED', 'ACTIVE')).toBe(false);
  });
});
