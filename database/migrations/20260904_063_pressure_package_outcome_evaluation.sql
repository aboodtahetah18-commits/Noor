begin;

alter table public.financial_pressure_decision_packages
  add column if not exists target_window_start date,
  add column if not exists target_window_end date,
  add column if not exists outcome_status text not null default 'NOT_EVALUATED',
  add column if not exists outcome_class text,
  add column if not exists actual_committed_deficit_after numeric(18,2),
  add column if not exists actual_trip_gap_after numeric(18,2),
  add column if not exists actual_shifted_trip_gap numeric(18,2),
  add column if not exists committed_outcome_variance numeric(18,2),
  add column if not exists trip_gap_outcome_variance numeric(18,2),
  add column if not exists outcome_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists outcome_evaluated_at timestamptz;

alter table public.financial_pressure_decision_packages
  drop constraint if exists financial_pressure_decision_packages_outcome_status_check;
alter table public.financial_pressure_decision_packages
  add constraint financial_pressure_decision_packages_outcome_status_check
  check (outcome_status in ('NOT_EVALUATED','EVALUATED','UNAVAILABLE'));

alter table public.financial_pressure_decision_packages
  drop constraint if exists financial_pressure_decision_packages_outcome_class_check;
alter table public.financial_pressure_decision_packages
  add constraint financial_pressure_decision_packages_outcome_class_check
  check (outcome_class is null or outcome_class in ('RESOLVED','REDUCED','SHIFTED','UNCHANGED','WORSENED','MIXED'));

alter table public.financial_pressure_decision_package_events
  drop constraint if exists financial_pressure_decision_package_events_event_type_check;
alter table public.financial_pressure_decision_package_events
  add constraint financial_pressure_decision_package_events_event_type_check
  check (event_type in ('CREATED','APPROVED','CANCELLED','ITEM_COMPLETED','ITEM_VERIFIED','STATUS_CHANGED','COMPLETED','OUTCOME_EVALUATED'));

create index if not exists pressure_decision_packages_outcome_idx
  on public.financial_pressure_decision_packages(user_id,outcome_status,outcome_evaluated_at desc);

commit;
