begin;

create table if not exists auth.user_profile (
  user_id uuid primary key references auth."user"(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  phone text not null,
  city text not null,
  city_normalized text not null,
  home_latitude double precision,
  home_longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists auth_user_profile_city_idx
  on auth.user_profile(city_normalized);

commit;
