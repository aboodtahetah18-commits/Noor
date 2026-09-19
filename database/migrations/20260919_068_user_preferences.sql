create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  matching_tolerance_days integer not null default 2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_matching_tolerance_days_ck
    check (matching_tolerance_days between 2 and 3)
);

insert into public.user_preferences(user_id)
select id from public.profiles
on conflict(user_id) do nothing;
