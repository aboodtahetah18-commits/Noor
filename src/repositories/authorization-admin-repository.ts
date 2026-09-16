import { rawSql } from '@/infrastructure/db/client';

export interface AuthorizationAdminSnapshot {
  requests: Array<Record<string, unknown>>;
  assignments: Array<Record<string, unknown>>;
  grants: Array<Record<string, unknown>>;
  delegations: Array<Record<string, unknown>>;
  breakGlass: Array<Record<string, unknown>>;
  events: Array<Record<string, unknown>>;
}

export async function getAuthorizationAdminSnapshot(): Promise<AuthorizationAdminSnapshot> {
  const [requests, assignments, grants, delegations, breakGlass, events] = await rawSql.transaction([
    rawSql`
      select r.id::text, r.change_type, r.status, r.rationale, r.request_key,
             r.requested_at::text, r.expires_at::text, r.approved_at::text, r.applied_at::text,
             r.requested_by::text, requester.display_name as requested_by_name,
             r.subject_user_id::text, subject.display_name as subject_name,
             r.approved_by::text, approver.display_name as approved_by_name
      from public.authorization_provisioning_requests r
      left join public.profiles requester on requester.id=r.requested_by
      left join public.profiles subject on subject.id=r.subject_user_id
      left join public.profiles approver on approver.id=r.approved_by
      order by case r.status when 'PENDING' then 0 when 'APPROVED' then 1 else 2 end, r.requested_at desc
      limit 150
    `,
    rawSql`
      select a.id::text, a.user_id::text, p.display_name, a.role, a.bank_key, a.committee_id, a.service_id,
             a.status, a.starts_at::text, a.ends_at::text, a.provisioning_request_id::text
      from public.authorization_role_assignments a
      left join public.profiles p on p.id=a.user_id
      order by a.created_at desc
      limit 200
    `,
    rawSql`
      select id::text, role, action, object_type, bank_key, committee_id, case_type,
             max_risk, max_materiality, max_amount::text, policy_version, is_active,
             provisioning_request_id::text, created_at::text
      from public.authorization_grants
      order by created_at desc
      limit 250
    `,
    rawSql`
      select d.id::text, d.from_user_id::text, pf.display_name as from_name,
             d.to_user_id::text, pt.display_name as to_name,
             d.from_role, d.to_role, d.permissions_json, d.scope_json,
             d.max_amount::text, d.max_risk, d.starts_at::text, d.ends_at::text,
             d.status, d.provisioning_request_id::text
      from public.authorization_delegations d
      left join public.profiles pf on pf.id=d.from_user_id
      left join public.profiles pt on pt.id=d.to_user_id
      order by d.created_at desc
      limit 200
    `,
    rawSql`
      select b.id::text, b.actor_user_id::text, p.display_name as actor_name,
             b.approved_by::text, pa.display_name as approved_by_name,
             b.permissions_json, b.scope_json, b.max_amount::text, b.max_risk,
             b.justification, b.incident_reference, b.starts_at::text, b.expires_at::text,
             b.status, (b.status='ACTIVE' and b.expires_at>now()) as is_current,
             b.provisioning_request_id::text
      from public.authorization_break_glass_sessions b
      left join public.profiles p on p.id=b.actor_user_id
      left join public.profiles pa on pa.id=b.approved_by
      order by b.created_at desc
      limit 100
    `,
    rawSql`
      select e.id::text, e.event_type, e.actor_user_id::text, p.display_name as actor_name,
             e.target_user_id::text, t.display_name as target_name,
             e.provisioning_request_id::text, e.object_type, e.object_id, e.reason,
             e.context_json, e.created_at::text
      from public.authorization_admin_events e
      left join public.profiles p on p.id=e.actor_user_id
      left join public.profiles t on t.id=e.target_user_id
      order by e.created_at desc
      limit 200
    `,
  ]);

  return { requests, assignments, grants, delegations, breakGlass, events };
}
