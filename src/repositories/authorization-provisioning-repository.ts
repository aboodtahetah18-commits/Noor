import { randomUUID } from 'node:crypto';
import { rawSql } from '@/infrastructure/db/client';
import {
  statusTransitionAllowed,
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
    const rows = await rawSql`
      update public.authorization_provisioning_requests
      set status='REJECTED', rejection_reason=${rationale}
      where id=${requestId}::uuid and status='PENDING'
      returning requested_by::text
    `;
    if (!rows[0]) throw new Error('PROVISIONING_REQUEST_NOT_PENDING');
    if (String(rows[0].requested_by) === rejectedBy) throw new Error('PROVISIONING_INDEPENDENT_REJECTION_REQUIRED');
    await this.appendEvent(rejectedBy, 'PROVISIONING_REJECTED', requestId, null, null, null, rationale, {});
  }

  async applyApprovedRequest(requestId: string, actorUserId: string): Promise<string> {
    const rows = await rawSql`
      select change_type, payload_json, requested_by::text, approved_by::text, status, expires_at::text
      from public.authorization_provisioning_requests where id=${requestId}::uuid
    `;
    const row = rows[0];
    if (!row) throw new Error('PROVISIONING_REQUEST_NOT_FOUND');
    if (String(row.status) !== 'APPROVED') throw new Error('PROVISIONING_REQUEST_NOT_APPROVED');
    if (!row.approved_by) throw new Error('PROVISIONING_APPROVAL_REQUIRED');
    if (row.expires_at && Date.parse(String(row.expires_at)) <= Date.now()) throw new Error('PROVISIONING_REQUEST_EXPIRED');
    const payload = row.payload_json as ProvisioningPayload;
    assertPayloadMatches(payload);
    let objectType = payload.kind;
    let objectId = '';

    if (payload.kind === 'ROLE_ASSIGNMENT_CREATE') {
      objectId = randomUUID();
      await rawSql`
        insert into public.authorization_role_assignments
          (id,user_id,role,bank_key,committee_id,service_id,status,starts_at,ends_at,created_by,provisioning_request_id)
        values (
          ${objectId}::uuid, ${payload.userId}::uuid, ${payload.role}, ${payload.bankKey ?? null},
          ${payload.committeeId ?? null}, ${payload.serviceId ?? null}, 'ACTIVE',
          ${payload.startsAt ?? new Date().toISOString()}::timestamptz, ${payload.endsAt ?? null}::timestamptz,
          ${actorUserId}::uuid, ${requestId}::uuid
        )
      `;
    } else if (payload.kind === 'ROLE_ASSIGNMENT_STATUS') {
      const current = await rawSql`select status from public.authorization_role_assignments where id=${payload.assignmentId}::uuid`;
      if (!current[0]) throw new Error('ROLE_ASSIGNMENT_NOT_FOUND');
      if (!statusTransitionAllowed(String(current[0].status) as AuthorizationLifecycleStatus, payload.status)) throw new Error('ROLE_ASSIGNMENT_STATUS_TRANSITION_INVALID');
      objectId = payload.assignmentId;
      await rawSql`update public.authorization_role_assignments set status=${payload.status} where id=${payload.assignmentId}::uuid`;
    } else if (payload.kind === 'GRANT_CREATE') {
      validateGrantScope(payload.grant);
      objectId = randomUUID();
      const g = payload.grant;
      await rawSql`
        insert into public.authorization_grants
          (id,role,action,object_type,bank_key,committee_id,case_type,max_risk,max_materiality,max_amount,policy_version,is_active,provisioning_request_id)
        values (
          ${objectId}::uuid, ${g.role}, ${g.action}, ${g.objectType}, ${g.bankKey ?? null}, ${g.committeeId ?? null},
          ${g.caseType ?? null}, ${g.maxRisk ?? null}, ${g.maxMateriality ?? null}, ${g.maxAmount ?? null},
          ${g.policyVersion ?? 'RBAC_ABAC_v1.0'}, true, ${requestId}::uuid
        )
      `;
    } else if (payload.kind === 'GRANT_STATUS') {
      objectId = payload.grantId;
      await rawSql`update public.authorization_grants set is_active=${payload.isActive} where id=${payload.grantId}::uuid`;
    } else if (payload.kind === 'DELEGATION_CREATE') {
      validateDelegation(payload.delegation);
      objectId = randomUUID();
      const d = payload.delegation;
      await rawSql`
        insert into public.authorization_delegations
          (id,from_user_id,from_role,to_user_id,to_role,permissions_json,scope_json,max_amount,max_risk,starts_at,ends_at,can_redelegate,approved_by,status,provisioning_request_id)
        values (
          ${objectId}::uuid, ${d.fromUserId}::uuid, ${d.fromRole}, ${d.toUserId}::uuid, ${d.toRole},
          ${JSON.stringify(d.permissions)}::jsonb, ${JSON.stringify(d.scope)}::jsonb, ${d.maxAmount ?? null}, ${d.maxRisk ?? null},
          ${d.startsAt}::timestamptz, ${d.endsAt}::timestamptz, ${d.canRedelegate === true}, ${String(row.approved_by)}::uuid,
          'ACTIVE', ${requestId}::uuid
        )
      `;
    } else if (payload.kind === 'DELEGATION_STATUS') {
      const current = await rawSql`select status from public.authorization_delegations where id=${payload.delegationId}::uuid`;
      if (!current[0]) throw new Error('DELEGATION_NOT_FOUND');
      if (!statusTransitionAllowed(String(current[0].status) as AuthorizationLifecycleStatus, payload.status)) throw new Error('DELEGATION_STATUS_TRANSITION_INVALID');
      objectId = payload.delegationId;
      await rawSql`update public.authorization_delegations set status=${payload.status} where id=${payload.delegationId}::uuid`;
    } else {
      validateBreakGlass(payload.breakGlass);
      const b = payload.breakGlass;
      const activeRole = await rawSql`
        select 1 from public.authorization_role_assignments
        where user_id=${b.actorUserId}::uuid and role=${b.role} and status='ACTIVE'
          and starts_at<=now() and (ends_at is null or ends_at>now()) limit 1
      `;
      if (!activeRole[0]) throw new Error('BREAK_GLASS_REQUIRES_ACTIVE_ROLE');
      objectId = randomUUID();
      const startsAt = new Date();
      const expiresAt = new Date(startsAt.getTime() + b.durationMinutes * 60_000);
      await rawSql`
        insert into public.authorization_break_glass_sessions
          (id,provisioning_request_id,actor_user_id,approved_by,permissions_json,scope_json,max_amount,max_risk,justification,incident_reference,starts_at,expires_at,status)
        values (
          ${objectId}::uuid, ${requestId}::uuid, ${b.actorUserId}::uuid, ${String(row.approved_by)}::uuid,
          ${JSON.stringify(b.permissions)}::jsonb, ${JSON.stringify({ ...b.scope, role: b.role })}::jsonb,
          ${b.maxAmount ?? null}, ${b.maxRisk ?? null}, ${b.justification.trim()}, ${b.incidentReference.trim()},
          ${startsAt.toISOString()}::timestamptz, ${expiresAt.toISOString()}::timestamptz, 'ACTIVE'
        )
      `;
      objectType = 'BREAK_GLASS_REQUEST';
    }

    await rawSql`
      update public.authorization_provisioning_requests
      set status='APPLIED', applied_at=now()
      where id=${requestId}::uuid and status='APPROVED'
    `;
    await this.appendEvent(actorUserId, 'PROVISIONING_APPLIED', requestId, null, objectType, objectId, 'Approved authorization provisioning request applied.', {});
    return objectId;
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
