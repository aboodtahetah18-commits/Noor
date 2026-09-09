begin;

create table if not exists public.goal_event_funding_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid not null references public.financial_goals(id) on delete cascade,
  goal_event_id uuid not null references public.goal_events(id) on delete cascade,
  reserved_amount numeric(18,2) not null default 0 check(reserved_amount >= 0),
  status text not null default 'ACTIVE',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goal_event_funding_reservations_status_chk check(status in ('ACTIVE','RELEASED')),
  constraint goal_event_funding_reservations_uq unique(user_id,goal_event_id)
);

create index if not exists goal_event_funding_reservations_goal_idx
  on public.goal_event_funding_reservations(user_id,goal_id,status,goal_event_id);

commit;
