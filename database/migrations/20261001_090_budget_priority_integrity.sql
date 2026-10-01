begin;

-- Normalize legacy rows before enforcing cross-column invariants.
-- Do not invent financial amounts: ambiguous temporary amounts are cleared instead.
update public.budget_allocations
set priority_override_scope='PERSISTENT'
where priority_override is not null
  and priority_override_scope is null
  and priority_override_reason is null
  and priority_override_note is null
  and temporary_extra_amount is null;

update public.budget_allocations
set priority_override_scope='THIS_CYCLE'
where priority_override_scope is null
  and (priority_override_reason is not null or priority_override_note is not null);

update public.budget_allocations
set priority_override_reason=null,
    priority_override_note=null,
    temporary_extra_amount=null
where priority_override_scope='PERSISTENT'
  and (
    priority_override_reason is not null
    or priority_override_note is not null
    or temporary_extra_amount is not null
  );

update public.budget_allocations
set temporary_extra_amount=null
where temporary_extra_amount is not null
  and (
    priority_override_scope is distinct from 'THIS_CYCLE'
    or priority_override_reason is null
  );

update public.budget_allocations
set temporary_applied_extra_amount=null,
    temporary_baseline_amount=null
where (temporary_applied_extra_amount is null) <> (temporary_baseline_amount is null);

alter table public.budget_allocations
  drop constraint if exists budget_allocations_priority_override_scope_consistency_chk;
alter table public.budget_allocations
  add constraint budget_allocations_priority_override_scope_consistency_chk
  check (
    (priority_override is null or priority_override_scope is not null)
    and (priority_override_scope != 'PERSISTENT' or priority_override is not null)
  );

alter table public.budget_allocations
  drop constraint if exists budget_allocations_temporary_context_consistency_chk;
alter table public.budget_allocations
  add constraint budget_allocations_temporary_context_consistency_chk
  check (
    (priority_override_reason is null or priority_override_scope='THIS_CYCLE')
    and (priority_override_note is null or priority_override_scope='THIS_CYCLE')
    and (
      temporary_extra_amount is null
      or (
        priority_override_scope='THIS_CYCLE'
        and priority_override_reason is not null
      )
    )
  );

alter table public.budget_allocations
  drop constraint if exists budget_allocations_temporary_applied_pair_chk;
alter table public.budget_allocations
  add constraint budget_allocations_temporary_applied_pair_chk
  check (
    (temporary_applied_extra_amount is null and temporary_baseline_amount is null)
    or
    (temporary_applied_extra_amount is not null and temporary_baseline_amount is not null)
  );

commit;
