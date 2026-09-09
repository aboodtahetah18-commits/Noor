begin;

alter table public.merchant_rules
  add column if not exists correction_count integer not null default 0,
  add column if not exists last_confirmed_at timestamptz,
  add column if not exists last_corrected_at timestamptz;

create table if not exists public.merchant_learning_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  merchant_rule_id uuid references public.merchant_rules(id) on delete cascade,
  bank_statement_row_id uuid references public.bank_statement_rows(id) on delete set null,
  normalized_merchant text,
  suggested_kind text,
  chosen_kind text not null,
  suggested_category_id uuid references public.budget_categories(id) on delete set null,
  chosen_category_id uuid references public.budget_categories(id) on delete set null,
  decision_type text not null,
  created_at timestamptz not null default now(),
  constraint merchant_learning_events_decision_chk check(decision_type in ('CONFIRMED','CORRECTED','NEW_RULE')),
  constraint merchant_learning_events_kind_chk check(chosen_kind in ('EXPENSE','INCOME','TRANSFER','REFUND','FEE','UNKNOWN'))
);

create index if not exists merchant_learning_events_rule_idx
  on public.merchant_learning_events(user_id,merchant_rule_id,created_at desc);
create index if not exists merchant_learning_events_merchant_idx
  on public.merchant_learning_events(user_id,normalized_merchant,created_at desc);

commit;
