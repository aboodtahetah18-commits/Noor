begin;

-- ADMINISTER is always principal-scoped. Role-wide administrator grants are forbidden.
alter table public.authorization_grants
  add column if not exists principal_user_id uuid references public.profiles(id) on delete restrict;

create index if not exists authorization_grants_principal_idx
  on public.authorization_grants(principal_user_id, action, object_type, is_active);

create or replace function public.guard_authorization_admin_grant_principal()
returns trigger
language plpgsql
as $$
declare
  v_principal uuid;
begin
  if new.action <> 'ADMINISTER' then return new; end if;

  if new.principal_user_id is null and new.provisioning_request_id is not null then
    select nullif(payload_json->'grant'->>'principalUserId','')::uuid
      into v_principal
    from public.authorization_provisioning_requests
    where id=new.provisioning_request_id;
    new.principal_user_id := v_principal;
  end if;

  if new.principal_user_id is null then
    raise exception 'ADMINISTER_GRANT_REQUIRES_PRINCIPAL';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_authorization_admin_grant_principal on public.authorization_grants;
create trigger guard_authorization_admin_grant_principal
before insert or update on public.authorization_grants
for each row execute function public.guard_authorization_admin_grant_principal();

create table if not exists public.authorization_bootstrap_records (
  bootstrap_key text primary key check (bootstrap_key = 'INITIAL_ADMIN_V1'),
  target_user_id uuid not null references public.profiles(id) on delete restrict,
  role text not null check (role = 'CENTRAL_BANK_MANAGER'),
  requester_ref text not null,
  approver_ref text not null,
  rationale text not null,
  assignment_id uuid not null references public.authorization_role_assignments(id) on delete restrict,
  grant_id uuid not null references public.authorization_grants(id) on delete restrict,
  executed_at timestamptz not null default now(),
  check (length(trim(requester_ref)) >= 3),
  check (length(trim(approver_ref)) >= 3),
  check (requester_ref <> approver_ref),
  check (length(trim(rationale)) >= 30)
);

-- Bootstrap history is immutable and can exist exactly once because bootstrap_key is the PK.
drop trigger if exists prevent_authorization_bootstrap_mutation on public.authorization_bootstrap_records;
create trigger prevent_authorization_bootstrap_mutation
before update or delete on public.authorization_bootstrap_records
for each row execute function public.prevent_algorithm_governance_mutation();

create or replace function public.bootstrap_initial_authorization_admin(
  p_target_user_id uuid,
  p_requester_ref text,
  p_approver_ref text,
  p_rationale text
)
returns table(assignment_id uuid, grant_id uuid)
language plpgsql
as $$
declare
  v_assignment_id uuid := gen_random_uuid();
  v_grant_id uuid := gen_random_uuid();
begin
  if p_target_user_id is null then
    raise exception 'authorization bootstrap target is required';
  end if;
  if length(trim(coalesce(p_requester_ref,''))) < 3 or length(trim(coalesce(p_approver_ref,''))) < 3 then
    raise exception 'authorization bootstrap operator references are required';
  end if;
  if trim(p_requester_ref) = trim(p_approver_ref) then
    raise exception 'authorization bootstrap requires two distinct operator references';
  end if;
  if length(trim(coalesce(p_rationale,''))) < 30 then
    raise exception 'authorization bootstrap rationale must be at least 30 characters';
  end if;
  if not exists (select 1 from public.profiles where id=p_target_user_id) then
    raise exception 'authorization bootstrap target profile not found';
  end if;
  if exists (select 1 from public.authorization_bootstrap_records where bootstrap_key='INITIAL_ADMIN_V1') then
    raise exception 'authorization bootstrap already completed';
  end if;
  if exists (
    select 1
    from public.authorization_role_assignments a
    join public.authorization_grants g on g.role=a.role
    where a.status='ACTIVE' and a.starts_at<=now() and (a.ends_at is null or a.ends_at>now())
      and g.is_active=true and g.action='ADMINISTER' and g.object_type='AUDIT_EVENT'
      and g.principal_user_id=a.user_id
  ) then
    raise exception 'authorization administrator already exists; use governed provisioning';
  end if;

  insert into public.authorization_role_assignments
    (id,user_id,role,status,starts_at,created_by)
  values
    (v_assignment_id,p_target_user_id,'CENTRAL_BANK_MANAGER','ACTIVE',now(),p_target_user_id);

  insert into public.authorization_grants
    (id,role,action,object_type,principal_user_id,policy_version,is_active)
  values
    (v_grant_id,'CENTRAL_BANK_MANAGER','ADMINISTER','AUDIT_EVENT',p_target_user_id,'RBAC_ABAC_v1.0',true);

  insert into public.authorization_bootstrap_records
    (bootstrap_key,target_user_id,role,requester_ref,approver_ref,rationale,assignment_id,grant_id)
  values
    ('INITIAL_ADMIN_V1',p_target_user_id,'CENTRAL_BANK_MANAGER',trim(p_requester_ref),trim(p_approver_ref),trim(p_rationale),v_assignment_id,v_grant_id);

  return query select v_assignment_id, v_grant_id;
end;
$$;

-- There is intentionally no application route for this function. It is an operator ceremony only.
comment on function public.bootstrap_initial_authorization_admin(uuid,text,text,text) is
  'One-time operator ceremony for the first principal-scoped ADMINISTER grant. Never call from an application route.';

commit;
