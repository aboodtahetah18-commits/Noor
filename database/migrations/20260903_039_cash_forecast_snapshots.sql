begin;
create table if not exists public.cash_forecast_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  cycle_id uuid not null references public.financial_cycles(id) on delete restrict,
  as_of_date date not null,
  next_income_date date not null,
  remaining_days integer not null,
  current_liquidity numeric(18,2) not null,
  upcoming_obligations numeric(18,2) not null,
  required_buffer numeric(18,2) not null,
  safe_until_income numeric(18,2) not null,
  projected_end_balance numeric(18,2) not null,
  protection_deficit numeric(18,2) not null default 0,
  risk text not null,
  engine_version text not null,
  created_at timestamptz not null default now(),
  constraint cash_forecast_risk_chk check(risk in ('HEALTHY','WATCH','RISK')),
  constraint cash_forecast_remaining_days_chk check(remaining_days>=0)
);
create index if not exists cash_forecast_snapshots_cycle_idx on public.cash_forecast_snapshots(user_id,cycle_id,as_of_date desc);
commit;
