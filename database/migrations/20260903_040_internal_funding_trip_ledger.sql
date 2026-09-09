begin;

alter table public.accounts
  add column if not exists financial_role text not null default 'OPERATING';

alter table public.accounts drop constraint if exists accounts_financial_role_chk;
alter table public.accounts add constraint accounts_financial_role_chk
  check (financial_role in ('OPERATING','EMERGENCY_FUND','INVESTMENT'));

create table if not exists public.internal_funding_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid references public.financial_goals(id) on delete set null,
  case_type text not null,
  title text not null,
  destination_city text,
  season_key text,
  status text not null default 'PLANNING',
  approved_amount numeric(18,2) not null check (approved_amount >= 0),
  growth_rate numeric(7,4) not null default 0.10 check (growth_rate >= 0 and growth_rate <= 0.10),
  starts_on date,
  ends_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint internal_funding_cases_type_chk check (case_type in ('TRIP','GOAL','URGENT','OTHER')),
  constraint internal_funding_cases_status_chk check (status in ('PLANNING','ACTIVE','RECOVERY','CLOSED','CANCELLED'))
);

create index if not exists internal_funding_cases_user_status_idx
  on public.internal_funding_cases(user_id,status,created_at desc);
create index if not exists internal_funding_cases_user_city_idx
  on public.internal_funding_cases(user_id,destination_city,created_at desc)
  where destination_city is not null;

create table if not exists public.internal_funding_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid not null references public.internal_funding_cases(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  source_type text not null,
  priority smallint not null,
  approved_amount numeric(18,2) not null check (approved_amount > 0),
  used_amount numeric(18,2) not null default 0 check (used_amount >= 0),
  returned_unused_amount numeric(18,2) not null default 0 check (returned_unused_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint internal_funding_sources_type_chk check (source_type in ('EMERGENCY','INVESTMENT')),
  constraint internal_funding_sources_used_chk check (used_amount <= approved_amount),
  unique(case_id,account_id)
);

create index if not exists internal_funding_sources_case_priority_idx
  on public.internal_funding_sources(user_id,case_id,priority);

create table if not exists public.internal_funding_expense_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid not null references public.internal_funding_cases(id) on delete cascade,
  source_id uuid not null references public.internal_funding_sources(id) on delete restrict,
  bank_statement_row_id uuid references public.bank_statement_rows(id) on delete set null,
  transaction_id uuid references public.transactions(id) on delete restrict,
  category_id uuid not null references public.budget_categories(id) on delete restrict,
  amount numeric(18,2) not null check (amount > 0),
  growth_contribution numeric(18,2) not null default 0 check (growth_contribution >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_id,transaction_id),
  unique(source_id,bank_statement_row_id)
);

create index if not exists internal_funding_allocations_case_idx
  on public.internal_funding_expense_allocations(user_id,case_id,created_at);
create index if not exists internal_funding_allocations_category_idx
  on public.internal_funding_expense_allocations(user_id,category_id,created_at);

create table if not exists public.internal_funding_repayments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid not null references public.internal_funding_cases(id) on delete cascade,
  source_id uuid not null references public.internal_funding_sources(id) on delete restrict,
  category_id uuid not null references public.budget_categories(id) on delete restrict,
  cycle_id uuid not null references public.financial_cycles(id) on delete restrict,
  amount numeric(18,2) not null check (amount > 0),
  paid_at timestamptz,
  status text not null default 'PLANNED',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint internal_funding_repayments_status_chk check (status in ('PLANNED','PAID','CANCELLED'))
);

create index if not exists internal_funding_repayments_due_idx
  on public.internal_funding_repayments(user_id,cycle_id,status);

alter table public.bank_statement_rows
  add column if not exists funding_case_id uuid references public.internal_funding_cases(id) on delete set null;

create index if not exists bank_statement_rows_funding_case_idx
  on public.bank_statement_rows(user_id,funding_case_id)
  where funding_case_id is not null;

commit;
