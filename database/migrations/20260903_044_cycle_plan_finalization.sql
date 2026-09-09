begin;

create table if not exists public.cycle_plan_finalizations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  cycle_id uuid not null references public.financial_cycles(id) on delete restrict,
  plan_id uuid not null references public.financial_plans(id) on delete restrict,
  plan_version_id uuid references public.plan_versions(id) on delete restrict,
  expected_income numeric(18,2) not null check (expected_income >= 0),
  original_demand numeric(18,2) not null check (original_demand >= 0),
  approved_reductions numeric(18,2) not null default 0 check (approved_reductions >= 0),
  approved_surplus_routing numeric(18,2) not null default 0 check (approved_surplus_routing >= 0),
  unassigned_surplus numeric(18,2) not null default 0 check (unassigned_surplus >= 0),
  snapshot jsonb not null,
  status text not null default 'APPROVED',
  approved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint cycle_plan_finalizations_status_chk check (status in ('APPROVED','SUPERSEDED'))
);

create index if not exists cycle_plan_finalizations_cycle_idx
  on public.cycle_plan_finalizations(user_id,cycle_id,approved_at desc);

create unique index if not exists cycle_plan_finalizations_current_uq
  on public.cycle_plan_finalizations(user_id,cycle_id)
  where status='APPROVED';

commit;
