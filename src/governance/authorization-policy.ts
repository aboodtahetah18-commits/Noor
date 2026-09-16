export type GovernanceRole =
  | 'USER'
  | 'CENTRAL_BOARD_MEMBER'
  | 'CENTRAL_BANK_MANAGER'
  | 'BANK_MANAGER'
  | 'COMMITTEE_CHAIR'
  | 'COMMITTEE_MEMBER'
  | 'ADVISOR'
  | 'DATA_OWNER'
  | 'DECISION_OWNER'
  | 'EXECUTION_OWNER'
  | 'MONITORING_OWNER'
  | 'REVIEW_OWNER'
  | 'CLOSURE_AUTHORITY'
  | 'AUDITOR'
  | 'SYSTEM_SERVICE';

export type GovernanceAction =
  | 'CREATE' | 'READ' | 'UPDATE' | 'SUBMIT' | 'RECOMMEND' | 'REVIEW'
  | 'APPROVE' | 'REJECT' | 'ESCALATE' | 'ASSIGN' | 'EXECUTE_REQUEST'
  | 'VERIFY_EVIDENCE' | 'CLOSE' | 'REOPEN' | 'RELEASE' | 'ROLLBACK'
  | 'EXPORT' | 'ADMINISTER';

export type GovernanceObjectType =
  | 'CASE'
  | 'DECISION'
  | 'CHANGE_PROPOSAL'
  | 'BACKTEST'
  | 'RELEASE'
  | 'ROLLBACK_REVIEW'
  | 'EXECUTION_EVIDENCE'
  | 'AUDIT_EVENT';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type MaterialityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AuthorizationActor {
  userId: string;
  role: GovernanceRole;
  bankKey?: string | null;
  committeeId?: string | null;
  serviceId?: string | null;
}

export interface AuthorizationResource {
  objectType: GovernanceObjectType;
  objectId: string;
  ownerUserId?: string | null;
  bankKey?: string | null;
  committeeId?: string | null;
  caseId?: string | null;
  caseType?: string | null;
  caseStatus?: string | null;
  decisionType?: string | null;
  riskLevel?: RiskLevel | null;
  materialityLevel?: MaterialityLevel | null;
  amount?: number | null;
  readinessPassed?: boolean | null;
  hardGuardPassed?: boolean | null;
  proposalCreatorUserId?: string | null;
  releaseApprovalActorUserId?: string | null;
  evidenceOwnerUserId?: string | null;
  sodRequired?: boolean | null;
}

export interface AuthorizationGrant {
  grantId: string;
  role: GovernanceRole;
  action: GovernanceAction;
  objectType: GovernanceObjectType;
  bankKey?: string | null;
  committeeId?: string | null;
  caseType?: string | null;
  maxRisk?: RiskLevel | null;
  maxMateriality?: MaterialityLevel | null;
  maxAmount?: number | null;
  delegationId?: string | null;
  delegationStatus?: 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED' | null;
  delegationStartsAt?: string | null;
  delegationEndsAt?: string | null;
  policyVersion: string;
}

export interface AuthorizationRequest {
  actor: AuthorizationActor;
  action: GovernanceAction;
  resource: AuthorizationResource;
  grants: AuthorizationGrant[];
  now?: string;
}

export interface AuthorizationDecision {
  decision: 'ALLOW' | 'DENY';
  reason: string;
  matchedGrantId: string | null;
  policyVersion: string;
}

const LEVEL_RANK: Record<RiskLevel | MaterialityLevel, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

function scopeMatches(actorValue: string | null | undefined, grantValue: string | null | undefined, resourceValue: string | null | undefined): boolean {
  if (!grantValue) return true;
  return actorValue === grantValue && resourceValue === grantValue;
}

function withinLevel(value: RiskLevel | MaterialityLevel | null | undefined, max: RiskLevel | MaterialityLevel | null | undefined): boolean {
  if (!max || !value) return true;
  return LEVEL_RANK[value] <= LEVEL_RANK[max];
}

function delegationActive(grant: AuthorizationGrant, nowIso: string): boolean {
  if (!grant.delegationId) return true;
  if (grant.delegationStatus !== 'ACTIVE') return false;
  const now = Date.parse(nowIso);
  if (grant.delegationStartsAt && now < Date.parse(grant.delegationStartsAt)) return false;
  if (grant.delegationEndsAt && now >= Date.parse(grant.delegationEndsAt)) return false;
  return true;
}

function separationOfDutiesViolation(req: AuthorizationRequest): string | null {
  const { actor, action, resource } = req;
  if (action === 'APPROVE' && resource.objectType === 'CHANGE_PROPOSAL' && resource.proposalCreatorUserId === actor.userId) {
    return 'SOD_PROPOSAL_CREATOR_CANNOT_APPROVE';
  }
  if (
    action === 'RELEASE' &&
    (resource.materialityLevel === 'HIGH' || resource.materialityLevel === 'CRITICAL') &&
    resource.releaseApprovalActorUserId === actor.userId
  ) {
    return 'SOD_HIGH_MATERIALITY_RELEASE_CREATOR_CANNOT_BE_APPROVER';
  }
  if (action === 'VERIFY_EVIDENCE' && resource.sodRequired && resource.evidenceOwnerUserId === actor.userId) {
    return 'SOD_EVIDENCE_OWNER_CANNOT_VERIFY';
  }
  return null;
}

/** Official RBAC/ABAC v1.0 policy: explicit grant required, DENY by default. */
export function evaluateAuthorization(req: AuthorizationRequest): AuthorizationDecision {
  const nowIso = req.now ?? new Date().toISOString();
  const defaultVersion = req.grants[0]?.policyVersion ?? 'RBAC_ABAC_v1.0';

  if ((req.action === 'APPROVE' || req.action === 'REJECT' || req.action === 'RELEASE' || req.action === 'ROLLBACK') && req.actor.role === 'ADVISOR') {
    return { decision: 'DENY', reason: 'ADVISOR_CANNOT_EXERCISE_GOVERNANCE_APPROVAL', matchedGrantId: null, policyVersion: defaultVersion };
  }
  if ((req.action === 'APPROVE' || req.action === 'RELEASE' || req.action === 'ROLLBACK') && req.actor.role === 'USER') {
    return { decision: 'DENY', reason: 'USER_CANNOT_APPROVE_GOVERNANCE_CHANGE', matchedGrantId: null, policyVersion: defaultVersion };
  }

  const sodReason = separationOfDutiesViolation(req);
  if (sodReason) return { decision: 'DENY', reason: sodReason, matchedGrantId: null, policyVersion: defaultVersion };

  if (req.action === 'APPROVE' && req.resource.objectType === 'DECISION') {
    if (req.resource.caseStatus !== 'DECISION_PENDING') {
      return { decision: 'DENY', reason: 'DECISION_NOT_PENDING', matchedGrantId: null, policyVersion: defaultVersion };
    }
    if (req.resource.readinessPassed !== true || req.resource.hardGuardPassed !== true) {
      return { decision: 'DENY', reason: 'DECISION_READINESS_OR_HARD_GUARD_FAILED', matchedGrantId: null, policyVersion: defaultVersion };
    }
  }

  const candidates = req.grants.filter((grant) =>
    grant.role === req.actor.role &&
    grant.action === req.action &&
    grant.objectType === req.resource.objectType &&
    delegationActive(grant, nowIso) &&
    scopeMatches(req.actor.bankKey, grant.bankKey, req.resource.bankKey) &&
    scopeMatches(req.actor.committeeId, grant.committeeId, req.resource.committeeId) &&
    (!grant.caseType || grant.caseType === req.resource.caseType) &&
    withinLevel(req.resource.riskLevel, grant.maxRisk) &&
    withinLevel(req.resource.materialityLevel, grant.maxMateriality) &&
    (grant.maxAmount == null || req.resource.amount == null || req.resource.amount <= grant.maxAmount)
  );

  const grant = candidates[0];
  if (!grant) {
    return { decision: 'DENY', reason: 'NO_EXPLICIT_GRANT_MATCHED', matchedGrantId: null, policyVersion: defaultVersion };
  }

  return { decision: 'ALLOW', reason: 'EXPLICIT_GRANT_MATCHED', matchedGrantId: grant.grantId, policyVersion: grant.policyVersion };
}
