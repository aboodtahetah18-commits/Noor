begin;

create table if not exists public.internal_funding_recovery_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid not null references public.internal_funding_cases(id) on delete cascade,
  source_id uuid not null references public.internal_funding_sources(id) on delete restrict,
  category_id uuid not null references public.budget_categories(id) on delete restrict,
  installment_number integer not null,
  principal_amount numeric(18,2) not null check(principal_amount >= 0),
  growth_amount numeric(18,2) not null check(growth_amount >= 0),
  total_amount numeric(18,2) generated always as (principal_amount + growth_amount) stored,
  status text not null default 'PLANNED',
  cycle_id uuid references public.financial_cycles(id) on delete restrict,
  transfer_id uuid references public.transfers(id) on delete restrict,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint internal_funding_recovery_schedule_installment_chk check(installment_number between 1 and 36),
  constraint internal_funding_recovery_schedule_status_chk check(status in ('PLANNED','PAID','CANCELLED')),
  constraint internal_funding_recovery_schedule_paid_chk check(
    (status='PAID' and cycle_id is not null and transfer_id is not null and paid_at is not null)
    or status<>'PAID'
  ),
  unique(case_id,source_id,category_id,installment_number)
);

create index if not exists internal_funding_recovery_schedule_case_idx
  on public.internal_funding_recovery_schedule(user_id,case_id,status,installment_number);
create index if not exists internal_funding_recovery_schedule_source_idx
  on public.internal_funding_recovery_schedule(user_id,source_id,status,installment_number);

alter table public.internal_funding_repayments
  add column if not exists recovery_schedule_id uuid references public.internal_funding_recovery_schedule(id) on delete restrict,
  add column if not exists transfer_id uuid references public.transfers(id) on delete restrict,
  add column if not exists principal_component numeric(18,2) check(principal_component is null or principal_component >= 0),
  add column if not exists growth_component numeric(18,2) check(growth_component is null or growth_component >= 0),
  add column if not exists installment_number integer check(installment_number is null or installment_number between 1 and 36);

create unique index if not exists internal_funding_repayments_schedule_uq
  on public.internal_funding_repayments(recovery_schedule_id)
  where recovery_schedule_id is not null;

commit;
