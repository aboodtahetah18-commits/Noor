begin;
alter table public.financial_goals add column if not exists opening_balance numeric(18,2) not null default 0;
do $$ begin
  alter table public.financial_goals add constraint financial_goals_opening_balance_chk check(opening_balance>=0);
exception when duplicate_object then null; end $$;
create index if not exists financial_goals_user_status_priority_idx on public.financial_goals(user_id,status,priority,created_at desc);
create index if not exists transactions_goal_posted_idx on public.transactions(user_id,goal_id,transaction_date desc) where transaction_type='GOAL_CONTRIBUTION' and status='POSTED';
do $$ begin
  alter table public.transactions add constraint transactions_goal_contribution_goal_chk check(transaction_type<>'GOAL_CONTRIBUTION' or goal_id is not null);
exception when duplicate_object then null; end $$;
comment on column public.financial_goals.opening_balance is 'Historical starting balance for the goal; non-negative and separate from later GOAL_CONTRIBUTION records.';
comment on table public.financial_goals is 'Financial goals. Cross-goal constrained allocation remains governed by PENDING-BR-005.';
commit;
