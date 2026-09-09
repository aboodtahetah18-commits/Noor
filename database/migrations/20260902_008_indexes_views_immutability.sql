begin;
create index transactions_user_date_idx on public.transactions(user_id,transaction_date desc);
create index transactions_user_cycle_date_idx on public.transactions(user_id,cycle_id,transaction_date desc);
create index transactions_user_account_date_idx on public.transactions(user_id,account_id,transaction_date desc);
create index transactions_user_category_date_idx on public.transactions(user_id,category_id,transaction_date desc);
create index transactions_cycle_status_idx on public.transactions(cycle_id,status);
create index transactions_user_type_date_idx on public.transactions(user_id,transaction_type,transaction_date desc);
create index obligations_user_status_due_idx on public.obligation_occurrences(user_id,status,due_date);
create index obligations_user_due_idx on public.obligation_occurrences(user_id,due_date);
create index obligations_template_due_idx on public.obligation_occurrences(template_id,due_date);
create index goals_user_status_idx on public.financial_goals(user_id,status);
create index goals_user_target_date_idx on public.financial_goals(user_id,target_date);
create index recommendations_user_status_priority_idx on public.recommendations(user_id,status,priority,created_at desc);
create index recommendations_user_cycle_status_idx on public.recommendations(user_id,cycle_id,status);
create index cycles_user_start_idx on public.financial_cycles(user_id,start_date desc);
create index cycles_user_status_idx on public.financial_cycles(user_id,status);
create index snapshots_user_closed_idx on public.cycle_snapshots(user_id,closed_at desc);

create or replace view public.account_balances_v as
select
  a.id as account_id,
  a.user_id,
  coalesce(ob.amount,0)::numeric(18,2) as opening_balance,
  coalesce(sum(case
    when t.status='POSTED' and (
      t.transaction_type in ('INCOME','REFUND')
      or (t.transaction_type='TRANSFER' and t.transaction_direction='IN')
    ) then t.amount else 0 end),0)::numeric(18,2) as total_inflow,
  coalesce(sum(case
    when t.status='POSTED' and (
      t.transaction_type in ('EXPENSE','OBLIGATION_PAYMENT')
      or (t.transaction_type='TRANSFER' and t.transaction_direction='OUT')
    ) then t.amount else 0 end),0)::numeric(18,2) as total_outflow,
  (coalesce(ob.amount,0)
   + coalesce(sum(case when t.status='POSTED' and (t.transaction_type in ('INCOME','REFUND') or (t.transaction_type='TRANSFER' and t.transaction_direction='IN') ) then t.amount else 0 end),0)
   - coalesce(sum(case when t.status='POSTED' and (t.transaction_type in ('EXPENSE','OBLIGATION_PAYMENT') or (t.transaction_type='TRANSFER' and t.transaction_direction='OUT')) then t.amount else 0 end),0)
  )::numeric(18,2) as balance
from public.accounts a
left join public.account_opening_balances ob on ob.account_id=a.id
left join public.transactions t on t.account_id=a.id
group by a.id,a.user_id,ob.amount;

create trigger cycle_snapshots_immutable before update or delete on public.cycle_snapshots for each row execute function public.prevent_update_delete();
create trigger cycle_category_snapshots_immutable before update or delete on public.cycle_category_snapshots for each row execute function public.prevent_update_delete();
create trigger state_transition_logs_immutable before update or delete on public.state_transition_logs for each row execute function public.prevent_update_delete();
commit;
