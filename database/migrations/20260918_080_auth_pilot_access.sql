begin;

create table if not exists auth.pilot_access (
  email text primary key,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','DISABLED')),
  invited_at timestamptz not null default now(),
  registered_at timestamptz,
  verified_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists auth_pilot_access_status_idx
  on auth.pilot_access(status);

commit;
