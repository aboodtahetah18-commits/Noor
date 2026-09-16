import { describe, expect, it } from 'vitest';
import { validateBreakGlass, validateGrantScope, validateProvisioningActorSeparation } from './authorization-provisioning-policy';

describe('authorization provisioning separation of duties', () => {
  it('accepts three distinct actors', () => {
    expect(() => validateProvisioningActorSeparation('requester','approver','applier')).not.toThrow();
  });

  it('rejects self approval', () => {
    expect(() => validateProvisioningActorSeparation('same','same','third')).toThrow('PROVISIONING_INDEPENDENT_APPROVAL_REQUIRED');
  });

  it('rejects requester as applier', () => {
    expect(() => validateProvisioningActorSeparation('requester','approver','requester')).toThrow('PROVISIONING_APPLIER_MUST_DIFFER_FROM_REQUESTER');
  });

  it('rejects approver as applier', () => {
    expect(() => validateProvisioningActorSeparation('requester','approver','approver')).toThrow('PROVISIONING_APPLIER_MUST_DIFFER_FROM_APPROVER');
  });

  it('requires a concrete principal for ADMINISTER grants', () => {
    expect(() => validateGrantScope({ role:'CENTRAL_BANK_MANAGER', action:'ADMINISTER', objectType:'AUDIT_EVENT' })).toThrow('ADMINISTER_GRANT_REQUIRES_PRINCIPAL');
    expect(() => validateGrantScope({ role:'CENTRAL_BANK_MANAGER', action:'ADMINISTER', objectType:'AUDIT_EVENT', principalUserId:'user-1' })).not.toThrow();
  });

  it('keeps governance powers outside break glass', () => {
    for (const action of ['ADMINISTER','APPROVE','REJECT','RELEASE','ROLLBACK'] as const) {
      expect(() => validateBreakGlass({
        actorUserId: 'actor',
        role: 'CENTRAL_BANK_MANAGER',
        permissions: [{ action, objectType: 'AUDIT_EVENT' }],
        scope: {},
        justification: 'حالة طارئة تشغيلية موثقة تتطلب وصولًا مؤقتًا ومحدودًا فقط',
        incidentReference: 'INC-001',
        durationMinutes: 30,
      })).toThrow(`BREAK_GLASS_ACTION_FORBIDDEN:${action}`);
    }
  });
});
