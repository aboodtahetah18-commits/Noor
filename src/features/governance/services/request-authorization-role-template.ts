import { randomUUID } from 'node:crypto';
import { authorizationRepository } from '@/repositories/authorization-repository';
import { authorizationProvisioningRepository } from '@/repositories/authorization-provisioning-repository';
import {
  AUTHORIZATION_TEMPLATE_VERSION,
  assertTemplateScope,
  getAuthorizationRoleTemplate,
} from '@/governance/authorization-role-templates';

export interface RequestAuthorizationRoleTemplateInput {
  actorUserId: string;
  targetUserId: string;
  templateKey: string;
  bankKey?: string | null;
  committeeId?: string | null;
  rationale: string;
  bundleKey?: string;
}

export interface AuthorizationTemplateBundleResult {
  bundleKey: string;
  roleRequestId: string;
  grantRequestIds: string[];
  templateVersion: string;
}

export async function requestAuthorizationRoleTemplate(input: RequestAuthorizationRoleTemplateInput): Promise<AuthorizationTemplateBundleResult> {
  const template = getAuthorizationRoleTemplate(input.templateKey);
  assertTemplateScope(template, input);
  const rationale = input.rationale.trim();
  if (rationale.length < 20) throw new Error('PROVISIONING_RATIONALE_REQUIRED');

  const authorization = await authorizationRepository.authorize({
    actorUserId: input.actorUserId,
    action: 'ADMINISTER',
    resource: { objectType: 'AUDIT_EVENT', objectId: `authorization-template:${input.templateKey}` },
  });
  if (authorization.decision !== 'ALLOW') throw new Error(`AUTHORIZATION_DENIED:${authorization.reason}`);

  const bundleKey = input.bundleKey?.trim() || randomUUID();
  const bankKey = input.bankKey?.trim() || null;
  const committeeId = input.committeeId?.trim() || null;

  const roleRequestId = await authorizationProvisioningRepository.createRequest({
    requestedBy: input.actorUserId,
    subjectUserId: input.targetUserId,
    payload: {
      kind: 'ROLE_ASSIGNMENT_CREATE',
      userId: input.targetUserId,
      role: template.role,
      bankKey: template.scopeMode === 'BANK_REQUIRED' ? bankKey : null,
      committeeId: template.scopeMode === 'COMMITTEE_REQUIRED' ? committeeId : null,
    },
    rationale: `${rationale} [${AUTHORIZATION_TEMPLATE_VERSION}:${input.templateKey}]`,
    requestKey: `auth-template:${bundleKey}:role`,
  });

  const grantRequestIds: string[] = [];
  for (let index = 0; index < template.grants.length; index += 1) {
    const grant = template.grants[index];
    const requestId = await authorizationProvisioningRepository.createRequest({
      requestedBy: input.actorUserId,
      subjectUserId: input.targetUserId,
      payload: {
        kind: 'GRANT_CREATE',
        grant: {
          role: template.role,
          action: grant.action,
          objectType: grant.objectType,
          bankKey: template.scopeMode === 'BANK_REQUIRED' ? bankKey : null,
          committeeId: template.scopeMode === 'COMMITTEE_REQUIRED' ? committeeId : null,
          maxRisk: grant.maxRisk ?? null,
          maxMateriality: grant.maxMateriality ?? null,
          maxAmount: grant.maxAmount ?? null,
          policyVersion: 'RBAC_ABAC_v1.0',
        },
      },
      rationale: `${rationale} [${AUTHORIZATION_TEMPLATE_VERSION}:${input.templateKey}:grant:${index}]`,
      requestKey: `auth-template:${bundleKey}:grant:${index}`,
    });
    grantRequestIds.push(requestId);
  }

  return { bundleKey, roleRequestId, grantRequestIds, templateVersion: AUTHORIZATION_TEMPLATE_VERSION };
}
