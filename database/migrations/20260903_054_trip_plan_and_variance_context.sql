begin;

create table if not exists public.goal_event_category_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid not null references public.financial_goals(id) on delete cascade,
  goal_event_id uuid not null references public.goal_events(id) on delete cascade,
  category_id uuid not null references public.budget_categories(id) on delete restrict,
  planned_amount numeric(18,2) not null check(planned_amount >= 0),
  plan_source text not null default 'MANUAL',
  historical_reference_amount numeric(18,2),
  source_benchmark_trip_count integer not null default 0 check(source_benchmark_trip_count >= 0),
  variance_reason text,
  variance_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goal_event_category_plans_source_chk check(plan_source in ('MANUAL','HISTORICAL_REFERENCE')),
  constraint goal_event_category_plans_reference_chk check(historical_reference_amount is null or historical_reference_amount >= 0),
  unique(user_id,goal_event_id,category_id)
);

create index if not exists goal_event_category_plans_event_idx
  on public.goal_event_category_plans(user_id,goal_event_id,category_id);

commit;
