begin;

-- Phase 37: defense-in-depth database posture for private financial data.
-- Application authorization remains mandatory. These RLS policies are ready
-- for a least-privilege runtime role that sets app.current_user_id per request.
create or replace function public.app_current_user_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid
$$;

revoke all on all tables in schema public from public;
revoke all on all sequences in schema public from public;

-- Compatibility repair for Phase 29 staging databases created before user_id
-- was normalized to UUID. This is safe for valid Better Auth UUID identifiers.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'weekly_analysis_runs'
      and column_name = 'user_id'
      and data_type <> 'uuid'
  ) then
    alter table public.weekly_analysis_runs
      alter column user_id type uuid using user_id::uuid;
  end if;
end $$;

-- Direct-owner tables.
do $$
declare
  t text;
begin
  foreach t in array array[
    'accounts','account_opening_balances','financial_cycles','expected_incomes',
    'financial_plans','plan_versions','budget_categories','budget_allocations',
    'transactions','transfers','obligation_templates','obligation_occurrences',
    'saving_allocations','saving_transfers','emergency_funds','emergency_allocations',
    'emergency_movements','financial_goals','goal_allocations','recommendations',
    'cycle_snapshots','cycle_category_snapshots','cycle_reviews','state_transition_logs',
    'idempotency_records','onboarding_progress','weekly_analysis_runs'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists owner_isolation on public.%I', t);
    execute format(
      'create policy owner_isolation on public.%I for all using (user_id = public.app_current_user_id()) with check (user_id = public.app_current_user_id())',
      t
    );
  end loop;
end $$;

-- profiles uses id as its ownership key.
alter table public.profiles enable row level security;
drop policy if exists owner_isolation on public.profiles;
create policy owner_isolation on public.profiles
for all
using (id = public.app_current_user_id())
with check (id = public.app_current_user_id());

-- Child table without a direct user_id: inherit ownership from transaction.
alter table public.emergency_withdrawal_details enable row level security;
drop policy if exists owner_isolation on public.emergency_withdrawal_details;
create policy owner_isolation on public.emergency_withdrawal_details
for all
using (
  exists (
    select 1 from public.transactions t
    where t.id = transaction_id and t.user_id = public.app_current_user_id()
  )
)
with check (
  exists (
    select 1 from public.transactions t
    where t.id = transaction_id and t.user_id = public.app_current_user_id()
  )
);

comment on function public.app_current_user_id() is
'Phase 37 RLS context helper. A least-privilege runtime role must SET LOCAL app.current_user_id before DB access; DB owner remains reserved for migrations/operations.';

commit;
