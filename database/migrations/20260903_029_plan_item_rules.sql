begin;
create table if not exists public.plan_item_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  category_id uuid not null references public.budget_categories(id) on delete cascade,
  recurrence_kind text not null default 'MONTHLY',
  interval_cycles integer not null default 1,
  start_cycle_date date not null,
  note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plan_item_rules_kind_chk check(recurrence_kind in ('MONTHLY','EVERY_N_CYCLES','ONE_TIME','SEASONAL')),
  constraint plan_item_rules_interval_chk check(interval_cycles between 1 and 24),
  constraint plan_item_rules_owner_uq unique(user_id,category_id)
);
create index if not exists plan_item_rules_due_idx on public.plan_item_rules(user_id,is_active,start_cycle_date,interval_cycles);
drop trigger if exists plan_item_rules_updated_at on public.plan_item_rules;
create trigger plan_item_rules_updated_at before update on public.plan_item_rules for each row execute function public.set_updated_at();
commit;
