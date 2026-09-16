begin;

create table if not exists public.authorization_role_assignments (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete restrict,
  role text not null check (role in (
    'USER','CENTRAL_BOARD_MEMBER','CENTRAL_BANK_MANAGER','BANK_MANAGER','COMMITTEE_CHAIR','COMMITTEE_MEMBER',
    'ADVISOR','DATA_OWNER','DECISION_OWNER','EXECUTION_OWNER','MONITORING_OWNER','REVIEW_OWNER','CLOSURE_AUTHORITY','AUDITOR','SYSTEM_SERVICE'
  )),
  bank_key text,
  committee_id text,
  service_id text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','SUSPENDED','REVOKED','EXPIRED')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create table if not exists public.authorization_grants (
  id uuid primary key,
  role text not null check (role in (
    'USER','CENTRAL_BOARD_MEMBER','CENTRAL_BANK_MANAGER','BANK_MANAGER','COMMITTEE_CHAIR','COMMITTEE_MEMBER',
    'ADVISOR','DATA_OWNER','DECISION_OWNER','EXECUTION_OWNER','MONITORING_OWNER','REVIEW_OWNER','CLOSURE_AUTHORITY','AUDITOR','SYSTEM_SERVICE'
  )),
  action text not null check (action in (
    'CREATE','READ','UPDATE','SUBMIT','RECOMMEND','REVIEW','APPROVE','REJECT','ESCALATE','ASSIGN',
    'EXECUTE_REQUEST','VERIFY_EVIDENCE','CLOSE','REOPEN','RELEASE','ROLLBACK','EXPORT','ADMINISTER'
  )),
  object_type text not null check (object_type in (
    'CASE','DECISION','CHANGE_PROPOSAL','BACKTEST','RELEASE','ROLLBACK_REVIEW','EXECUTION_EVIDENCE','AUDIT_EVENT'
  )),
  bank_key text,
  committee_id text,
  case_type text,
  max_risk text check (max_risk is null or max_risk in ('LOW','MEDIUM','HIGH','CRITICAL')),
  max_materiality text check (max_materiality is null or max_materiality in ('LOW','MEDIUM','HIGH','CRITICAL')),
  max_amount numeric(18,2),
  policy_version text not null default 'RBAC_ABAC_v1.0',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (max_amount is null or max_amount >= 0)
);

create table if not exists public.authorization_delegations (
  id uuid primary key,
  from_user_id uuid references public.profiles(id) on delete restrict,
  from_role text not null,
  to_user_id uuid not null references public.profiles(id) on delete restrict,
  to_role text not null,
  permissions_json jsonb not null,
  scope_json jsonb not null,
  max_amount numeric(18,2),
  max_risk text check (max_risk is null or max_risk in ('LOW','MEDIUM','HIGH','CRITICAL')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  can_redelegate boolean not null default false,
  approved_by uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','SUSPENDED','REVOKED','EXPIRED')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (max_amount is null or max_amount >= 0)
);

create table if not exists public.authorization_events (
  id uuid primary key,
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  role text not null,
  action text not null,
  object_type text not null,
  object_id text not null,
  case_id text,
  bank_key text,
  committee_id text,
  policy_version text not null,
  decision text not null check (decision in ('ALLOW','DENY')),
  reason text not null,
  matched_grant_id uuid,
  request_id text not null,
  context_json jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists authorization_role_assignments_user_idx
  on public.authorization_role_assignments(user_id, status, starts_at, ends_at);
create index if not exists authorization_grants_lookup_idx
  on public.authorization_grants(role, action, object_type, is_active);
create index if not exists authorization_delegations_to_user_idx
  on public.authorization_delegations(to_user_id, status, starts_at, ends_at);
create index if not exists authorization_events_actor_created_idx
  on public.authorization_events(actor_user_id, created_at desc);
create index if not exists authorization_events_object_idx
  on public.authorization_events(object_type, object_id, created_at desc);
create unique index if not exists authorization_events_request_role_uq
  on public.authorization_events(request_id, role);

-- Authorization audit events are immutable. Every re-evaluation appends a new event.
drop trigger if exists prevent_authorization_events_mutation on public.authorization_events;
create trigger prevent_authorization_events_mutation
before update or delete on public.authorization_events
for each row execute function public.prevent_algorithm_governance_mutation();

-- No implicit grants are seeded here. DENY remains the default until an explicit grant is provisioned.
commit;
