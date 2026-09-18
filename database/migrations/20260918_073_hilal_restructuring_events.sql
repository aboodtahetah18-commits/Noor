begin;

create table if not exists public.internal_funding_restructuring_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid not null references public.internal_funding_cases(id) on delete cascade,
  category_id uuid references public.budget_categories(id) on delete set null,
  event_type text not null,
  root_cause text,
  previous_plan jsonb,
  proposed_plan jsonb,
  evidence jsonb not null default '{}'::jsonb,
  reason text,
  created_at timestamptz not null default now(),
  constraint internal_funding_restructuring_events_type_chk
    check (event_type in ('REQUESTED','APPROVED','APPLIED','REJECTED','CANCELLED'))
);

create index if not exists internal_funding_restructuring_events_case_idx
  on public.internal_funding_restructuring_events(user_id,case_id,created_at desc);

create index if not exists internal_funding_restructuring_events_category_idx
  on public.internal_funding_restructuring_events(user_id,category_id,created_at desc)
  where category_id is not null;

create unique index if not exists internal_funding_restructuring_events_applied_plan_uq
  on public.internal_funding_restructuring_events(user_id,case_id,(proposed_plan->>'version_key'))
  where event_type='APPLIED' and proposed_plan ? 'version_key';

commit;
