begin;

create table if not exists public.goal_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid not null references public.financial_goals(id) on delete cascade,
  event_type text not null default 'TRIP',
  title text not null,
  destination_city text,
  starts_at timestamptz,
  ends_at timestamptz,
  planned_amount numeric(18,2),
  status text not null default 'PLANNED',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goal_events_type_chk check(event_type in ('TRIP','EVENT','PURCHASE','OTHER')),
  constraint goal_events_status_chk check(status in ('PLANNED','ACTIVE','CLOSED','CANCELLED')),
  constraint goal_events_dates_chk check(ends_at is null or starts_at is null or ends_at >= starts_at),
  constraint goal_events_amount_chk check(planned_amount is null or planned_amount >= 0),
  constraint goal_events_title_chk check(length(trim(title))>0)
);
create index if not exists goal_events_goal_idx on public.goal_events(user_id,goal_id,status,starts_at);
create index if not exists goal_events_period_idx on public.goal_events(user_id,starts_at,ends_at) where status in ('PLANNED','ACTIVE','CLOSED');

create table if not exists public.goal_event_transaction_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid not null references public.financial_goals(id) on delete cascade,
  goal_event_id uuid not null references public.goal_events(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete cascade,
  bank_statement_row_id uuid references public.bank_statement_rows(id) on delete cascade,
  category_id uuid references public.budget_categories(id) on delete restrict,
  amount numeric(18,2) not null check(amount > 0),
  link_source text not null,
  confidence numeric(5,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goal_event_tx_link_source_chk check(link_source in ('USER_CONFIRMED','MESSAGE_CONFIRMED','STATEMENT_MATCHED','DATE_RANGE_SUGGESTED')),
  constraint goal_event_tx_link_conf_chk check(confidence is null or (confidence >= 0 and confidence <= 100)),
  constraint goal_event_tx_link_target_chk check(transaction_id is not null or bank_statement_row_id is not null)
);
create unique index if not exists goal_event_transaction_uq on public.goal_event_transaction_links(user_id,transaction_id) where transaction_id is not null;
create unique index if not exists goal_event_bank_row_uq on public.goal_event_transaction_links(user_id,bank_statement_row_id) where bank_statement_row_id is not null;
create index if not exists goal_event_transaction_event_idx on public.goal_event_transaction_links(user_id,goal_event_id,created_at);

alter table public.bank_statement_rows add column if not exists prior_message_row_id uuid references public.bank_statement_rows(id) on delete set null,
  add column if not exists reconciliation_source text;
alter table public.bank_statement_rows drop constraint if exists bank_statement_rows_reconciliation_source_chk;
alter table public.bank_statement_rows add constraint bank_statement_rows_reconciliation_source_chk check(reconciliation_source is null or reconciliation_source in ('PRIOR_MESSAGE','BANK_STATEMENT','USER'));
create index if not exists bank_statement_rows_prior_message_idx on public.bank_statement_rows(user_id,prior_message_row_id) where prior_message_row_id is not null;
commit;
