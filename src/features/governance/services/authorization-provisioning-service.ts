import { authorizationRepository } from '@/repositories/authorization-repository';
import {
  authorizationProvisioningRepository,
  type ProvisioningPayload,
} from '@/repositories/authorization-provisioning-repository';

async function requireAuthorizationAdmin(actorUserId: string, objectId: string, requestId?: string): Promise<void> {
  const auth = await authorizationRepository.authorize({
    actorUserId,
    action: 'ADMINISTER',
    requestId,
    resource: {
      objectType: 'AUDIT_EVENT',
      objectId,
    },
  });
  if (auth.decision !== 'ALLOW') throw new Error(`AUTHORIZATION_DENIED:${auth.reason}`);
}

export async function requestAuthorizationProvisioning(input: {
  actorUserId: string;
  subjectUserId?: string | null;
  payload: ProvisioningPayload;
  rationale: string;
  requestKey: string;
  expiresAt?: string | null;
  requestId?: string;
}): Promise<string> {
  if (input.payload.kind === 'BREAK_GLASS_REQUEST') {
    if (input.payload.breakGlass.actorUserId !== input.actorUserId) {
      await requireAuthorizationAdmin(input.actorUserId, input.requestKey, input.requestId);
    }
  } else {
    await requireAuthorizationAdmin(input.actorUserId, input.requestKey, input.requestId);
  }

  return authorizationProvisioningRepository.createRequest({
    requestedBy: input.actorUserId,
    subjectUserId: input.subjectUserId ?? null,
    payload: input.payload,
    rationale: input.rationale,
    requestKey: input.requestKey,
    expiresAt: input.expiresAt ?? null,
  });
}

export async function approveAuthorizationProvisioning(input: {
  actorUserId: string;
  provisioningRequestId: string;
  requestId?: string;
}): Promise<void> {
  await requireAuthorizationAdmin(input.actorUserId, input.provisioningRequestId, input.requestId);
  await authorizationProvisioningRepository.approveRequest(input.provisioningRequestId, input.actorUserId);
}

export async function rejectAuthorizationProvisioning(input: {
  actorUserId: string;
  provisioningRequestId: string;
  reason: string;
  requestId?: string;
}): Promise<void> {
  await requireAuthorizationAdmin(input.actorUserId, input.provisioningRequestId, input.requestId);
  await authorizationProvisioningRepository.rejectRequest(input.provisioningRequestId, input.actorUserId, input.reason);
}

export async function applyAuthorizationProvisioning(input: {
  actorUserId: string;
  provisioningRequestId: string;
  requestId?: string;
}): Promise<string> {
  await requireAuthorizationAdmin(input.actorUserId, input.provisioningRequestId, input.requestId);
  return authorizationProvisioningRepository.applyApprovedRequest(input.provisioningRequestId, input.actorUserId);
}
