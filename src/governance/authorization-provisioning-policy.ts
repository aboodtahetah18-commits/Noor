import type { GovernanceAction, GovernanceObjectType, GovernanceRole, MaterialityLevel, RiskLevel } from './authorization-policy';

export type ProvisioningChangeType =
  | 'ROLE_ASSIGNMENT_CREATE' | 'ROLE_ASSIGNMENT_STATUS'
  | 'GRANT_CREATE' | 'GRANT_STATUS'
  | 'DELEGATION_CREATE' | 'DELEGATION_STATUS'
  | 'BREAK_GLASS_REQUEST';

export type ProvisioningStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'APPLIED' | 'CANCELLED' | 'EXPIRED';
export type AuthorizationLifecycleStatus = 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED';

export interface GrantScopeInput {
  role: GovernanceRole;
  action: GovernanceAction;
  objectType: GovernanceObjectType;
  principalUserId?: string | null;
  bankKey?: string | null;
  committeeId?: string | null;
  caseType?: string | null;
  maxRisk?: RiskLevel | null;
  maxMateriality?: MaterialityLevel | null;
  maxAmount?: number | null;
  policyVersion?: string;
}

export interface DelegationProvisioningInput {
  fromUserId: string;
  fromRole: GovernanceRole;
  toUserId: string;
  toRole: GovernanceRole;
  permissions: Array<{ action: GovernanceAction; objectType: GovernanceObjectType }>;
  scope: { bankKey?: string | null; committeeId?: string | null; caseType?: string | null; maxMateriality?: MaterialityLevel | null; policyVersion?: string };
  maxAmount?: number | null;
  maxRisk?: RiskLevel | null;
  startsAt: string;
  endsAt: string;
  canRedelegate?: boolean;
}

export interface BreakGlassProvisioningInput {
  actorUserId: string;
  role: GovernanceRole;
  permissions: Array<{ action: GovernanceAction; objectType: GovernanceObjectType }>;
  scope: { bankKey?: string | null; committeeId?: string | null; caseType?: string | null; maxMateriality?: MaterialityLevel | null; policyVersion?: string };
  maxAmount?: number | null;
  maxRisk?: RiskLevel | null;
  justification: string;
  incidentReference: string;
  durationMinutes: number;
}

const FORBIDDEN_BREAK_GLASS_ACTIONS = new Set<GovernanceAction>([
  'APPROVE','REJECT','RELEASE','ROLLBACK','ADMINISTER','EXECUTE_REQUEST','ASSIGN','CLOSE',
]);

export function validateIndependentApproval(requestedBy: string, approvedBy: string): void {
  if (!requestedBy || !approvedBy) throw new Error('PROVISIONING_ACTOR_REQUIRED');
  if (requestedBy === approvedBy) throw new Error('PROVISIONING_INDEPENDENT_APPROVAL_REQUIRED');
}

export function validateProvisioningActorSeparation(requestedBy: string, approvedBy: string, appliedBy: string): void {
  validateIndependentApproval(requestedBy, approvedBy);
  if (!appliedBy) throw new Error('PROVISIONING_APPLIER_REQUIRED');
  if (appliedBy === requestedBy) throw new Error('PROVISIONING_APPLIER_MUST_DIFFER_FROM_REQUESTER');
  if (appliedBy === approvedBy) throw new Error('PROVISIONING_APPLIER_MUST_DIFFER_FROM_APPROVER');
}

export function validateGrantScope(input: GrantScopeInput): void {
  if (!input.role || !input.action || !input.objectType) throw new Error('GRANT_CORE_SCOPE_REQUIRED');
  if (input.action === 'ADMINISTER' && !input.principalUserId?.trim()) throw new Error('ADMINISTER_GRANT_REQUIRES_PRINCIPAL');
  if (input.maxAmount != null && (!Number.isFinite(input.maxAmount) || input.maxAmount < 0)) throw new Error('GRANT_MAX_AMOUNT_INVALID');
  if (input.policyVersion != null && !input.policyVersion.trim()) throw new Error('GRANT_POLICY_VERSION_INVALID');
}

export function validateDelegation(input: DelegationProvisioningInput): void {
  if (input.fromUserId === input.toUserId) throw new Error('DELEGATION_SELF_TARGET_NOT_ALLOWED');
  if (input.fromRole !== input.toRole) throw new Error('DELEGATION_ROLE_ESCALATION_NOT_ALLOWED');
  if (input.permissions.length === 0) throw new Error('DELEGATION_PERMISSION_REQUIRED');
  const starts = Date.parse(input.startsAt);
  const ends = Date.parse(input.endsAt);
  if (!Number.isFinite(starts) || !Number.isFinite(ends) || ends <= starts) throw new Error('DELEGATION_WINDOW_INVALID');
  if (input.maxAmount != null && (!Number.isFinite(input.maxAmount) || input.maxAmount < 0)) throw new Error('DELEGATION_MAX_AMOUNT_INVALID');
}

export function validateBreakGlass(input: BreakGlassProvisioningInput): void {
  if (!input.actorUserId || !input.role) throw new Error('BREAK_GLASS_ACTOR_ROLE_REQUIRED');
  if (input.permissions.length === 0) throw new Error('BREAK_GLASS_PERMISSION_REQUIRED');
  if (!Number.isInteger(input.durationMinutes) || input.durationMinutes < 1 || input.durationMinutes > 60) {
    throw new Error('BREAK_GLASS_DURATION_OUT_OF_RANGE');
  }
  if (input.justification.trim().length < 30) throw new Error('BREAK_GLASS_JUSTIFICATION_REQUIRED');
  if (input.incidentReference.trim().length < 3) throw new Error('BREAK_GLASS_INCIDENT_REFERENCE_REQUIRED');
  if (input.maxAmount != null && (!Number.isFinite(input.maxAmount) || input.maxAmount < 0)) throw new Error('BREAK_GLASS_MAX_AMOUNT_INVALID');
  for (const permission of input.permissions) {
    if (FORBIDDEN_BREAK_GLASS_ACTIONS.has(permission.action)) throw new Error(`BREAK_GLASS_ACTION_FORBIDDEN:${permission.action}`);
  }
}

export function statusTransitionAllowed(from: AuthorizationLifecycleStatus, to: AuthorizationLifecycleStatus): boolean {
  if (from === to) return true;
  if (from === 'ACTIVE') return to === 'SUSPENDED' || to === 'REVOKED' || to === 'EXPIRED';
  if (from === 'SUSPENDED') return to === 'ACTIVE' || to === 'REVOKED' || to === 'EXPIRED';
  return false;
}
