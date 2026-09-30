begin;

alter table public.budget_priority_preferences
  add column if not exists correction_count integer not null default 0,
  add column if not exists last_corrected_at timestamptz;

alter table public.budget_priority_preferences
  drop constraint if exists budget_priority_preferences_correction_chk;

alter table public.budget_priority_preferences
  add constraint budget_priority_preferences_correction_chk
  check(correction_count>=0 and correction_count<=confirmation_count);

commit;
