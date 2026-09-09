begin;

create table public.saving_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  saving_allocation_id uuid not null references public.saving_allocations(id) on delete restrict,
  cycle_id uuid not null references public.financial_cycles(id) on delete restrict,
  from_account_id uuid not null references public.accounts(id) on delete restrict,
  to_account_id uuid not null references public.accounts(id) on delete restrict,
  amount numeric(18,2) not null,
  transaction_date date not null,
  description text,
  idempotency_key text not null,
  posted_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint saving_transfers_accounts_chk check(from_account_id <> to_account_id),
  constraint saving_transfers_amount_chk check(amount > 0),
  constraint saving_transfers_idempotency_uq unique(user_id,idempotency_key),
  constraint saving_transfers_owner_uq unique(user_id,id)
);

alter table public.transactions add column saving_transfer_id uuid;
alter table public.transactions add constraint transactions_saving_transfer_fk foreign key(saving_transfer_id) references public.saving_transfers(id) on delete restrict;

insert into public.saving_allocations(id,user_id,cycle_id,plan_version_id,planned_amount,allocated_amount,status)
select gen_random_uuid(),fp.user_id,fp.cycle_id,pv.id,coalesce(sum(ba.planned_amount) filter(where ba.allocation_type='SAVING'),0),coalesce(sum(ba.planned_amount) filter(where ba.allocation_type='SAVING'),0),'ALLOCATED'
from public.financial_plans fp
join public.plan_versions pv on pv.id=fp.current_version_id and pv.user_id=fp.user_id
left join public.budget_allocations ba on ba.plan_version_id=pv.id and ba.user_id=fp.user_id
where fp.status in ('ACTIVE_PLAN','REVISED')
  and not exists(select 1 from public.saving_allocations sa where sa.plan_version_id=pv.id)
group by fp.user_id,fp.cycle_id,pv.id;

create unique index saving_allocations_plan_version_uq on public.saving_allocations(plan_version_id);
create index saving_allocations_cycle_status_idx on public.saving_allocations(user_id,cycle_id,status);
create index saving_transfers_allocation_posted_idx on public.saving_transfers(user_id,saving_allocation_id,posted_at);
create unique index saving_transfer_out_entry_uq on public.transactions(saving_transfer_id) where saving_transfer_id is not null and transaction_type='SAVING_TRANSFER' and transaction_direction='OUT';
create unique index saving_transfer_in_entry_uq on public.transactions(saving_transfer_id) where saving_transfer_id is not null and transaction_type='SAVING_TRANSFER' and transaction_direction='IN';

create or replace view public.account_balances_v as
select
  a.id as account_id,
  a.user_id,
  coalesce(ob.amount,0)::numeric(18,2) as opening_balance,
  coalesce(sum(case
    when t.status='POSTED' and (
      t.transaction_type in ('INCOME','REFUND')
      or (t.transaction_type in ('TRANSFER','SAVING_TRANSFER') and t.transaction_direction='IN')
    ) then t.amount else 0 end),0)::numeric(18,2) as total_inflow,
  coalesce(sum(case
    when t.status='POSTED' and (
      t.transaction_type in ('EXPENSE','OBLIGATION_PAYMENT')
      or (t.transaction_type in ('TRANSFER','SAVING_TRANSFER') and t.transaction_direction='OUT')
    ) then t.amount else 0 end),0)::numeric(18,2) as total_outflow,
  (coalesce(ob.amount,0)
   + coalesce(sum(case when t.status='POSTED' and (t.transaction_type in ('INCOME','REFUND') or (t.transaction_type in ('TRANSFER','SAVING_TRANSFER') and t.transaction_direction='IN')) then t.amount else 0 end),0)
   - coalesce(sum(case when t.status='POSTED' and (t.transaction_type in ('EXPENSE','OBLIGATION_PAYMENT') or (t.transaction_type in ('TRANSFER','SAVING_TRANSFER') and t.transaction_direction='OUT')) then t.amount else 0 end),0)
  )::numeric(18,2) as balance
from public.accounts a
left join public.account_opening_balances ob on ob.account_id=a.id
left join public.transactions t on t.account_id=a.id
group by a.id,a.user_id,ob.amount;

commit;
