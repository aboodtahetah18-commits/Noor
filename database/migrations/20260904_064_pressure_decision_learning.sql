begin;

create table if not exists public.financial_pressure_decision_learning_observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  package_id uuid not null references public.financial_pressure_decision_packages(id) on delete cascade,
  package_item_id uuid not null references public.financial_pressure_decision_package_items(id) on delete cascade,
  scenario_kind text not null,
  package_outcome_class text not null,
  attribution_mode text not null default 'CO_OCCURRENCE',
  expected_item_amount numeric(18,2) not null default 0,
  expected_committed_relief numeric(18,2) not null default 0,
  expected_trip_gap_relief numeric(18,2) not null default 0,
  observed_package_committed_relief numeric(18,2) not null default 0,
  observed_package_trip_gap_relief numeric(18,2) not null default 0,
  observed_shifted_trip_gap numeric(18,2) not null default 0,
  target_cycle_index integer not null,
  target_window_start date,
  target_window_end date,
  context_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint pressure_learning_attribution_chk check(attribution_mode in ('CO_OCCURRENCE')),
  unique(package_id,package_item_id)
);

create index if not exists pressure_learning_user_kind_idx
  on public.financial_pressure_decision_learning_observations(user_id,scenario_kind,created_at desc);
create index if not exists pressure_learning_user_outcome_idx
  on public.financial_pressure_decision_learning_observations(user_id,package_outcome_class,created_at desc);

commit;
