import type { GovernanceAction, GovernanceObjectType, GovernanceRole, MaterialityLevel, RiskLevel } from './authorization-policy';

export const AUTHORIZATION_TEMPLATE_VERSION = 'NAMA_AUTHZ_TEMPLATE_v1.0' as const;

export type TemplateScopeMode = 'GLOBAL' | 'BANK_REQUIRED' | 'COMMITTEE_REQUIRED';

export interface AuthorizationTemplateGrant {
  action: GovernanceAction;
  objectType: GovernanceObjectType;
  maxRisk?: RiskLevel;
  maxMateriality?: MaterialityLevel;
  maxAmount?: number;
}

export interface AuthorizationRoleTemplate {
  role: GovernanceRole;
  scopeMode: TemplateScopeMode;
  grants: readonly AuthorizationTemplateGrant[];
}

/**
 * Conservative operating templates. ADMINISTER is intentionally absent and can only be
 * established by the one-time bootstrap ceremony or a later governed provisioning request.
 */
export const AUTHORIZATION_ROLE_TEMPLATES: Readonly<Record<string, AuthorizationRoleTemplate>> = {
  CENTRAL_BOARD_MEMBER: {
    role: 'CENTRAL_BOARD_MEMBER', scopeMode: 'GLOBAL', grants: [
      { action: 'READ', objectType: 'CASE' },
      { action: 'READ', objectType: 'DECISION' },
      { action: 'REVIEW', objectType: 'DECISION' },
      { action: 'APPROVE', objectType: 'DECISION' },
      { action: 'REJECT', objectType: 'DECISION' },
      { action: 'READ', objectType: 'CHANGE_PROPOSAL' },
      { action: 'APPROVE', objectType: 'CHANGE_PROPOSAL' },
      { action: 'REJECT', objectType: 'CHANGE_PROPOSAL' },
      { action: 'READ', objectType: 'BACKTEST' },
      { action: 'READ', objectType: 'RELEASE' },
      { action: 'READ', objectType: 'ROLLBACK_REVIEW' },
      { action: 'APPROVE', objectType: 'ROLLBACK_REVIEW' },
      { action: 'REJECT', objectType: 'ROLLBACK_REVIEW' },
      { action: 'READ', objectType: 'AUDIT_EVENT' },
    ],
  },
  CENTRAL_BANK_MANAGER: {
    role: 'CENTRAL_BANK_MANAGER', scopeMode: 'GLOBAL', grants: [
      { action: 'READ', objectType: 'CASE' },
      { action: 'REVIEW', objectType: 'CASE' },
      { action: 'ESCALATE', objectType: 'CASE' },
      { action: 'READ', objectType: 'DECISION' },
      { action: 'REVIEW', objectType: 'DECISION' },
      { action: 'READ', objectType: 'CHANGE_PROPOSAL' },
      { action: 'READ', objectType: 'BACKTEST' },
      { action: 'RELEASE', objectType: 'RELEASE' },
      { action: 'ROLLBACK', objectType: 'RELEASE' },
      { action: 'READ', objectType: 'AUDIT_EVENT' },
      { action: 'EXPORT', objectType: 'AUDIT_EVENT' },
    ],
  },
  BANK_MANAGER: {
    role: 'BANK_MANAGER', scopeMode: 'BANK_REQUIRED', grants: [
      { action: 'READ', objectType: 'CASE' },
      { action: 'RECOMMEND', objectType: 'CASE' },
      { action: 'REVIEW', objectType: 'CASE' },
      { action: 'ESCALATE', objectType: 'CASE' },
      { action: 'READ', objectType: 'DECISION' },
      { action: 'RECOMMEND', objectType: 'DECISION' },
      { action: 'READ', objectType: 'EXECUTION_EVIDENCE' },
      { action: 'VERIFY_EVIDENCE', objectType: 'EXECUTION_EVIDENCE' },
    ],
  },
  COMMITTEE_CHAIR: {
    role: 'COMMITTEE_CHAIR', scopeMode: 'COMMITTEE_REQUIRED', grants: [
      { action: 'READ', objectType: 'CASE' },
      { action: 'REVIEW', objectType: 'CASE' },
      { action: 'ESCALATE', objectType: 'CASE' },
      { action: 'READ', objectType: 'DECISION' },
      { action: 'REVIEW', objectType: 'DECISION' },
      { action: 'RECOMMEND', objectType: 'DECISION' },
    ],
  },
  COMMITTEE_MEMBER: {
    role: 'COMMITTEE_MEMBER', scopeMode: 'COMMITTEE_REQUIRED', grants: [
      { action: 'READ', objectType: 'CASE' },
      { action: 'REVIEW', objectType: 'CASE' },
      { action: 'READ', objectType: 'DECISION' },
      { action: 'RECOMMEND', objectType: 'DECISION' },
    ],
  },
  ADVISOR: {
    role: 'ADVISOR', scopeMode: 'GLOBAL', grants: [
      { action: 'READ', objectType: 'CASE' },
      { action: 'RECOMMEND', objectType: 'CASE' },
      { action: 'READ', objectType: 'DECISION' },
      { action: 'RECOMMEND', objectType: 'DECISION' },
    ],
  },
  AUDITOR: {
    role: 'AUDITOR', scopeMode: 'GLOBAL', grants: [
      { action: 'READ', objectType: 'CASE' },
      { action: 'READ', objectType: 'DECISION' },
      { action: 'READ', objectType: 'CHANGE_PROPOSAL' },
      { action: 'READ', objectType: 'BACKTEST' },
      { action: 'READ', objectType: 'RELEASE' },
      { action: 'READ', objectType: 'ROLLBACK_REVIEW' },
      { action: 'READ', objectType: 'EXECUTION_EVIDENCE' },
      { action: 'READ', objectType: 'AUDIT_EVENT' },
      { action: 'EXPORT', objectType: 'AUDIT_EVENT' },
    ],
  },
} as const;

export function getAuthorizationRoleTemplate(templateKey: string): AuthorizationRoleTemplate {
  const template = AUTHORIZATION_ROLE_TEMPLATES[templateKey];
  if (!template) throw new Error('AUTHORIZATION_TEMPLATE_NOT_FOUND');
  return template;
}

export function assertTemplateScope(template: AuthorizationRoleTemplate, scope: { bankKey?: string | null; committeeId?: string | null }): void {
  if (template.scopeMode === 'BANK_REQUIRED' && !scope.bankKey?.trim()) throw new Error('AUTHORIZATION_TEMPLATE_BANK_SCOPE_REQUIRED');
  if (template.scopeMode === 'COMMITTEE_REQUIRED' && !scope.committeeId?.trim()) throw new Error('AUTHORIZATION_TEMPLATE_COMMITTEE_SCOPE_REQUIRED');
}
