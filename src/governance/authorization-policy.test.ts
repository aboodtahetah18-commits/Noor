import { describe, expect, it } from 'vitest';
import { evaluateAuthorization, type AuthorizationRequest } from './authorization-policy';

const base: AuthorizationRequest = {
  actor: { userId: 'actor-1', role: 'CENTRAL_BANK_MANAGER' },
  action: 'APPROVE',
  resource: { objectType: 'CHANGE_PROPOSAL', objectId: 'p1', proposalCreatorUserId: 'actor-2' },
  grants: [],
  now: '2026-09-16T18:00:00.000Z',
};

function grant(overrides: Partial<AuthorizationRequest['grants'][number]> = {}): AuthorizationRequest['grants'][number] {
  return {
    grantId: 'g1',
    role: 'CENTRAL_BANK_MANAGER',
    action: 'APPROVE',
    objectType: 'CHANGE_PROPOSAL',
    policyVersion: 'RBAC_ABAC_v1.0',
    ...overrides,
  };
}

describe('evaluateAuthorization', () => {
  it('denies by default without an explicit grant', () => {
    expect(evaluateAuthorization(base)).toMatchObject({ decision: 'DENY', reason: 'NO_EXPLICIT_GRANT_MATCHED' });
  });

  it('allows an exact explicit grant', () => {
    expect(evaluateAuthorization({ ...base, grants: [grant()] })).toMatchObject({ decision: 'ALLOW', matchedGrantId: 'g1' });
  });

  it('prevents proposal creator from final approval', () => {
    const req = { ...base, resource: { ...base.resource, proposalCreatorUserId: 'actor-1' }, grants: [grant()] };
    expect(evaluateAuthorization(req)).toMatchObject({ decision: 'DENY', reason: 'SOD_PROPOSAL_CREATOR_CANNOT_APPROVE' });
  });

  it('prevents advisors from approval even if a grant exists', () => {
    const req: AuthorizationRequest = {
      ...base,
      actor: { userId: 'advisor-1', role: 'ADVISOR' },
      grants: [grant({ role: 'ADVISOR' })],
    };
    expect(evaluateAuthorization(req)).toMatchObject({ decision: 'DENY', reason: 'ADVISOR_CANNOT_EXERCISE_GOVERNANCE_APPROVAL' });
  });

  it('enforces bank scope', () => {
    const req: AuthorizationRequest = {
      ...base,
      actor: { userId: 'manager-1', role: 'BANK_MANAGER', bankKey: 'MALAA' },
      resource: { ...base.resource, bankKey: 'HILAL' },
      grants: [grant({ role: 'BANK_MANAGER', bankKey: 'MALAA' })],
    };
    expect(evaluateAuthorization(req)).toMatchObject({ decision: 'DENY', reason: 'NO_EXPLICIT_GRANT_MATCHED' });
  });

  it('rejects expired delegations', () => {
    const req: AuthorizationRequest = {
      ...base,
      grants: [grant({ delegationId: 'd1', delegationStatus: 'ACTIVE', delegationStartsAt: '2026-09-01T00:00:00.000Z', delegationEndsAt: '2026-09-16T17:00:00.000Z' })],
    };
    expect(evaluateAuthorization(req)).toMatchObject({ decision: 'DENY', reason: 'NO_EXPLICIT_GRANT_MATCHED' });
  });

  it('enforces risk materiality and amount limits', () => {
    const req: AuthorizationRequest = {
      ...base,
      resource: { ...base.resource, riskLevel: 'HIGH', materialityLevel: 'HIGH', amount: 50000 },
      grants: [grant({ maxRisk: 'MEDIUM', maxMateriality: 'MEDIUM', maxAmount: 10000 })],
    };
    expect(evaluateAuthorization(req)).toMatchObject({ decision: 'DENY' });
  });

  it('prevents evidence owner from verifying when SoD is required', () => {
    const req: AuthorizationRequest = {
      actor: { userId: 'owner-1', role: 'EXECUTION_OWNER' },
      action: 'VERIFY_EVIDENCE',
      resource: { objectType: 'EXECUTION_EVIDENCE', objectId: 'e1', evidenceOwnerUserId: 'owner-1', sodRequired: true },
      grants: [{ grantId: 'g2', role: 'EXECUTION_OWNER', action: 'VERIFY_EVIDENCE', objectType: 'EXECUTION_EVIDENCE', policyVersion: 'RBAC_ABAC_v1.0' }],
    };
    expect(evaluateAuthorization(req)).toMatchObject({ decision: 'DENY', reason: 'SOD_EVIDENCE_OWNER_CANNOT_VERIFY' });
  });
});
