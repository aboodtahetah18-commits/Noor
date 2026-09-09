begin;

insert into public.emergency_funds(id,user_id,name,status)
select gen_random_uuid(),p.id,'صندوق الطوارئ','NOT_CONFIGURED' from public.profiles p
where not exists(select 1 from public.emergency_funds ef where ef.user_id=p.id);

create table public.emergency_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  emergency_fund_id uuid not null references public.emergency_funds(id) on delete restrict,
  emergency_allocation_id uuid references public.emergency_allocations(id) on delete restrict,
  cycle_id uuid not null references public.financial_cycles(id) on delete restrict,
  movement_type text not null check(movement_type in ('CONTRIBUTION','WITHDRAWAL')),
  from_account_id uuid not null references public.accounts(id) on delete restrict,
  to_account_id uuid not null references public.accounts(id) on delete restrict,
  amount numeric(18,2) not null check(amount>0),
  transaction_date date not null,
  description text,
  reason text,
  emergency_type text,
  idempotency_key text not null,
  posted_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint emergency_movements_accounts_chk check(from_account_id<>to_account_id),
  constraint emergency_movements_withdrawal_reason_chk check(movement_type<>'WITHDRAWAL' or (length(trim(reason))>0 and length(trim(emergency_type))>0)),
  constraint emergency_movements_idempotency_uq unique(user_id,idempotency_key)
);

alter table public.transactions add column emergency_movement_id uuid;
alter table public.transactions add constraint transactions_emergency_movement_fk foreign key(emergency_movement_id) references public.emergency_movements(id) on delete restrict;

create unique index emergency_movement_out_entry_uq on public.transactions(emergency_movement_id) where emergency_movement_id is not null and transaction_direction='OUT';
create unique index emergency_movement_in_entry_uq on public.transactions(emergency_movement_id) where emergency_movement_id is not null and transaction_direction='IN';
create index emergency_movements_fund_posted_idx on public.emergency_movements(user_id,emergency_fund_id,posted_at);
create index emergency_allocations_cycle_status_idx on public.emergency_allocations(user_id,cycle_id,status);

create or replace view public.account_balances_v as
select a.id account_id,a.user_id,coalesce(ob.amount,0)::numeric(18,2) opening_balance,
coalesce(sum(case when t.status='POSTED' and (t.transaction_type in ('INCOME','REFUND') or (t.transaction_type in ('TRANSFER','SAVING_TRANSFER','EMERGENCY_CONTRIBUTION','EMERGENCY_WITHDRAWAL') and t.transaction_direction='IN')) then t.amount else 0 end),0)::numeric(18,2) total_inflow,
coalesce(sum(case when t.status='POSTED' and (t.transaction_type in ('EXPENSE','OBLIGATION_PAYMENT') or (t.transaction_type in ('TRANSFER','SAVING_TRANSFER','EMERGENCY_CONTRIBUTION','EMERGENCY_WITHDRAWAL') and t.transaction_direction='OUT')) then t.amount else 0 end),0)::numeric(18,2) total_outflow,
(coalesce(ob.amount,0)+coalesce(sum(case when t.status='POSTED' and (t.transaction_type in ('INCOME','REFUND') or (t.transaction_type in ('TRANSFER','SAVING_TRANSFER','EMERGENCY_CONTRIBUTION','EMERGENCY_WITHDRAWAL') and t.transaction_direction='IN')) then t.amount else 0 end),0)-coalesce(sum(case when t.status='POSTED' and (t.transaction_type in ('EXPENSE','OBLIGATION_PAYMENT') or (t.transaction_type in ('TRANSFER','SAVING_TRANSFER','EMERGENCY_CONTRIBUTION','EMERGENCY_WITHDRAWAL') and t.transaction_direction='OUT')) then t.amount else 0 end),0))::numeric(18,2) balance
from public.accounts a left join public.account_opening_balances ob on ob.account_id=a.id left join public.transactions t on t.account_id=a.id
group by a.id,a.user_id,ob.amount;
commit;
