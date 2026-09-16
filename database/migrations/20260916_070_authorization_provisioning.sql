begin;

create table if not exists public.authorization_provisioning_requests (
  id uuid primary key,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  subject_user_id uuid references public.profiles(id) on delete restrict,
  change_type text not null check (change_type in (
    'ROLE_ASSIGNMENT_CREATE','ROLE_ASSIGNMENT_STATUS','GRANT_CREATE','GRANT_STATUS',
    'DELEGATION_CREATE','DELEGATION_STATUS','BREAK_GLASS_REQUEST'
  )),
  payload_json jsonb not null,
  rationale text not null,
  status text not null default 'PENDING' check (status in (
    'PENDING','APPROVED','REJECTED','APPLIED','CANCELLED','EXPIRED'
  )),
  requested_at timestamptz not null default now(),
  expires_at timestamptz,
  approved_by uuid references public.profiles(id) on delete restrict,
  approved_at timestamptz,
  applied_at timestamptz,
  rejection_reason text,
  request_key text not null,
  check (length(trim(rationale)) >= 20),
  check (expires_at is null or expires_at > requested_at),
  check (approved_by is null or approved_by <> requested_by),
  check (status not in ('APPROVED','APPLIED') or (approved_by is not null and approved_at is not null))
);

create unique index if not exists authorization_provisioning_requests_key_uq
  on public.authorization_provisioning_requests(request_key);
create index if not exists authorization_provisioning_status_idx
  on public.authorization_provisioning_requests(status, requested_at desc);

create table if not exists public.authorization_break_glass_sessions (
  id uuid primary key,
  provisioning_request_id uuid not null unique references public.authorization_provisioning_requests(id) on delete restrict,
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  approved_by uuid not null references public.profiles(id) on delete restrict,
  permissions_json jsonb not null,
  scope_json jsonb not null,
  max_amount numeric(18,2),
  max_risk text check (max_risk is null or max_risk in ('LOW','MEDIUM','HIGH','CRITICAL')),
  justification text not null,
  incident_reference text not null,
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','REVOKED','EXPIRED','CLOSED')),
  revoked_by uuid references public.profiles(id) on delete restrict,
  revoked_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  check (actor_user_id <> approved_by),
  check (expires_at > starts_at),
  check (expires_at <= starts_at + interval '60 minutes'),
  check (length(trim(justification)) >= 30),
  check (length(trim(incident_reference)) >= 3),
  check (max_amount is null or max_amount >= 0)
);

create index if not exists authorization_break_glass_actor_idx
  on public.authorization_break_glass_sessions(actor_user_id, status, expires_at);

create table if not exists public.authorization_admin_events (
  id uuid primary key,
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  event_type text not null check (event_type in (
    'PROVISIONING_REQUESTED','PROVISIONING_APPROVED','PROVISIONING_REJECTED','PROVISIONING_APPLIED',
    'ROLE_STATUS_CHANGED','GRANT_STATUS_CHANGED','DELEGATION_STATUS_CHANGED',
    'BREAK_GLASS_ACTIVATED','BREAK_GLASS_REVOKED','BREAK_GLASS_EXPIRED','BREAK_GLASS_CLOSED'
  )),
  provisioning_request_id uuid references public.authorization_provisioning_requests(id) on delete restrict,
  target_user_id uuid references public.profiles(id) on delete restrict,
  object_type text,
  object_id text,
  reason text not null,
  context_json jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists authorization_admin_events_request_idx
  on public.authorization_admin_events(provisioning_request_id, created_at);
create index if not exists authorization_admin_events_actor_idx
  on public.authorization_admin_events(actor_user_id, created_at desc);

-- Link newly created authorization records to exactly one approved request.
alter table public.authorization_role_assignments
  add column if not exists provisioning_request_id uuid references public.authorization_provisioning_requests(id) on delete restrict;
alter table public.authorization_grants
  add column if not exists provisioning_request_id uuid references public.authorization_provisioning_requests(id) on delete restrict;
alter table public.authorization_delegations
  add column if not exists provisioning_request_id uuid references public.authorization_provisioning_requests(id) on delete restrict;

create unique index if not exists authorization_role_assignment_request_uq
  on public.authorization_role_assignments(provisioning_request_id)
  where provisioning_request_id is not null;
create unique index if not exists authorization_grant_request_uq
  on public.authorization_grants(provisioning_request_id)
  where provisioning_request_id is not null;
create unique index if not exists authorization_delegation_request_uq
  on public.authorization_delegations(provisioning_request_id)
  where provisioning_request_id is not null;

-- Audit history is append-only.
drop trigger if exists prevent_authorization_admin_events_mutation on public.authorization_admin_events;
create trigger prevent_authorization_admin_events_mutation
before update or delete on public.authorization_admin_events
for each row execute function public.prevent_algorithm_governance_mutation();

-- Provisioning requests can only follow the declared lifecycle.
create or replace function public.guard_authorization_provisioning_request_update()
returns trigger
language plpgsql
as $$
begin
  if old.status in ('REJECTED','APPLIED','CANCELLED','EXPIRED') then
    raise exception 'authorization provisioning request is finalized';
  end if;
  if old.status='PENDING' and new.status not in ('PENDING','APPROVED','REJECTED','CANCELLED','EXPIRED') then
    raise exception 'invalid authorization provisioning transition';
  end if;
  if old.status='APPROVED' and new.status not in ('APPROVED','APPLIED','CANCELLED','EXPIRED') then
    raise exception 'invalid approved authorization provisioning transition';
  end if;
  if new.status in ('APPROVED','APPLIED') and new.approved_by is not distinct from new.requested_by then
    raise exception 'authorization provisioning requires independent approval';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_authorization_provisioning_request_update on public.authorization_provisioning_requests;
create trigger guard_authorization_provisioning_request_update
before update on public.authorization_provisioning_requests
for each row execute function public.guard_authorization_provisioning_request_update();

commit;
