begin;

alter table public.cycle_snapshots alter column safe_to_spend_final drop not null;
alter table public.cycle_snapshots drop constraint if exists cycle_snapshots_nonnegative_chk;
alter table public.cycle_snapshots add constraint cycle_snapshots_nonnegative_chk check(
  expected_income>=0 and actual_income>=0 and planned_expense>=0 and actual_expense>=0 and
  planned_saving>=0 and actual_saving>=0 and emergency_contribution>=0 and goal_contributions>=0 and
  (safe_to_spend_final is null or safe_to_spend_final>=0) and surplus_amount>=0 and deficit_amount>=0
);

alter table public.cycle_monthly_reviews
  add column if not exists closed_cycle_id uuid references public.financial_cycles(id) on delete restrict,
  add column if not exists next_cycle_id uuid references public.financial_cycles(id) on delete restrict,
  add column if not exists rollover_completed_at timestamptz;

alter table public.cycle_monthly_reviews drop constraint if exists cycle_monthly_reviews_status_chk;
alter table public.cycle_monthly_reviews add constraint cycle_monthly_reviews_status_chk check(status in ('DRAFT','REVIEWED','ROLLED_OVER'));

create unique index if not exists cycle_monthly_reviews_next_cycle_uq on public.cycle_monthly_reviews(user_id,next_cycle_id) where next_cycle_id is not null;
commit;
