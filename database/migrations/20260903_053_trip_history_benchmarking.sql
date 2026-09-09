begin;
alter table public.goal_events add column if not exists benchmark_eligible boolean not null default true,
  add column if not exists benchmark_note text;
create index if not exists goal_events_trip_history_idx on public.goal_events(user_id,event_type,destination_city,status,benchmark_eligible,starts_at) where event_type='TRIP';
commit;
