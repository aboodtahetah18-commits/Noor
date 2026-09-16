begin;

create or replace function public.apply_authorization_provisioning(
  p_request_id uuid,
  p_actor_user_id uuid
)
returns text
language plpgsql
security invoker
as $$
declare
  r public.authorization_provisioning_requests%rowtype;
  p jsonb;
  v_kind text;
  v_object_id uuid := gen_random_uuid();
  v_object_type text;
  v_status text;
  v_current_status text;
  v_starts_at timestamptz;
  v_expires_at timestamptz;
  v_role text;
begin
  select * into r
  from public.authorization_provisioning_requests
  where id = p_request_id
  for update;

  if not found then raise exception 'PROVISIONING_REQUEST_NOT_FOUND'; end if;
  if r.status <> 'APPROVED' then raise exception 'PROVISIONING_REQUEST_NOT_APPROVED'; end if;
  if r.approved_by is null then raise exception 'PROVISIONING_APPROVAL_REQUIRED'; end if;
  if r.requested_by = r.approved_by then raise exception 'PROVISIONING_REQUESTER_APPROVER_SOD_VIOLATION'; end if;
  if p_actor_user_id = r.requested_by then raise exception 'PROVISIONING_REQUESTER_APPLIER_SOD_VIOLATION'; end if;
  if p_actor_user_id = r.approved_by then raise exception 'PROVISIONING_APPROVER_APPLIER_SOD_VIOLATION'; end if;
  if r.expires_at is not null and r.expires_at <= now() then raise exception 'PROVISIONING_REQUEST_EXPIRED'; end if;

  p := r.payload_json;
  v_kind := coalesce(p->>'kind','');
  v_object_type := v_kind;

  if v_kind = 'ROLE_ASSIGNMENT_CREATE' then
    insert into public.authorization_role_assignments
      (id,user_id,role,bank_key,committee_id,service_id,status,starts_at,ends_at,created_by,provisioning_request_id)
    values (
      v_object_id,(p->>'userId')::uuid,p->>'role',nullif(p->>'bankKey',''),nullif(p->>'committeeId',''),nullif(p->>'serviceId',''),
      'ACTIVE',coalesce(nullif(p->>'startsAt','')::timestamptz,now()),nullif(p->>'endsAt','')::timestamptz,p_actor_user_id,p_request_id
    );
  elsif v_kind = 'ROLE_ASSIGNMENT_STATUS' then
    v_object_id := (p->>'assignmentId')::uuid;
    v_status := p->>'status';
    select status into v_current_status from public.authorization_role_assignments where id=v_object_id for update;
    if not found then raise exception 'ROLE_ASSIGNMENT_NOT_FOUND'; end if;
    if not (v_current_status=v_status or (v_current_status='ACTIVE' and v_status in ('SUSPENDED','REVOKED','EXPIRED')) or (v_current_status='SUSPENDED' and v_status in ('ACTIVE','REVOKED','EXPIRED'))) then
      raise exception 'ROLE_ASSIGNMENT_STATUS_TRANSITION_INVALID';
    end if;
    update public.authorization_role_assignments set status=v_status where id=v_object_id;
  elsif v_kind = 'GRANT_CREATE' then
    p := p->'grant';
    insert into public.authorization_grants
      (id,role,action,object_type,bank_key,committee_id,case_type,max_risk,max_materiality,max_amount,policy_version,is_active,provisioning_request_id)
    values (
      v_object_id,p->>'role',p->>'action',p->>'objectType',nullif(p->>'bankKey',''),nullif(p->>'committeeId',''),nullif(p->>'caseType',''),
      nullif(p->>'maxRisk',''),nullif(p->>'maxMateriality',''),nullif(p->>'maxAmount','')::numeric,coalesce(nullif(p->>'policyVersion',''),'RBAC_ABAC_v1.0'),true,p_request_id
    );
  elsif v_kind = 'GRANT_STATUS' then
    v_object_id := (p->>'grantId')::uuid;
    update public.authorization_grants set is_active=coalesce((p->>'isActive')::boolean,false) where id=v_object_id;
    if not found then raise exception 'GRANT_NOT_FOUND'; end if;
  elsif v_kind = 'DELEGATION_CREATE' then
    p := p->'delegation';
    insert into public.authorization_delegations
      (id,from_user_id,from_role,to_user_id,to_role,permissions_json,scope_json,max_amount,max_risk,starts_at,ends_at,can_redelegate,approved_by,status,provisioning_request_id)
    values (
      v_object_id,(p->>'fromUserId')::uuid,p->>'fromRole',(p->>'toUserId')::uuid,p->>'toRole',coalesce(p->'permissions','[]'::jsonb),coalesce(p->'scope','{}'::jsonb),
      nullif(p->>'maxAmount','')::numeric,nullif(p->>'maxRisk',''),(p->>'startsAt')::timestamptz,(p->>'endsAt')::timestamptz,
      coalesce((p->>'canRedelegate')::boolean,false),r.approved_by,'ACTIVE',p_request_id
    );
  elsif v_kind = 'DELEGATION_STATUS' then
    v_object_id := (p->>'delegationId')::uuid;
    v_status := p->>'status';
    select status into v_current_status from public.authorization_delegations where id=v_object_id for update;
    if not found then raise exception 'DELEGATION_NOT_FOUND'; end if;
    if not (v_current_status=v_status or (v_current_status='ACTIVE' and v_status in ('SUSPENDED','REVOKED','EXPIRED')) or (v_current_status='SUSPENDED' and v_status in ('ACTIVE','REVOKED','EXPIRED'))) then
      raise exception 'DELEGATION_STATUS_TRANSITION_INVALID';
    end if;
    update public.authorization_delegations set status=v_status where id=v_object_id;
  elsif v_kind = 'BREAK_GLASS_REQUEST' then
    p := p->'breakGlass';
    v_role := p->>'role';
    if not exists (
      select 1 from public.authorization_role_assignments
      where user_id=(p->>'actorUserId')::uuid and role=v_role and status='ACTIVE' and starts_at<=now() and (ends_at is null or ends_at>now())
    ) then raise exception 'BREAK_GLASS_REQUIRES_ACTIVE_ROLE'; end if;
    v_starts_at := now();
    v_expires_at := v_starts_at + make_interval(mins => (p->>'durationMinutes')::integer);
    insert into public.authorization_break_glass_sessions
      (id,provisioning_request_id,actor_user_id,approved_by,permissions_json,scope_json,max_amount,max_risk,justification,incident_reference,starts_at,expires_at,status)
    values (
      v_object_id,p_request_id,(p->>'actorUserId')::uuid,r.approved_by,coalesce(p->'permissions','[]'::jsonb),coalesce(p->'scope','{}'::jsonb)||jsonb_build_object('role',v_role),
      nullif(p->>'maxAmount','')::numeric,nullif(p->>'maxRisk',''),p->>'justification',p->>'incidentReference',v_starts_at,v_expires_at,'ACTIVE'
    );
  else
    raise exception 'PROVISIONING_CHANGE_TYPE_UNSUPPORTED';
  end if;

  update public.authorization_provisioning_requests set status='APPLIED',applied_at=now() where id=p_request_id and status='APPROVED';
  if not found then raise exception 'PROVISIONING_REQUEST_APPLY_RACE'; end if;

  insert into public.authorization_admin_events
    (id,actor_user_id,event_type,provisioning_request_id,target_user_id,object_type,object_id,reason,context_json)
  values (
    gen_random_uuid(),p_actor_user_id,'PROVISIONING_APPLIED',p_request_id,r.subject_user_id,v_object_type,v_object_id::text,
    'Approved authorization provisioning request applied atomically with three-actor SoD.',
    jsonb_build_object('changeType',r.change_type,'requester',r.requested_by,'approver',r.approved_by,'applier',p_actor_user_id)
  );

  return v_object_id::text;
end;
$$;

commit;
