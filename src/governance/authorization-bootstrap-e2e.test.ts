import { describe, expect, it } from 'vitest';
import { evaluateAuthorization, type AuthorizationGrant } from './authorization-policy';
import { AUTHORIZATION_GRANT_TEMPLATES } from './authorization-role-templates';

function grant(overrides:Partial<AuthorizationGrant>):AuthorizationGrant {
  return {
    grantId:'g1', role:'CENTRAL_BOARD_MEMBER', action:'APPROVE', objectType:'CHANGE_PROPOSAL',
    policyVersion:'RBAC_ABAC_v1.0', ...overrides,
  };
}

describe('authorization operating model',()=>{
  it('keeps advisor templates recommendation-only',()=>{
    const advisor=AUTHORIZATION_GRANT_TEMPLATES.filter((item)=>item.role==='ADVISOR');
    expect(advisor.length).toBeGreaterThan(0);
    expect(advisor.every((item)=>!['APPROVE','REJECT','RELEASE','ROLLBACK','ADMINISTER'].includes(item.action))).toBe(true);
  });

  it('requires explicit ADMINISTER template instead of implicit super-admin',()=>{
    const admins=AUTHORIZATION_GRANT_TEMPLATES.filter((item)=>item.action==='ADMINISTER');
    expect(admins).toHaveLength(1);
    expect(admins[0]?.role).toBe('CENTRAL_BOARD_MEMBER');
    expect(admins[0]?.objectType).toBe('AUDIT_EVENT');
  });

  it('blocks proposal creator from approving their own proposal',()=>{
    const decision=evaluateAuthorization({
      actor:{userId:'u1',role:'CENTRAL_BOARD_MEMBER'},
      action:'APPROVE',
      resource:{objectType:'CHANGE_PROPOSAL',objectId:'p1',proposalCreatorUserId:'u1'},
      grants:[grant({})], now:'2026-09-17T00:00:00.000Z',
    });
    expect(decision).toMatchObject({decision:'DENY',reason:'SOD_PROPOSAL_CREATOR_CANNOT_APPROVE'});
  });

  it('blocks high-materiality release by the same approval actor',()=>{
    const decision=evaluateAuthorization({
      actor:{userId:'u2',role:'CENTRAL_BOARD_MEMBER'},
      action:'RELEASE',
      resource:{objectType:'RELEASE',objectId:'r1',materialityLevel:'HIGH',releaseApprovalActorUserId:'u2'},
      grants:[grant({action:'RELEASE',objectType:'RELEASE'})], now:'2026-09-17T00:00:00.000Z',
    });
    expect(decision).toMatchObject({decision:'DENY',reason:'SOD_HIGH_MATERIALITY_RELEASE_CREATOR_CANNOT_BE_APPROVER'});
  });

  it('blocks evidence owner from verifying evidence when SoD is required',()=>{
    const decision=evaluateAuthorization({
      actor:{userId:'u3',role:'DATA_OWNER'},
      action:'VERIFY_EVIDENCE',
      resource:{objectType:'EXECUTION_EVIDENCE',objectId:'e1',sodRequired:true,evidenceOwnerUserId:'u3'},
      grants:[grant({role:'DATA_OWNER',action:'VERIFY_EVIDENCE',objectType:'EXECUTION_EVIDENCE'})], now:'2026-09-17T00:00:00.000Z',
    });
    expect(decision).toMatchObject({decision:'DENY',reason:'SOD_EVIDENCE_OWNER_CANNOT_VERIFY'});
  });
});
