import { rawSql } from '@/infrastructure/db/client';

export class AuthorizationProvisioningAtomicRepository {
  async applyApprovedRequest(requestId: string, actorUserId: string): Promise<string> {
    const rows = await rawSql`
      select public.apply_authorization_provisioning(
        ${requestId}::uuid,
        ${actorUserId}::uuid
      ) as object_id
    `;
    const objectId = rows[0]?.object_id;
    if (!objectId) throw new Error('PROVISIONING_ATOMIC_APPLY_FAILED');
    return String(objectId);
  }
}

export const authorizationProvisioningAtomicRepository = new AuthorizationProvisioningAtomicRepository();
