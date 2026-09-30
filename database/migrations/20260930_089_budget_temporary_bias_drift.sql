begin;

alter table public.budget_temporary_amount_preferences
  add column if not exists recent_outcome_count integer not null default 0,
  add column if not exists recent_under_count integer not null default 0,
  add column if not exists recent_over_count integer not null default 0,
  add column if not exists recent_match_count integer not null default 0,
  add column if not exists recent_signed_bias numeric(12,6),
  add column if not exists bias_stability text not null default 'INSUFFICIENT';

alter table public.budget_temporary_amount_preferences
  drop constraint if exists budget_temporary_amount_preferences_recent_counts_chk;
alter table public.budget_temporary_amount_preferences
  add constraint budget_temporary_amount_preferences_recent_counts_chk
  check(
    recent_outcome_count>=0 and recent_under_count>=0 and recent_over_count>=0 and recent_match_count>=0
    and recent_under_count+recent_over_count+recent_match_count<=recent_outcome_count
  );

alter table public.budget_temporary_amount_preferences
  drop constraint if exists budget_temporary_amount_preferences_bias_stability_chk;
alter table public.budget_temporary_amount_preferences
  add constraint budget_temporary_amount_preferences_bias_stability_chk
  check(bias_stability in ('INSUFFICIENT','STABLE_UNDER','STABLE_OVER','MIXED','SHIFTING'));

commit;
