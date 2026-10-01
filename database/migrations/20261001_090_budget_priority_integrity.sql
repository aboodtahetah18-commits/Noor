begin;

alter table public.budget_allocations drop constraint if exists budget_allocations_priority_override_scope_consistency_chk;
alter table public.budget_allocations add constraint budget_allocations_priority_override_scope_consistency_chk check ((priority_override is null or priority_override_scope is not null) and (priority_override_scope != 'PERSISTENT' or priority_override is not null));

alter table public.budget_allocations drop constraint if exists budget_allocations_temporary_context_consistency_chk;
alter table public.budget_allocations add constraint budget_allocations_temporary_context_consistency_chk check ((priority_override_reason is null or priority_override_scope='THIS_CYCLE') and (priority_override_note is null or priority_override_scope='THIS_CYCLE') and (temporary_extra_amount is null or (priority_override_scope='THIS_CYCLE' and priority_override_reason is not null)));

alter table public.budget_allocations drop constraint if exists budget_allocations_temporary_applied_pair_chk;
alter table public.budget_allocations add constraint budget_allocations_temporary_applied_pair_chk check ((temporary_applied_extra_amount is null and temporary_baseline_amount is null) or (temporary_applied_extra_amount is not null and temporary_baseline_amount is not null));

commit;
