begin;
create extension if not exists pgcrypto;
create schema if not exists auth;

create table if not exists auth."user" (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  email_verified boolean not null default false,
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists auth_user_email_uq on auth."user"(lower(email));

create table if not exists auth.session (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth."user"(id) on delete cascade,
  token text not null,
  expires_at timestamptz not null,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists auth_session_token_uq on auth.session(token);
create index if not exists auth_session_user_idx on auth.session(user_id);

create table if not exists auth.account (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth."user"(id) on delete cascade,
  account_id text not null,
  provider_id text not null,
  access_token text,
  refresh_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  id_token text,
  password text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists auth_account_user_idx on auth.account(user_id);

create table if not exists auth.verification (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  value text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists auth_verification_identifier_idx on auth.verification(identifier);
commit;
