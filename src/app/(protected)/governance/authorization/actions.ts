'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import {
  applyAuthorizationProvisioning,
  approveAuthorizationProvisioning,
  rejectAuthorizationProvisioning,
  requestAuthorizationProvisioning,
  revokeBreakGlassAccess,
} from '@/features/governance/services/authorization-provisioning-service';
import type { GovernanceAction, GovernanceObjectType, GovernanceRole, MaterialityLevel, RiskLevel } from '@/governance/authorization-policy';
import type { AuthorizationLifecycleStatus } from '@/governance/authorization-provisioning-policy';

const ROLES = new Set<GovernanceRole>(['USER','CENTRAL_BOARD_MEMBER','CENTRAL_BANK_MANAGER','BANK_MANAGER','COMMITTEE_CHAIR','COMMITTEE_MEMBER','ADVISOR','DATA_OWNER','DECISION_OWNER','EXECUTION_OWNER','MONITORING_OWNER','REVIEW_OWNER','CLOSURE_AUTHORITY','AUDITOR','SYSTEM_SERVICE']);
const ACTIONS = new Set<GovernanceAction>(['CREATE','READ','UPDATE','SUBMIT','RECOMMEND','REVIEW','APPROVE','REJECT','ESCALATE','ASSIGN','EXECUTE_REQUEST','VERIFY_EVIDENCE','CLOSE','REOPEN','RELEASE','ROLLBACK','EXPORT','ADMINISTER']);
const OBJECTS = new Set<GovernanceObjectType>(['CASE','DECISION','CHANGE_PROPOSAL','BACKTEST','RELEASE','ROLLBACK_REVIEW','EXECUTION_EVIDENCE','AUDIT_EVENT']);
const RISKS = new Set<RiskLevel>(['LOW','MEDIUM','HIGH','CRITICAL']);
const MATERIALITY = new Set<MaterialityLevel>(['LOW','MEDIUM','HIGH','CRITICAL']);
const LIFECYCLE = new Set<AuthorizationLifecycleStatus>(['ACTIVE','SUSPENDED','REVOKED','EXPIRED']);

function value(fd: FormData, key: string): string { return String(fd.get(key) ?? '').trim(); }
function optional(fd: FormData, key: string): string | null { const v=value(fd,key); return v || null; }
function numberOrNull(fd: FormData, key: string): number | null { const v=value(fd,key); if (!v) return null; const n=Number(v); if (!Number.isFinite(n) || n<0) throw new Error('AUTHORIZATION_NUMBER_INVALID'); return n; }
function enumValue<T extends string>(fd: FormData, key: string, allowed: Set<T>): T { const v=value(fd,key) as T; if (!allowed.has(v)) throw new Error(`AUTHORIZATION_${key.toUpperCase()}_INVALID`); return v; }
function rationale(fd: FormData): string { const v=value(fd,'rationale').slice(0,4000); if (v.length<20) throw new Error('PROVISIONING_RATIONALE_REQUIRED'); return v; }
function finish(status:'success'|'error', message:string): never { revalidatePath('/governance/authorization'); redirect(`/governance/authorization?status=${status}&message=${encodeURIComponent(message)}`); }
function safe(error: unknown): string {
  const raw=error instanceof Error?error.message:'AUTHORIZATION_ADMIN_ACTION_FAILED';
  const prefixes=['AUTHORIZATION_','PROVISIONING_','GRANT_','DELEGATION_','BREAK_GLASS_','ROLE_ASSIGNMENT_'];
  return prefixes.some((p)=>raw.startsWith(p))?raw:'AUTHORIZATION_ADMIN_ACTION_FAILED';
}

export async function createRoleAssignmentRequestAction(fd: FormData) {
  const actor=await requireAuthenticatedMutationUser();
  try {
    const userId=value(fd,'userId'); if(!userId) throw new Error('AUTHORIZATION_USER_REQUIRED');
    await requestAuthorizationProvisioning({
      actorUserId:actor.id,
      subjectUserId:userId,
      requestKey:`role:${randomUUID()}`,
      rationale:rationale(fd),
      payload:{ kind:'ROLE_ASSIGNMENT_CREATE', userId, role:enumValue(fd,'role',ROLES), bankKey:optional(fd,'bankKey'), committeeId:optional(fd,'committeeId'), startsAt:optional(fd,'startsAt') ?? undefined, endsAt:optional(fd,'endsAt') },
    });
    return finish('success','ROLE_ASSIGNMENT_REQUEST_CREATED');
  } catch(error){ return finish('error',safe(error)); }
}

export async function createGrantRequestAction(fd: FormData) {
  const actor=await requireAuthenticatedMutationUser();
  try {
    await requestAuthorizationProvisioning({
      actorUserId:actor.id,
      requestKey:`grant:${randomUUID()}`,
      rationale:rationale(fd),
      payload:{ kind:'GRANT_CREATE', grant:{
        role:enumValue(fd,'role',ROLES), action:enumValue(fd,'action',ACTIONS), objectType:enumValue(fd,'objectType',OBJECTS),
        bankKey:optional(fd,'bankKey'), committeeId:optional(fd,'committeeId'), caseType:optional(fd,'caseType'),
        maxRisk:optional(fd,'maxRisk') ? enumValue(fd,'maxRisk',RISKS) : null,
        maxMateriality:optional(fd,'maxMateriality') ? enumValue(fd,'maxMateriality',MATERIALITY) : null,
        maxAmount:numberOrNull(fd,'maxAmount'), policyVersion:optional(fd,'policyVersion') ?? 'RBAC_ABAC_v1.0',
      }},
    });
    return finish('success','GRANT_REQUEST_CREATED');
  } catch(error){ return finish('error',safe(error)); }
}

export async function createDelegationRequestAction(fd: FormData) {
  const actor=await requireAuthenticatedMutationUser();
  try {
    const fromUserId=value(fd,'fromUserId'); const toUserId=value(fd,'toUserId');
    if(!fromUserId||!toUserId) throw new Error('DELEGATION_USER_REQUIRED');
    const role=enumValue(fd,'role',ROLES);
    await requestAuthorizationProvisioning({
      actorUserId:actor.id,
      subjectUserId:toUserId,
      requestKey:`delegation:${randomUUID()}`,
      rationale:rationale(fd),
      payload:{ kind:'DELEGATION_CREATE', delegation:{
        fromUserId, fromRole:role, toUserId, toRole:role,
        permissions:[{ action:enumValue(fd,'action',ACTIONS), objectType:enumValue(fd,'objectType',OBJECTS) }],
        scope:{ bankKey:optional(fd,'bankKey'), committeeId:optional(fd,'committeeId'), caseType:optional(fd,'caseType'), maxMateriality:optional(fd,'maxMateriality') ? enumValue(fd,'maxMateriality',MATERIALITY) : null, policyVersion:optional(fd,'policyVersion') ?? 'RBAC_ABAC_v1.0' },
        maxAmount:numberOrNull(fd,'maxAmount'), maxRisk:optional(fd,'maxRisk') ? enumValue(fd,'maxRisk',RISKS) : null,
        startsAt:value(fd,'startsAt'), endsAt:value(fd,'endsAt'), canRedelegate:false,
      }},
    });
    return finish('success','DELEGATION_REQUEST_CREATED');
  } catch(error){ return finish('error',safe(error)); }
}

export async function createBreakGlassRequestAction(fd: FormData) {
  const actor=await requireAuthenticatedMutationUser();
  try {
    const actorUserId=value(fd,'userId'); if(!actorUserId) throw new Error('BREAK_GLASS_ACTOR_REQUIRED');
    const durationMinutes=Number(value(fd,'durationMinutes'));
    await requestAuthorizationProvisioning({
      actorUserId:actor.id,
      subjectUserId:actorUserId,
      requestKey:`breakglass:${randomUUID()}`,
      rationale:rationale(fd),
      payload:{ kind:'BREAK_GLASS_REQUEST', breakGlass:{
        actorUserId, role:enumValue(fd,'role',ROLES),
        permissions:[{ action:enumValue(fd,'action',ACTIONS), objectType:enumValue(fd,'objectType',OBJECTS) }],
        scope:{ bankKey:optional(fd,'bankKey'), committeeId:optional(fd,'committeeId'), caseType:optional(fd,'caseType'), maxMateriality:optional(fd,'maxMateriality') ? enumValue(fd,'maxMateriality',MATERIALITY) : null, policyVersion:'RBAC_ABAC_v1.0' },
        maxAmount:numberOrNull(fd,'maxAmount'), maxRisk:optional(fd,'maxRisk') ? enumValue(fd,'maxRisk',RISKS) : null,
        justification:value(fd,'justification'), incidentReference:value(fd,'incidentReference'), durationMinutes,
      }},
    });
    return finish('success','BREAK_GLASS_REQUEST_CREATED');
  } catch(error){ return finish('error',safe(error)); }
}

export async function requestAssignmentStatusAction(fd: FormData) {
  const actor=await requireAuthenticatedMutationUser();
  try {
    const assignmentId=value(fd,'assignmentId');
    await requestAuthorizationProvisioning({ actorUserId:actor.id, requestKey:`assignment-status:${randomUUID()}`, rationale:rationale(fd), payload:{kind:'ROLE_ASSIGNMENT_STATUS',assignmentId,status:enumValue(fd,'status',LIFECYCLE)} });
    return finish('success','ROLE_ASSIGNMENT_STATUS_REQUEST_CREATED');
  } catch(error){ return finish('error',safe(error)); }
}

export async function requestGrantStatusAction(fd: FormData) {
  const actor=await requireAuthenticatedMutationUser();
  try {
    const grantId=value(fd,'grantId');
    await requestAuthorizationProvisioning({ actorUserId:actor.id, requestKey:`grant-status:${randomUUID()}`, rationale:rationale(fd), payload:{kind:'GRANT_STATUS',grantId,isActive:value(fd,'isActive')==='true'} });
    return finish('success','GRANT_STATUS_REQUEST_CREATED');
  } catch(error){ return finish('error',safe(error)); }
}

export async function requestDelegationStatusAction(fd: FormData) {
  const actor=await requireAuthenticatedMutationUser();
  try {
    const delegationId=value(fd,'delegationId');
    await requestAuthorizationProvisioning({ actorUserId:actor.id, requestKey:`delegation-status:${randomUUID()}`, rationale:rationale(fd), payload:{kind:'DELEGATION_STATUS',delegationId,status:enumValue(fd,'status',LIFECYCLE)} });
    return finish('success','DELEGATION_STATUS_REQUEST_CREATED');
  } catch(error){ return finish('error',safe(error)); }
}

export async function approveProvisioningRequestAction(fd: FormData) {
  const actor=await requireAuthenticatedMutationUser();
  try { await approveAuthorizationProvisioning({actorUserId:actor.id,provisioningRequestId:value(fd,'requestId')}); return finish('success','PROVISIONING_REQUEST_APPROVED'); }
  catch(error){ return finish('error',safe(error)); }
}

export async function rejectProvisioningRequestAction(fd: FormData) {
  const actor=await requireAuthenticatedMutationUser();
  try { await rejectAuthorizationProvisioning({actorUserId:actor.id,provisioningRequestId:value(fd,'requestId'),reason:rationale(fd)}); return finish('success','PROVISIONING_REQUEST_REJECTED'); }
  catch(error){ return finish('error',safe(error)); }
}

export async function applyProvisioningRequestAction(fd: FormData) {
  const actor=await requireAuthenticatedMutationUser();
  try { await applyAuthorizationProvisioning({actorUserId:actor.id,provisioningRequestId:value(fd,'requestId')}); return finish('success','PROVISIONING_REQUEST_APPLIED'); }
  catch(error){ return finish('error',safe(error)); }
}

export async function revokeBreakGlassAction(fd: FormData) {
  const actor=await requireAuthenticatedMutationUser();
  try { await revokeBreakGlassAccess({actorUserId:actor.id,sessionId:value(fd,'sessionId'),reason:rationale(fd)}); return finish('success','BREAK_GLASS_REVOKED'); }
  catch(error){ return finish('error',safe(error)); }
}
