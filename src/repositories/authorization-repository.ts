import { randomUUID } from 'node:crypto';
import { rawSql } from '@/infrastructure/db/client';
import {
  evaluateAuthorization,
  type AuthorizationActor,
  type AuthorizationDecision,
  type AuthorizationGrant,
  type AuthorizationResource,
  type GovernanceAction,
  type GovernanceObjectType,
  type GovernanceRole,
  type MaterialityLevel,
  type RiskLevel,
} from '@/governance/authorization-policy';

const ROLES = new Set<GovernanceRole>([
  'USER','CENTRAL_BOARD_MEMBER','CENTRAL_BANK_MANAGER','BANK_MANAGER','COMMITTEE_CHAIR','COMMITTEE_MEMBER',
  'ADVISOR','DATA_OWNER','DECISION_OWNER','EXECUTION_OWNER','MONITORING_OWNER','REVIEW_OWNER','CLOSURE_AUTHORITY','AUDITOR','SYSTEM_SERVICE',
]);
const RISKS = new Set<RiskLevel>(['LOW','MEDIUM','HIGH','CRITICAL']);
const MATERIALITY = new Set<MaterialityLevel>(['LOW','MEDIUM','HIGH','CRITICAL']);
const BREAK_GLASS_FORBIDDEN = new Set<GovernanceAction>([
  'APPROVE','REJECT','RELEASE','ROLLBACK','ADMINISTER','EXECUTE_REQUEST','ASSIGN','CLOSE',
]);

function asText(value: unknown): string | null {
  return value == null ? null : String(value);
}
function asRole(value: unknown): GovernanceRole | null {
  const role = String(value ?? '') as GovernanceRole;
  return ROLES.has(role) ? role : null;
}
function asRisk(value: unknown): RiskLevel | null {
  const level = String(value ?? '') as RiskLevel;
  return RISKS.has(level) ? level : null;
}
function asMateriality(value: unknown): MaterialityLevel | null {
  const level = String(value ?? '') as MaterialityLevel;
  return MATERIALITY.has(level) ? level : null;
}
function asNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export interface AuthorizeGovernanceActionInput {
  actorUserId: string;
  action: GovernanceAction;
  resource: AuthorizationResource;
  requestId?: string;
}

export interface AuthorizeGovernanceActionResult extends AuthorizationDecision {
  actorRole: GovernanceRole;
  requestId: string;
}

export class AuthorizationRepository {
  async authorize(input: AuthorizeGovernanceActionInput): Promise<AuthorizeGovernanceActionResult> {
    const now = new Date().toISOString();
    const requestId = input.requestId?.trim() || randomUUID();
    const assignmentRows = await rawSql`
      select id::text as assignment_id, role, bank_key, committee_id, service_id
      from public.authorization_role_assignments
      where user_id=${input.actorUserId}::uuid
        and status='ACTIVE'
        and starts_at<=now()
        and (ends_at is null or ends_at>now())
      order by created_at asc
    `;

    const actors: AuthorizationActor[] = [];
    for (const row of assignmentRows) {
      const role = asRole(row.role);
      if (!role) continue;
      actors.push({
        userId: input.actorUserId,
        role,
        bankKey: asText(row.bank_key),
        committeeId: asText(row.committee_id),
        serviceId: asText(row.service_id),
      });
    }
    if (actors.length === 0) actors.push({ userId: input.actorUserId, role: 'USER' });

    const roleNames = actors.map((actor) => actor.role);
    const grantRows = await rawSql`
      select id::text as grant_id, role, action, object_type, bank_key, committee_id, case_type,
             max_risk, max_materiality, max_amount, policy_version
      from public.authorization_grants
      where is_active=true
        and role = any(${roleNames}::text[])
        and action=${input.action}
        and object_type=${input.resource.objectType}
      order by created_at asc
    `;

    const baseGrants: AuthorizationGrant[] = grantRows.flatMap((row) => {
      const role = asRole(row.role);
      if (!role) return [];
      return [{
        grantId: String(row.grant_id),
        role,
        action: input.action,
        objectType: input.resource.objectType,
        bankKey: asText(row.bank_key),
        committeeId: asText(row.committee_id),
        caseType: asText(row.case_type),
        maxRisk: asRisk(row.max_risk),
        maxMateriality: asMateriality(row.max_materiality),
        maxAmount: asNumber(row.max_amount),
        policyVersion: asText(row.policy_version) ?? 'RBAC_ABAC_v1.0',
      }];
    });

    const delegationRows = await rawSql`
      select id::text as delegation_id, to_role, permissions_json, scope_json, max_amount, max_risk,
             starts_at::text as starts_at, ends_at::text as ends_at, status
      from public.authorization_delegations
      where to_user_id=${input.actorUserId}::uuid
        and status='ACTIVE'
        and starts_at<=now()
        and ends_at>now()
      order by created_at asc
    `;

    const delegatedGrants: AuthorizationGrant[] = [];
    for (const row of delegationRows) {
      const role = asRole(row.to_role);
      if (!role || !actors.some((actor) => actor.role === role)) continue;
      const scope = asRecord(row.scope_json);
      for (const permissionRaw of asArray(row.permissions_json)) {
        const permission = asRecord(permissionRaw);
        if (String(permission.action ?? '') !== input.action) continue;
        if (String(permission.objectType ?? '') !== input.resource.objectType) continue;
        delegatedGrants.push({
          grantId: `delegation:${String(row.delegation_id)}`,
          role,
          action: input.action,
          objectType: input.resource.objectType,
          bankKey: asText(scope.bankKey),
          committeeId: asText(scope.committeeId),
          caseType: asText(scope.caseType),
          maxRisk: asRisk(row.max_risk),
          maxMateriality: asMateriality(scope.maxMateriality),
          maxAmount: asNumber(row.max_amount),
          delegationId: String(row.delegation_id),
          delegationStatus: 'ACTIVE',
          delegationStartsAt: asText(row.starts_at),
          delegationEndsAt: asText(row.ends_at),
          policyVersion: asText(scope.policyVersion) ?? 'RBAC_ABAC_v1.0',
        });
      }
    }

    const breakGlassGrants: AuthorizationGrant[] = [];
    if (!BREAK_GLASS_FORBIDDEN.has(input.action)) {
      const emergencyRows = await rawSql`
        select id::text as session_id, permissions_json, scope_json, max_amount, max_risk,
               starts_at::text as starts_at, expires_at::text as expires_at
        from public.authorization_break_glass_sessions
        where actor_user_id=${input.actorUserId}::uuid
          and status='ACTIVE'
          and starts_at<=now()
          and expires_at>now()
        order by created_at asc
      `;
      for (const row of emergencyRows) {
        const scope = asRecord(row.scope_json);
        const role = asRole(scope.role);
        if (!role || !actors.some((actor) => actor.role === role)) continue;
        for (const permissionRaw of asArray(row.permissions_json)) {
          const permission = asRecord(permissionRaw);
          if (String(permission.action ?? '') !== input.action) continue;
          if (String(permission.objectType ?? '') !== input.resource.objectType) continue;
          breakGlassGrants.push({
            grantId: `breakglass:${String(row.session_id)}`,
            role,
            action: input.action,
            objectType: input.resource.objectType,
            bankKey: asText(scope.bankKey),
            committeeId: asText(scope.committeeId),
            caseType: asText(scope.caseType),
            maxRisk: asRisk(row.max_risk),
            maxMateriality: asMateriality(scope.maxMateriality),
            maxAmount: asNumber(row.max_amount),
            delegationId: String(row.session_id),
            delegationStatus: 'ACTIVE',
            delegationStartsAt: asText(row.starts_at),
            delegationEndsAt: asText(row.expires_at),
            policyVersion: asText(scope.policyVersion) ?? 'RBAC_ABAC_v1.0',
          });
        }
      }
    }

    let final: { actor: AuthorizationActor; decision: AuthorizationDecision } | null = null;
    for (const actor of actors) {
      const grants = [...baseGrants, ...delegatedGrants, ...breakGlassGrants].filter((grant) => grant.role === actor.role);
      const decision = evaluateAuthorization({ actor, action: input.action, resource: input.resource, grants, now });
      if (!final || decision.decision === 'ALLOW') final = { actor, decision };
      if (decision.decision === 'ALLOW') break;
    }

    const fallbackActor: AuthorizationActor = { userId: input.actorUserId, role: 'USER' };
    const actor: AuthorizationActor = final?.actor ?? actors[0] ?? fallbackActor;
    const decision = final?.decision ?? { decision: 'DENY' as const, reason: 'NO_ACTIVE_ROLE', matchedGrantId: null, policyVersion: 'RBAC_ABAC_v1.0' };
    const eventId = randomUUID();
    const matchedGrantUuid = decision.matchedGrantId?.includes(':') ? null : decision.matchedGrantId;

    await rawSql`
      insert into public.authorization_events
        (id,actor_user_id,role,action,object_type,object_id,case_id,bank_key,committee_id,policy_version,decision,reason,matched_grant_id,request_id,context_json)
      values (
        ${eventId}::uuid,
        ${input.actorUserId}::uuid,
        ${actor.role},
        ${input.action},
        ${input.resource.objectType},
        ${input.resource.objectId},
        ${input.resource.caseId ?? null},
        ${input.resource.bankKey ?? actor.bankKey ?? null},
        ${input.resource.committeeId ?? actor.committeeId ?? null},
        ${decision.policyVersion},
        ${decision.decision},
        ${decision.reason},
        ${matchedGrantUuid}::uuid,
        ${requestId},
        ${JSON.stringify({ resource: input.resource, matchedGrantId: decision.matchedGrantId })}::jsonb
      )
    `;

    return { ...decision, actorRole: actor.role, requestId };
  }

  async can(
    actorUserId: string,
    action: GovernanceAction,
    objectType: GovernanceObjectType,
    objectId: string,
    resource: Omit<AuthorizationResource, 'objectType' | 'objectId'> = {},
  ): Promise<boolean> {
    const result = await this.authorize({ actorUserId, action, resource: { ...resource, objectType, objectId } });
    return result.decision === 'ALLOW';
  }
}

export const authorizationRepository = new AuthorizationRepository();
