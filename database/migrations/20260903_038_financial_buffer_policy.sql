begin;

create table if not exists public.financial_buffer_policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  mode text not null,
  fixed_amount numeric(18,2) not null default 0,
  percent_bps integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_buffer_policy_mode_chk check(mode in ('FIXED','PERCENT_INCOME','MAX_FIXED_PERCENT')),
  constraint financial_buffer_policy_fixed_chk check(fixed_amount >= 0),
  constraint financial_buffer_policy_percent_chk check(percent_bps between 0 and 10000),
  constraint financial_buffer_policy_value_chk check(
    (mode='FIXED' and fixed_amount > 0) or
    (mode='PERCENT_INCOME' and percent_bps > 0) or
    (mode='MAX_FIXED_PERCENT' and fixed_amount > 0 and percent_bps > 0)
  )
);

create unique index if not exists financial_buffer_policy_active_uq
  on public.financial_buffer_policies(user_id) where is_active=true;
create index if not exists financial_buffer_policy_user_idx
  on public.financial_buffer_policies(user_id,updated_at desc);

drop trigger if exists financial_buffer_policies_updated_at on public.financial_buffer_policies;
create trigger financial_buffer_policies_updated_at before update on public.financial_buffer_policies
for each row execute function public.set_updated_at();

commit;
