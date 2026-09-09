begin;

-- V1 final ledger contract for API-C-052:
-- account_id is the source account, while the goal itself is the protected destination domain balance.
update public.transactions
set transaction_direction='OUT'
where transaction_type='GOAL_CONTRIBUTION'
  and transaction_direction is null;

do $$ begin
  alter table public.transactions add constraint transactions_goal_contribution_direction_chk
  check(transaction_type<>'GOAL_CONTRIBUTION' or (account_id is not null and transaction_direction='OUT'));
exception when duplicate_object then null; end $$;

create index if not exists transactions_goal_contribution_account_posted_idx
  on public.transactions(user_id,account_id,transaction_date desc)
  where transaction_type='GOAL_CONTRIBUTION' and status='POSTED' and transaction_direction='OUT';

create or replace view public.account_balances_v as
select a.id account_id,a.user_id,coalesce(ob.amount,0)::numeric(18,2) opening_balance,
coalesce(sum(case when t.status='POSTED' and (t.transaction_type in ('INCOME','REFUND') or (t.transaction_type in ('TRANSFER','SAVING_TRANSFER','EMERGENCY_CONTRIBUTION','EMERGENCY_WITHDRAWAL') and t.transaction_direction='IN')) then t.amount else 0 end),0)::numeric(18,2) total_inflow,
coalesce(sum(case when t.status='POSTED' and (t.transaction_type in ('EXPENSE','OBLIGATION_PAYMENT') or (t.transaction_type in ('TRANSFER','SAVING_TRANSFER','EMERGENCY_CONTRIBUTION','EMERGENCY_WITHDRAWAL','GOAL_CONTRIBUTION') and t.transaction_direction='OUT')) then t.amount else 0 end),0)::numeric(18,2) total_outflow,
(coalesce(ob.amount,0)
 +coalesce(sum(case when t.status='POSTED' and (t.transaction_type in ('INCOME','REFUND') or (t.transaction_type in ('TRANSFER','SAVING_TRANSFER','EMERGENCY_CONTRIBUTION','EMERGENCY_WITHDRAWAL') and t.transaction_direction='IN')) then t.amount else 0 end),0)
 -coalesce(sum(case when t.status='POSTED' and (t.transaction_type in ('EXPENSE','OBLIGATION_PAYMENT') or (t.transaction_type in ('TRANSFER','SAVING_TRANSFER','EMERGENCY_CONTRIBUTION','EMERGENCY_WITHDRAWAL','GOAL_CONTRIBUTION') and t.transaction_direction='OUT')) then t.amount else 0 end),0))::numeric(18,2) balance
from public.accounts a
left join public.account_opening_balances ob on ob.account_id=a.id
left join public.transactions t on t.account_id=a.id
group by a.id,a.user_id,ob.amount;

comment on constraint transactions_goal_contribution_direction_chk on public.transactions is
'V1 API-C-052: account_id is the source account; a posted goal contribution is an OUT ledger effect on that account.';

commit;
