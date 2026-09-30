begin;

alter table public.budget_allocations
  add column if not exists temporary_extra_amount numeric(18,2);

alter table public.budget_allocations
  drop constraint if exists budget_allocations_temporary_extra_chk;

alter table public.budget_allocations
  add constraint budget_allocations_temporary_extra_chk
  check(temporary_extra_amount is null or temporary_extra_amount > 0);

commit;
