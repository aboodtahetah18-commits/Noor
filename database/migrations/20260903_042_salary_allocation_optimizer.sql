begin;

alter table public.budget_categories
  add column if not exists planning_priority_class text;

update public.budget_categories
set planning_priority_class = case
  when category_group in ('OBLIGATION','ESSENTIAL') or is_essential then 'BASIC'
  when category_group in ('GOAL','SAVING','EMERGENCY') then 'IMPORTANT'
  when category_group = 'FLEXIBLE' then 'FLEXIBLE'
  else 'IMPORTANT'
end
where planning_priority_class is null;

alter table public.budget_categories
  add constraint budget_categories_planning_priority_chk
  check (planning_priority_class is null or planning_priority_class in ('BASIC','IMPORTANT','FLEXIBLE','DEFERRED'));

create table if not exists public.cycle_budget_optimization_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  cycle_id uuid not null references public.financial_cycles(id) on delete cascade,
  category_id uuid not null references public.budget_categories(id) on delete cascade,
  reduction_amount numeric(18,2) not null default 0 check (reduction_amount >= 0),
  note text,
  status text not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cycle_budget_optimization_adjustments_status_chk check (status in ('DRAFT','APPLIED','CANCELLED')),
  constraint cycle_budget_optimization_adjustments_uq unique(user_id,cycle_id,category_id)
);

create index if not exists cycle_budget_optimization_adjustments_cycle_idx
  on public.cycle_budget_optimization_adjustments(user_id,cycle_id,status);

commit;
