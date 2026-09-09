begin;

create table if not exists public.cycle_surplus_routing_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  cycle_id uuid not null references public.financial_cycles(id) on delete cascade,
  destination_type text not null,
  goal_id uuid references public.financial_goals(id) on delete cascade,
  emergency_fund_id uuid references public.emergency_funds(id) on delete cascade,
  internal_funding_source_id uuid references public.internal_funding_sources(id) on delete cascade,
  investment_account_id uuid references public.accounts(id) on delete cascade,
  amount numeric(18,2) not null default 0 check (amount >= 0),
  note text,
  status text not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cycle_surplus_routing_destination_chk check (destination_type in ('EMERGENCY','GOAL','INTERNAL_RECOVERY','INVESTMENT','CYCLE_RESERVE')),
  constraint cycle_surplus_routing_status_chk check (status in ('DRAFT','APPLIED','CANCELLED'))
);

create index if not exists cycle_surplus_routing_cycle_idx
  on public.cycle_surplus_routing_drafts(user_id,cycle_id,status,created_at);

create unique index if not exists cycle_surplus_routing_goal_uq
  on public.cycle_surplus_routing_drafts(user_id,cycle_id,destination_type,goal_id)
  where destination_type='GOAL' and status='DRAFT';

create unique index if not exists cycle_surplus_routing_emergency_uq
  on public.cycle_surplus_routing_drafts(user_id,cycle_id,destination_type,emergency_fund_id)
  where destination_type='EMERGENCY' and status='DRAFT';

create unique index if not exists cycle_surplus_routing_recovery_uq
  on public.cycle_surplus_routing_drafts(user_id,cycle_id,destination_type,internal_funding_source_id)
  where destination_type='INTERNAL_RECOVERY' and status='DRAFT';

create unique index if not exists cycle_surplus_routing_investment_uq
  on public.cycle_surplus_routing_drafts(user_id,cycle_id,destination_type,investment_account_id)
  where destination_type='INVESTMENT' and status='DRAFT';

create unique index if not exists cycle_surplus_routing_reserve_uq
  on public.cycle_surplus_routing_drafts(user_id,cycle_id,destination_type)
  where destination_type='CYCLE_RESERVE' and status='DRAFT';

commit;
