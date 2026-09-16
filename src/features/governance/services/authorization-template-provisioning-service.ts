import { randomUUID } from 'node:crypto';
import { getAuthorizationGrantTemplate } from '@/governance/authorization-role-templates';
import { requestAuthorizationProvisioning } from './authorization-provisioning-service';

export async function requestAuthorizationGrantFromTemplate(input: {
  actorUserId: string;
  templateKey: string;
  bankKey?: string | null;
  committeeId?: string | null;
  caseType?: string | null;
  maxAmount?: number | null;
  rationale: string;
}): Promise<string> {
  const template = getAuthorizationGrantTemplate(input.templateKey);

  if (template.scope === 'BANK' && !input.bankKey?.trim()) {
    throw new Error('AUTHORIZATION_TEMPLATE_BANK_SCOPE_REQUIRED');
  }
  if (template.scope === 'COMMITTEE' && !input.committeeId?.trim()) {
    throw new Error('AUTHORIZATION_TEMPLATE_COMMITTEE_SCOPE_REQUIRED');
  }
  if (template.scope === 'GLOBAL' && (input.bankKey || input.committeeId)) {
    throw new Error('AUTHORIZATION_TEMPLATE_GLOBAL_SCOPE_CANNOT_BE_NARROWED_BY_UI');
  }
  if (input.maxAmount != null && (!Number.isFinite(input.maxAmount) || input.maxAmount < 0)) {
    throw new Error('AUTHORIZATION_TEMPLATE_AMOUNT_INVALID');
  }

  return requestAuthorizationProvisioning({
    actorUserId: input.actorUserId,
    requestKey: `grant-template:${template.key}:${randomUUID()}`,
    rationale: input.rationale,
    payload: {
      kind: 'GRANT_CREATE',
      grant: {
        role: template.role,
        action: template.action,
        objectType: template.objectType,
        bankKey: template.scope === 'BANK' ? input.bankKey?.trim() || null : null,
        committeeId: template.scope === 'COMMITTEE' ? input.committeeId?.trim() || null : null,
        caseType: input.caseType?.trim() || null,
        maxRisk: template.maxRisk ?? null,
        maxMateriality: template.maxMateriality ?? null,
        maxAmount: input.maxAmount ?? null,
        policyVersion: 'RBAC_ABAC_v1.0',
      },
    },
  });
}
