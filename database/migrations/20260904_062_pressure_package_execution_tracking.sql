begin;

alter table public.financial_pressure_decision_package_items
  add column if not exists verification_status text not null default 'NOT_CHECKED',
  add column if not exists verification_evidence jsonb not null default '{}'::jsonb,
  add column if not exists last_checked_at timestamptz,
  add column if not exists verified_at timestamptz;

alter table public.financial_pressure_decision_package_items
  drop constraint if exists financial_pressure_decision_package_items_verification_status_check;
alter table public.financial_pressure_decision_package_items
  add constraint financial_pressure_decision_package_items_verification_status_check
  check (verification_status in ('NOT_CHECKED','WAITING','VERIFIED'));

alter table public.financial_pressure_decision_packages
  add column if not exists completed_at timestamptz;

alter table public.financial_pressure_decision_package_events
  drop constraint if exists financial_pressure_decision_package_events_event_type_check;
alter table public.financial_pressure_decision_package_events
  add constraint financial_pressure_decision_package_events_event_type_check
  check (event_type in ('CREATED','APPROVED','CANCELLED','ITEM_COMPLETED','ITEM_VERIFIED','STATUS_CHANGED','COMPLETED'));

create index if not exists pressure_decision_package_items_verification_idx
  on public.financial_pressure_decision_package_items(user_id,package_id,verification_status,status);

commit;
