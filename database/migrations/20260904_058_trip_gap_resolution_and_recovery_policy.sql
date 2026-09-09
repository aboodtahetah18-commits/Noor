begin;

alter table public.internal_funding_cases
  add column if not exists goal_event_id uuid references public.goal_events(id) on delete set null,
  add column if not exists recovery_cycle_count integer,
  add column if not exists recovery_strategy text not null default 'PROPORTIONAL_ACTUAL_USE';

alter table public.internal_funding_cases drop constraint if exists internal_funding_cases_recovery_cycle_count_chk;
alter table public.internal_funding_cases add constraint internal_funding_cases_recovery_cycle_count_chk
  check (recovery_cycle_count is null or recovery_cycle_count between 1 and 36);

alter table public.internal_funding_cases drop constraint if exists internal_funding_cases_recovery_strategy_chk;
alter table public.internal_funding_cases add constraint internal_funding_cases_recovery_strategy_chk
  check (recovery_strategy in ('PROPORTIONAL_ACTUAL_USE'));

create unique index if not exists internal_funding_cases_active_goal_event_uq
  on public.internal_funding_cases(user_id,goal_event_id)
  where goal_event_id is not null and status in ('PLANNING','ACTIVE','RECOVERY');

create table if not exists public.internal_funding_flexible_reliefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid not null references public.internal_funding_cases(id) on delete cascade,
  plan_id uuid not null references public.financial_plans(id) on delete restrict,
  revision_version_id uuid references public.plan_versions(id) on delete set null,
  category_id uuid not null references public.budget_categories(id) on delete restrict,
  previous_amount numeric(18,2) not null check(previous_amount >= 0),
  proposed_amount numeric(18,2) not null check(proposed_amount >= 0),
  relief_amount numeric(18,2) not null check(relief_amount > 0),
  status text not null default 'REVISION_PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint internal_funding_flexible_relief_amount_chk check(proposed_amount <= previous_amount and relief_amount = previous_amount - proposed_amount),
  constraint internal_funding_flexible_relief_status_chk check(status in ('REVISION_PENDING','ACTIVE','CANCELLED')),
  unique(case_id,category_id)
);

create index if not exists internal_funding_flexible_reliefs_case_idx
  on public.internal_funding_flexible_reliefs(user_id,case_id,status);

commit;
