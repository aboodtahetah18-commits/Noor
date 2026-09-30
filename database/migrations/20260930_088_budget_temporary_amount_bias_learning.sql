begin;

alter table public.budget_temporary_amount_preferences
  add column if not exists under_count integer not null default 0,
  add column if not exists over_count integer not null default 0,
  add column if not exists match_count integer not null default 0,
  add column if not exists average_signed_bias numeric(12,6),
  add column if not exists bias_adjustment numeric(8,6) not null default 0;

alter table public.budget_temporary_amount_preferences
  drop constraint if exists budget_temporary_amount_preferences_bias_counts_chk;
alter table public.budget_temporary_amount_preferences
  add constraint budget_temporary_amount_preferences_bias_counts_chk
  check(under_count>=0 and over_count>=0 and match_count>=0);

alter table public.budget_temporary_amount_preferences
  drop constraint if exists budget_temporary_amount_preferences_bias_adjustment_chk;
alter table public.budget_temporary_amount_preferences
  add constraint budget_temporary_amount_preferences_bias_adjustment_chk
  check(bias_adjustment>=-0.25 and bias_adjustment<=0.25);

commit;
