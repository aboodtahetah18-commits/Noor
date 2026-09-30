begin;

alter table public.budget_allocations
  add column if not exists temporary_applied_extra_amount numeric(18,2),
  add column if not exists temporary_baseline_amount numeric(18,2);

alter table public.budget_allocations
  drop constraint if exists budget_allocations_temporary_applied_extra_chk;
alter table public.budget_allocations
  add constraint budget_allocations_temporary_applied_extra_chk
  check(temporary_applied_extra_amount is null or temporary_applied_extra_amount > 0);

alter table public.budget_allocations
  drop constraint if exists budget_allocations_temporary_baseline_chk;
alter table public.budget_allocations
  add constraint budget_allocations_temporary_baseline_chk
  check(temporary_baseline_amount is null or temporary_baseline_amount >= 0);

create table if not exists public.budget_temporary_amount_outcomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  cycle_id uuid not null references public.financial_cycles(id) on delete cascade,
  allocation_id uuid not null references public.budget_allocations(id) on delete cascade,
  category_id uuid not null references public.budget_categories(id) on delete cascade,
  normalized_label text not null,
  context_reason text not null,
  predicted_extra_amount numeric(18,2) not null,
  baseline_amount numeric(18,2) not null,
  actual_category_spend numeric(18,2) not null,
  actual_extra_amount numeric(18,2) not null,
  absolute_error numeric(18,2) not null,
  error_ratio numeric(12,6),
  direction text not null,
  evaluated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint budget_temporary_amount_outcomes_reason_chk check(context_reason in ('TRAVEL','OCCASION','HEALTH','MAINTENANCE','UNUSUAL_MONTH','OTHER')),
  constraint budget_temporary_amount_outcomes_direction_chk check(direction in ('UNDER','OVER','MATCH')),
  constraint budget_temporary_amount_outcomes_amount_chk check(predicted_extra_amount>0 and baseline_amount>=0 and actual_category_spend>=0 and actual_extra_amount>=0 and absolute_error>=0),
  constraint budget_temporary_amount_outcomes_uq unique(user_id,allocation_id)
);

create index if not exists budget_temporary_amount_outcomes_lookup_idx
  on public.budget_temporary_amount_outcomes(user_id,normalized_label,context_reason,evaluated_at desc);

alter table public.budget_temporary_amount_preferences
  add column if not exists outcome_count integer not null default 0,
  add column if not exists average_error_ratio numeric(12,6),
  add column if not exists accuracy_weight numeric(8,6) not null default 1;

alter table public.budget_temporary_amount_preferences
  drop constraint if exists budget_temporary_amount_preferences_outcome_count_chk;
alter table public.budget_temporary_amount_preferences
  add constraint budget_temporary_amount_preferences_outcome_count_chk check(outcome_count>=0);

alter table public.budget_temporary_amount_preferences
  drop constraint if exists budget_temporary_amount_preferences_accuracy_chk;
alter table public.budget_temporary_amount_preferences
  add constraint budget_temporary_amount_preferences_accuracy_chk check(accuracy_weight>=0.25 and accuracy_weight<=1);

commit;
