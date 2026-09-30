begin;

alter table public.budget_allocations
  add column if not exists priority_override_reason text,
  add column if not exists priority_override_note text;

alter table public.budget_allocations
  drop constraint if exists budget_allocations_priority_reason_chk;

alter table public.budget_allocations
  add constraint budget_allocations_priority_reason_chk
  check(
    priority_override_reason is null
    or priority_override_reason in ('TRAVEL','OCCASION','HEALTH','MAINTENANCE','UNUSUAL_MONTH','OTHER')
  );

alter table public.budget_allocations
  drop constraint if exists budget_allocations_priority_note_chk;

alter table public.budget_allocations
  add constraint budget_allocations_priority_note_chk
  check(priority_override_note is null or length(priority_override_note)<=240);

commit;
