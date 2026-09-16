'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { requestAuthorizationRoleTemplate } from '@/features/governance/services/request-authorization-role-template';
import { requestAuthorizationProvisioning } from '@/features/governance/services/authorization-provisioning-service';

function value(fd: FormData, key: string): string { return String(fd.get(key) ?? '').trim(); }
function finish(status: 'success' | 'error', message: string): never {
  revalidatePath('/governance/authorization');
  revalidatePath('/governance/authorization/templates');
  redirect(`/governance/authorization/templates?status=${status}&message=${encodeURIComponent(message)}`);
}
function safe(error: unknown): string {
  const raw = error instanceof Error ? error.message : 'AUTHORIZATION_TEMPLATE_REQUEST_FAILED';
  return ['AUTHORIZATION_','PROVISIONING_','GRANT_','ADMINISTER_'].some((prefix)=>raw.startsWith(prefix)) ? raw : 'AUTHORIZATION_TEMPLATE_REQUEST_FAILED';
}

export async function requestAuthorizationTemplateAction(fd: FormData) {
  const actor = await requireAuthenticatedMutationUser();
  try {
    const targetUserId = value(fd,'targetUserId');
    const templateKey = value(fd,'templateKey');
    const rationale = value(fd,'rationale').slice(0,4000);
    if (!targetUserId) throw new Error('AUTHORIZATION_TEMPLATE_TARGET_REQUIRED');
    if (!templateKey) throw new Error('AUTHORIZATION_TEMPLATE_REQUIRED');
    await requestAuthorizationRoleTemplate({
      actorUserId: actor.id,
      targetUserId,
      templateKey,
      bankKey: value(fd,'bankKey') || null,
      committeeId: value(fd,'committeeId') || null,
      rationale,
      bundleKey: `ui-${randomUUID()}`,
    });
    return finish('success','AUTHORIZATION_TEMPLATE_REQUESTED');
  } catch (error) {
    return finish('error',safe(error));
  }
}

export async function requestAuthorizationAdministratorGrantAction(fd: FormData) {
  const actor = await requireAuthenticatedMutationUser();
  try {
    const targetUserId = value(fd,'targetUserId');
    const rationale = value(fd,'rationale').slice(0,4000);
    if (!targetUserId) throw new Error('AUTHORIZATION_TEMPLATE_TARGET_REQUIRED');
    await requestAuthorizationProvisioning({
      actorUserId: actor.id,
      subjectUserId: targetUserId,
      requestKey: `principal-admin:${randomUUID()}`,
      rationale,
      payload: {
        kind: 'GRANT_CREATE',
        grant: {
          role: 'CENTRAL_BANK_MANAGER',
          action: 'ADMINISTER',
          objectType: 'AUDIT_EVENT',
          principalUserId: targetUserId,
          policyVersion: 'RBAC_ABAC_v1.0',
        },
      },
    });
    return finish('success','AUTHORIZATION_ADMIN_GRANT_REQUESTED');
  } catch (error) {
    return finish('error',safe(error));
  }
}
