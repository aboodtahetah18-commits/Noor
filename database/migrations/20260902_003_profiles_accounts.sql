begin;
create table public.profiles (
  id uuid primary key references auth."user"(id) on delete cascade,
  display_name text,
  base_currency char(3) not null default 'SAR',
  timezone text not null default 'Asia/Riyadh',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_currency_chk check (base_currency ~ '^[A-Z]{3}$')
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  account_type text not null,
  currency char(3) not null default 'SAR',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_name_chk check (length(trim(name)) > 0),
  constraint accounts_type_chk check (account_type in ('BANK','SAVINGS','CASH','OTHER')),
  constraint accounts_currency_chk check (currency ~ '^[A-Z]{3}$')
);
create unique index accounts_active_name_uq on public.accounts(user_id, lower(name)) where is_active;

create table public.account_opening_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  account_id uuid not null references public.accounts(id) on delete restrict,
  amount numeric(18,2) not null,
  effective_date date not null,
  created_at timestamptz not null default now(),
  constraint account_opening_balances_amount_chk check (amount >= 0),
  constraint account_opening_balances_account_uq unique(account_id),
  constraint account_opening_balances_owner_uq unique(user_id, account_id)
);

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger accounts_updated_at before update on public.accounts for each row execute function public.set_updated_at();
commit;
