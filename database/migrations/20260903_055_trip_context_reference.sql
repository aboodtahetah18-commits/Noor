begin;

alter table public.goal_events
  add column if not exists trip_context_code text,
  add column if not exists trip_context_name text;

alter table public.goal_events drop constraint if exists goal_events_trip_context_code_chk;
alter table public.goal_events add constraint goal_events_trip_context_code_chk
  check (
    trip_context_code is null or trip_context_code in (
      'STANDARD','OCCASION','WORK','FAMILY','LONG_STAY','MEDICAL','OTHER'
    )
  );

alter table public.goal_events drop constraint if exists goal_events_trip_context_name_chk;
alter table public.goal_events add constraint goal_events_trip_context_name_chk
  check (
    trip_context_code <> 'OTHER'
    or length(trim(coalesce(trip_context_name,''))) > 0
  );

alter table public.goal_event_category_plans
  add column if not exists historical_reference_scope text;

alter table public.goal_event_category_plans drop constraint if exists goal_event_category_plans_reference_scope_chk;
alter table public.goal_event_category_plans add constraint goal_event_category_plans_reference_scope_chk
  check (
    historical_reference_scope is null
    or historical_reference_scope in ('CITY_CONTEXT','CITY_ONLY')
  );

create index if not exists goal_events_trip_context_history_idx
  on public.goal_events(user_id,destination_city,trip_context_code,status,benchmark_eligible,starts_at)
  where event_type='TRIP';

commit;
