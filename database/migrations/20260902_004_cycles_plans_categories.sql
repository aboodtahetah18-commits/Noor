begin;
create table public.financial_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  start_date date not null,
  expected_next_income_date date not null,
  status text not null default 'DRAFT',
  activated_at timestamptz,
  closing_started_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_cycles_name_chk check(length(trim(name))>0),
  constraint financial_cycles_dates_chk check(expected_next_income_date >= start_date),
  constraint financial_cycles_status_chk check(status in ('DRAFT','ACTIVE','CLOSING','CLOSED'))
);
create unique index financial_cycles_operational_uq on public.financial_cycles(user_id) where status in ('ACTIVE','CLOSING');

create table public.expected_incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  cycle_id uuid not null references public.financial_cycles(id) on delete restrict,
  source_name text not null,
  expected_amount numeric(18,2) not null,
  expected_date date not null,
  income_kind text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expected_incomes_source_chk check(length(trim(source_name))>0),
  constraint expected_incomes_amount_chk check(expected_amount > 0),
  constraint expected_incomes_kind_chk check(income_kind in ('SALARY','ADDITIONAL_INCOME','BONUS','OTHER')),
  constraint expected_incomes_owner_uq unique(user_id,id)
);

create table public.financial_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  cycle_id uuid not null references public.financial_cycles(id) on delete restrict,
  current_version_id uuid,
  status text not null default 'PLAN_DRAFT',
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  closed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint financial_plans_cycle_uq unique(cycle_id),
  constraint financial_plans_status_chk check(status in ('PLAN_DRAFT','ACTIVE_PLAN','REVISED','CLOSED_PLAN')),
  constraint financial_plans_owner_uq unique(user_id,id)
);

create table public.plan_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  plan_id uuid not null references public.financial_plans(id) on delete restrict,
  version_number integer not null,
  revision_reason text,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  constraint plan_versions_version_chk check(version_number > 0),
  constraint plan_versions_number_uq unique(plan_id,version_number),
  constraint plan_versions_owner_uq unique(user_id,id)
);
create unique index plan_versions_current_uq on public.plan_versions(plan_id) where is_current;
alter table public.financial_plans add constraint financial_plans_current_version_fk foreign key(current_version_id) references public.plan_versions(id) on delete restrict;

create table public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  category_group text not null,
  expense_nature_default text,
  is_essential boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budget_categories_name_chk check(length(trim(name))>0),
  constraint budget_categories_group_chk check(category_group in ('OBLIGATION','ESSENTIAL','SAVING','EMERGENCY','GOAL','FLEXIBLE')),
  constraint budget_categories_nature_chk check(expense_nature_default is null or expense_nature_default in ('NECESSARY','IMPORTANT','OPTIONAL','ENTERTAINMENT')),
  constraint budget_categories_owner_uq unique(user_id,id)
);
create unique index budget_categories_active_name_uq on public.budget_categories(user_id,lower(name)) where is_active;

create table public.budget_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  plan_version_id uuid not null references public.plan_versions(id) on delete restrict,
  category_id uuid not null references public.budget_categories(id) on delete restrict,
  planned_amount numeric(18,2) not null,
  allocation_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budget_allocations_amount_chk check(planned_amount >= 0),
  constraint budget_allocations_type_chk check(allocation_type in ('OBLIGATION','ESSENTIAL','SAVING','EMERGENCY','GOAL','FLEXIBLE')),
  constraint budget_allocations_uq unique(plan_version_id,category_id)
);

create trigger financial_cycles_updated_at before update on public.financial_cycles for each row execute function public.set_updated_at();
create trigger expected_incomes_updated_at before update on public.expected_incomes for each row execute function public.set_updated_at();
create trigger financial_plans_updated_at before update on public.financial_plans for each row execute function public.set_updated_at();
create trigger budget_categories_updated_at before update on public.budget_categories for each row execute function public.set_updated_at();
create trigger budget_allocations_updated_at before update on public.budget_allocations for each row execute function public.set_updated_at();
commit;
