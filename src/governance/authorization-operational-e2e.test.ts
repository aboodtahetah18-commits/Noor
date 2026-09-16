import { describe, expect, it } from 'vitest';
import { evaluateAuthorization, type AuthorizationGrant, type AuthorizationRequest, type GovernanceAction, type GovernanceObjectType, type GovernanceRole } from './authorization-policy';
import { validateBreakGlass, validateIndependentApproval } from './authorization-provisioning-policy';
import { getAuthorizationGrantTemplate } from './authorization-role-templates';

function grant(role: GovernanceRole, action: GovernanceAction, objectType: GovernanceObjectType): AuthorizationGrant {
  return { grantId:`${role}:${action}:${objectType}`, role, action, objectType, policyVersion:'RBAC_ABAC_v1.0' };
}
function decision(input: Omit<AuthorizationRequest,'grants'>, grants: AuthorizationGrant[]) {
  return evaluateAuthorization({ ...input, grants, now:'2026-09-17T12:00:00.000Z' });
}

describe('authorization operational E2E separation', () => {
  it('requires independent requester and approver before provisioning can proceed', () => {
    expect(() => validateIndependentApproval('requester-a','requester-a')).toThrow('PROVISIONING_INDEPENDENT_APPROVAL_REQUIRED');
    expect(() => validateIndependentApproval('requester-a','approver-b')).not.toThrow();
  });

  it('enforces distinct actors from proposal creation through release monitoring and rollback', () => {
    const proposalGrant=grant('CENTRAL_BOARD_MEMBER','APPROVE','CHANGE_PROPOSAL');
    const releaseGrant=grant('CENTRAL_BOARD_MEMBER','RELEASE','RELEASE');
    const monitorGrant=grant('MONITORING_OWNER','REVIEW','RELEASE');
    const rollbackGrant=grant('CENTRAL_BOARD_MEMBER','ROLLBACK','ROLLBACK_REVIEW');

    const creator='actor-requester';
    const approver='actor-approver';
    const releaser='actor-releaser';
    const monitor='actor-monitor';
    const rollback='actor-rollback';

    expect(decision({
      actor:{userId:creator,role:'CENTRAL_BOARD_MEMBER'}, action:'APPROVE',
      resource:{objectType:'CHANGE_PROPOSAL',objectId:'proposal-1',proposalCreatorUserId:creator},
    },[proposalGrant])).toMatchObject({decision:'DENY',reason:'SOD_PROPOSAL_CREATOR_CANNOT_APPROVE'});

    expect(decision({
      actor:{userId:approver,role:'CENTRAL_BOARD_MEMBER'}, action:'APPROVE',
      resource:{objectType:'CHANGE_PROPOSAL',objectId:'proposal-1',proposalCreatorUserId:creator},
    },[proposalGrant])).toMatchObject({decision:'ALLOW'});

    expect(decision({
      actor:{userId:approver,role:'CENTRAL_BOARD_MEMBER'}, action:'RELEASE',
      resource:{objectType:'RELEASE',objectId:'release-1',materialityLevel:'HIGH',releaseApprovalActorUserId:approver},
    },[releaseGrant])).toMatchObject({decision:'DENY',reason:'SOD_HIGH_MATERIALITY_RELEASE_CREATOR_CANNOT_BE_APPROVER'});

    expect(decision({
      actor:{userId:releaser,role:'CENTRAL_BOARD_MEMBER'}, action:'RELEASE',
      resource:{objectType:'RELEASE',objectId:'release-1',materialityLevel:'HIGH',releaseApprovalActorUserId:approver},
    },[releaseGrant])).toMatchObject({decision:'ALLOW'});

    expect(decision({
      actor:{userId:monitor,role:'MONITORING_OWNER'}, action:'REVIEW',
      resource:{objectType:'RELEASE',objectId:'release-1',materialityLevel:'HIGH'},
    },[monitorGrant])).toMatchObject({decision:'ALLOW'});

    expect(decision({
      actor:{userId:rollback,role:'CENTRAL_BOARD_MEMBER'}, action:'ROLLBACK',
      resource:{objectType:'ROLLBACK_REVIEW',objectId:'rollback-review-1',materialityLevel:'HIGH'},
    },[rollbackGrant])).toMatchObject({decision:'ALLOW'});
  });

  it('keeps break glass temporary and incapable of governance execution', () => {
    const validBase={
      actorUserId:'actor-emergency', role:'MONITORING_OWNER' as const,
      scope:{policyVersion:'RBAC_ABAC_v1.0'},
      justification:'Incident response requires temporary read and review visibility.',
      incidentReference:'INC-42', durationMinutes:30,
    };
    expect(() => validateBreakGlass({
      ...validBase,
      permissions:[{action:'REVIEW',objectType:'RELEASE'}],
    })).not.toThrow();
    expect(() => validateBreakGlass({
      ...validBase,
      permissions:[{action:'RELEASE',objectType:'RELEASE'}],
    })).toThrow('BREAK_GLASS_ACTION_FORBIDDEN:RELEASE');
    expect(() => validateBreakGlass({
      ...validBase,
      durationMinutes:61,
      permissions:[{action:'REVIEW',objectType:'RELEASE'}],
    })).toThrow('BREAK_GLASS_DURATION_OUT_OF_RANGE');
  });

  it('keeps official templates bounded by their declared scope', () => {
    expect(getAuthorizationGrantTemplate('bank-manager-case-review')).toMatchObject({scope:'BANK',role:'BANK_MANAGER',action:'REVIEW'});
    expect(getAuthorizationGrantTemplate('committee-chair-review')).toMatchObject({scope:'COMMITTEE',role:'COMMITTEE_CHAIR'});
    expect(getAuthorizationGrantTemplate('advisor-recommend')).toMatchObject({role:'ADVISOR',action:'RECOMMEND'});
  });
});
