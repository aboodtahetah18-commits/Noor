begin;

create table if not exists public.financial_pressure_decision_packages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_cycle_index integer not null check (target_cycle_index >= 0),
  target_cycle_label text not null,
  status text not null default 'DRAFT' check (status in ('DRAFT','APPROVED','IN_PROGRESS','COMPLETED','CANCELLED')),
  committed_deficit_before numeric(18,2) not null default 0 check (committed_deficit_before >= 0),
  committed_deficit_after numeric(18,2) not null default 0 check (committed_deficit_after >= 0),
  trip_gap_before numeric(18,2) not null default 0 check (trip_gap_before >= 0),
  trip_gap_after numeric(18,2) not null default 0 check (trip_gap_after >= 0),
  timing_shift_amount numeric(18,2) not null default 0 check (timing_shift_amount >= 0),
  is_full_resolution boolean not null default false,
  scenario_snapshot jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.financial_pressure_decision_package_items (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.financial_pressure_decision_packages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  scenario_id text not null,
  scenario_kind text not null check (scenario_kind in ('RESERVE_UNASSIGNED_GOAL_FUNDS','DEFER_TRIP_ONE_CYCLE','REDUCE_GOAL_CONTRIBUTION_ONE_CYCLE','REDIRECT_CURRENT_FLEXIBLE_HEADROOM')),
  title text not null,
  amount numeric(18,2) not null check (amount > 0),
  affected_goal_id uuid references public.financial_goals(id) on delete restrict,
  affected_event_id uuid references public.goal_events(id) on delete restrict,
  execution_path text not null,
  status text not null default 'PENDING' check (status in ('PENDING','READY','COMPLETED','CANCELLED')),
  scenario_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(package_id,scenario_id)
);

create table if not exists public.financial_pressure_decision_package_events (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.financial_pressure_decision_packages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('CREATED','APPROVED','CANCELLED','ITEM_COMPLETED','COMPLETED')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists pressure_decision_packages_user_status_idx
  on public.financial_pressure_decision_packages(user_id,status,created_at desc);
create index if not exists pressure_decision_package_items_user_idx
  on public.financial_pressure_decision_package_items(user_id,package_id,status);
create index if not exists pressure_decision_package_events_package_idx
  on public.financial_pressure_decision_package_events(package_id,created_at);

commit;
