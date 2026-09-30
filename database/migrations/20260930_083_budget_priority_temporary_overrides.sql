begin;

alter table public.budget_allocations
  add column if not exists priority_override text,
  add column if not exists priority_override_scope text;

alter table public.budget_allocations
  drop constraint if exists budget_allocations_priority_override_chk;
alter table public.budget_allocations
  add constraint budget_allocations_priority_override_chk
  check(priority_override is null or priority_override in ('NECESSARY','IMPORTANT','OPTIONAL','ENTERTAINMENT'));

alter table public.budget_allocations
  drop constraint if exists budget_allocations_priority_scope_chk;
alter table public.budget_allocations
  add constraint budget_allocations_priority_scope_chk
  check(priority_override_scope is null or priority_override_scope in ('THIS_CYCLE','PERSISTENT'));

commit;
