begin;

create table if not exists public.goal_cycle_commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid not null references public.financial_goals(id) on delete cascade,
  cycle_id uuid not null references public.financial_cycles(id) on delete restrict,
  required_amount numeric(18,2) not null check (required_amount >= 0),
  approved_amount numeric(18,2) not null check (approved_amount >= 0),
  status text not null default 'APPROVED',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goal_cycle_commitments_status_chk check (status in ('APPROVED','FUNDED','SKIPPED','CANCELLED')),
  constraint goal_cycle_commitments_owner_uq unique(user_id,goal_id,cycle_id)
);

create index if not exists goal_cycle_commitments_cycle_idx
  on public.goal_cycle_commitments(user_id,cycle_id,status);
create index if not exists goal_cycle_commitments_goal_idx
  on public.goal_cycle_commitments(user_id,goal_id,created_at desc);

commit;
