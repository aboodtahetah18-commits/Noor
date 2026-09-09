begin;
create table public.saving_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  cycle_id uuid not null references public.financial_cycles(id) on delete restrict,
  plan_version_id uuid not null references public.plan_versions(id) on delete restrict,
  planned_amount numeric(18,2) not null,
  allocated_amount numeric(18,2) not null default 0,
  status text not null default 'PLANNED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saving_allocations_amounts_chk check(planned_amount>=0 and allocated_amount>=0),
  constraint saving_allocations_status_chk check(status in ('PLANNED','ALLOCATED','PARTIALLY_TRANSFERRED','TRANSFERRED','CANCELLED'))
);

create table public.emergency_funds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  name text not null default 'صندوق الطوارئ',
  target_amount numeric(18,2),
  status text not null default 'NOT_CONFIGURED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint emergency_funds_name_chk check(length(trim(name))>0),
  constraint emergency_funds_target_chk check(target_amount is null or target_amount>0),
  constraint emergency_funds_status_chk check(status in ('NOT_CONFIGURED','BUILDING','FUNDED','DEPLETED')),
  constraint emergency_funds_user_uq unique(user_id),
  constraint emergency_funds_owner_uq unique(user_id,id)
);

create table public.emergency_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  cycle_id uuid not null references public.financial_cycles(id) on delete restrict,
  plan_version_id uuid not null references public.plan_versions(id) on delete restrict,
  emergency_fund_id uuid not null references public.emergency_funds(id) on delete restrict,
  planned_amount numeric(18,2) not null,
  allocated_amount numeric(18,2) not null default 0,
  status text not null default 'PLANNED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint emergency_allocations_amounts_chk check(planned_amount>=0 and allocated_amount>=0),
  constraint emergency_allocations_status_chk check(status in ('PLANNED','ALLOCATED','PARTIALLY_TRANSFERRED','TRANSFERRED','CANCELLED'))
);

create table public.financial_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  target_amount numeric(18,2) not null,
  target_date date,
  priority integer,
  status text not null default 'DRAFT',
  start_date date not null,
  achieved_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_goals_name_chk check(length(trim(name))>0),
  constraint financial_goals_target_chk check(target_amount>0),
  constraint financial_goals_date_chk check(target_date is null or target_date >= start_date),
  constraint financial_goals_priority_chk check(priority is null or priority>=1),
  constraint financial_goals_status_chk check(status in ('DRAFT','ACTIVE','FINANCIALLY_UNREALISTIC','PAUSED','ACHIEVED','CANCELLED')),
  constraint financial_goals_achieved_chk check(status <> 'ACHIEVED' or achieved_at is not null),
  constraint financial_goals_cancelled_chk check(status <> 'CANCELLED' or cancelled_at is not null),
  constraint financial_goals_owner_uq unique(user_id,id)
);

create table public.goal_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  goal_id uuid not null references public.financial_goals(id) on delete restrict,
  cycle_id uuid not null references public.financial_cycles(id) on delete restrict,
  plan_version_id uuid not null references public.plan_versions(id) on delete restrict,
  planned_amount numeric(18,2) not null,
  allocated_amount numeric(18,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goal_allocations_amounts_chk check(planned_amount>=0 and allocated_amount>=0),
  constraint goal_allocations_uq unique(goal_id,plan_version_id)
);

alter table public.transactions add constraint transactions_goal_fk foreign key(goal_id) references public.financial_goals(id) on delete restrict;
alter table public.transactions add constraint transactions_emergency_fk foreign key(emergency_fund_id) references public.emergency_funds(id) on delete restrict;

create table public.emergency_withdrawal_details (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null unique references public.transactions(id) on delete restrict,
  reason text not null,
  emergency_type text not null,
  created_at timestamptz not null default now(),
  constraint emergency_withdrawal_reason_chk check(length(trim(reason))>0),
  constraint emergency_withdrawal_type_chk check(length(trim(emergency_type))>0)
);

create trigger saving_allocations_updated_at before update on public.saving_allocations for each row execute function public.set_updated_at();
create trigger emergency_funds_updated_at before update on public.emergency_funds for each row execute function public.set_updated_at();
create trigger emergency_allocations_updated_at before update on public.emergency_allocations for each row execute function public.set_updated_at();
create trigger financial_goals_updated_at before update on public.financial_goals for each row execute function public.set_updated_at();
create trigger goal_allocations_updated_at before update on public.goal_allocations for each row execute function public.set_updated_at();
commit;
