import { randomUUID } from 'node:crypto';
import { rawSql } from '@/infrastructure/db/client';
import {
  validateBreakGlass,
  validateDelegation,
  validateGrantScope,
  validateIndependentApproval,
  type AuthorizationLifecycleStatus,
  type BreakGlassProvisioningInput,
  type DelegationProvisioningInput,
  type GrantScopeInput,
  type ProvisioningChangeType,
} from '@/governance/authorization-provisioning-policy';
import type { GovernanceRole } from '@/governance/authorization-policy';

export type ProvisioningPayload =
  | { kind: 'ROLE_ASSIGNMENT_CREATE'; userId: string; role: GovernanceRole; bankKey?: string | null; committeeId?: string | null; serviceId?: string | null; startsAt?: string; endsAt?: string | null }
  | { kind: 'ROLE_ASSIGNMENT_STATUS'; assignmentId: string; status: AuthorizationLifecycleStatus }
  | { kind: 'GRANT_CREATE'; grant: GrantScopeInput }
  | { kind: 'GRANT_STATUS'; grantId: string; isActive: boolean }
  | { kind: 'DELEGATION_CREATE'; delegation: DelegationProvisioningInput }
  | { kind: 'DELEGATION_STATUS'; delegationId: string; status: AuthorizationLifecycleStatus }
  | { kind: 'BREAK_GLASS_REQUEST'; breakGlass: BreakGlassProvisioningInput };

export interface CreateProvisioningRequestInput {
  requestedBy: string;
  subjectUserId?: string | null;
  payload: ProvisioningPayload;
  rationale: string;
  requestKey: string;
  expiresAt?: string | null;
}

function assertPayloadMatches(payload: ProvisioningPayload): ProvisioningChangeType {
  switch (payload.kind) {
    case 'GRANT_CREATE': validateGrantScope(payload.grant); break;
    case 'DELEGATION_CREATE': validateDelegation(payload.delegation); break;
    case 'BREAK_GLASS_REQUEST': validateBreakGlass(payload.breakGlass); break;
    case 'ROLE_ASSIGNMENT_STATUS':
    case 'DELEGATION_STATUS':
      if (!payload.status) throw new Error('AUTHORIZATION_STATUS_REQUIRED');
      break;
    default: break;
  }
  return payload.kind;
}

export class AuthorizationProvisioningRepository {
  async createRequest(input: CreateProvisioningRequestInput): Promise<string> {
    const rationale = input.rationale.trim();
    if (rationale.length < 20) throw new Error('PROVISIONING_RATIONALE_REQUIRED');
    const requestKey = input.requestKey.trim();
    if (!requestKey) throw new Error('PROVISIONING_REQUEST_KEY_REQUIRED');
    const changeType = assertPayloadMatches(input.payload);
    const id = randomUUID();
    const rows = await rawSql`
      insert into public.authorization_provisioning_requests
        (id,requested_by,subject_user_id,change_type,payload_json,rationale,status,expires_at,request_key)
      values (
        ${id}::uuid, ${input.requestedBy}::uuid, ${input.subjectUserId ?? null}::uuid,
        ${changeType}, ${JSON.stringify(input.payload)}::jsonb, ${rationale}, 'PENDING',
        ${input.expiresAt ?? null}::timestamptz, ${requestKey}
      )
      on conflict (request_key) do update set request_key=excluded.request_key
      returning id::text
    `;
    const requestId = String(rows[0]?.id ?? id);
    await this.appendEvent(input.requestedBy, 'PROVISIONING_REQUESTED', requestId, input.subjectUserId ?? null, null, null, rationale, { changeType });
    return requestId;
  }

  async approveRequest(requestId: string, approvedBy: string): Promise<void> {
    const rows = await rawSql`
      select requested_by::text, status, expires_at::text
      from public.authorization_provisioning_requests where id=${requestId}::uuid
    `;
    const row = rows[0];
    if (!row) throw new Error('PROVISIONING_REQUEST_NOT_FOUND');
    validateIndependentApproval(String(row.requested_by), approvedBy);
    if (String(row.status) !== 'PENDING') throw new Error('PROVISIONING_REQUEST_NOT_PENDING');
    if (row.expires_at && Date.parse(String(row.expires_at)) <= Date.now()) throw new Error('PROVISIONING_REQUEST_EXPIRED');
    await rawSql`
      update public.authorization_provisioning_requests
      set status='APPROVED', approved_by=${approvedBy}::uuid, approved_at=now()
      where id=${requestId}::uuid and status='PENDING'
    `;
    await this.appendEvent(approvedBy, 'PROVISIONING_APPROVED', requestId, null, null, null, 'Independent provisioning approval recorded.', {});
  }

  async rejectRequest(requestId: string, rejectedBy: string, reason: string): Promise<void> {
    const rationale = reason.trim();
    if (rationale.length < 20) throw new Error('PROVISIONING_REJECTION_REASON_REQUIRED');
    const current = await rawSql`
      select requested_by::text, status
      from public.authorization_provisioning_requests
      where id=${requestId}::uuid
    `;
    const row = current[0];
    if (!row) throw new Error('PROVISIONING_REQUEST_NOT_FOUND');
    if (String(row.status) !== 'PENDING') throw new Error('PROVISIONING_REQUEST_NOT_PENDING');
    if (String(row.requested_by) === rejectedBy) throw new Error('PROVISIONING_INDEPENDENT_REJECTION_REQUIRED');
    const updated = await rawSql`
      update public.authorization_provisioning_requests
      set status='REJECTED', rejection_reason=${rationale}
      where id=${requestId}::uuid and status='PENDING'
      returning id::text
    `;
    if (!updated[0]) throw new Error('PROVISIONING_REQUEST_NOT_PENDING');
    await this.appendEvent(rejectedBy, 'PROVISIONING_REJECTED', requestId, null, null, null, rationale, {});
  }

  private async appendEvent(actorUserId: string, eventType: string, requestId: string | null, targetUserId: string | null, objectType: string | null, objectId: string | null, reason: string, context: Record<string, unknown>): Promise<void> {
    await rawSql`
      insert into public.authorization_admin_events
        (id,actor_user_id,event_type,provisioning_request_id,target_user_id,object_type,object_id,reason,context_json)
      values (
        ${randomUUID()}::uuid, ${actorUserId}::uuid, ${eventType}, ${requestId}::uuid, ${targetUserId}::uuid,
        ${objectType}, ${objectId}, ${reason}, ${JSON.stringify(context)}::jsonb
      )
    `;
  }
}

export const authorizationProvisioningRepository = new AuthorizationProvisioningRepository();
