begin;

create table if not exists public.alert_lifecycle_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  alert_key text not null,
  alert_kind text not null,
  source_id uuid,
  status text not null default 'NEW',
  snoozed_until timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint alert_lifecycle_states_status_chk check(status in ('NEW','SEEN','IN_PROGRESS','SNOOZED')),
  constraint alert_lifecycle_states_key_chk check(length(trim(alert_key))>0),
  unique(user_id,alert_key)
);

create index if not exists alert_lifecycle_states_user_status_idx on public.alert_lifecycle_states(user_id,status,updated_at desc);

create table if not exists public.alert_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  alert_key text not null,
  alert_kind text not null,
  source_id uuid,
  event_type text not null,
  status_before text,
  status_after text,
  alert_snapshot jsonb,
  metadata jsonb,
  created_at timestamptz not null default now(),
  constraint alert_lifecycle_events_type_chk check(event_type in ('SEEN','STARTED','SNOOZED','REOPENED'))
);

create index if not exists alert_lifecycle_events_user_created_idx on public.alert_lifecycle_events(user_id,created_at desc);
create index if not exists alert_lifecycle_events_alert_idx on public.alert_lifecycle_events(user_id,alert_key,created_at desc);

commit;
