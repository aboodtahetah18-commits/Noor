begin;

alter table public.merchant_rule_aliases
  add column if not exists city text,
  add column if not exists branch_label text;

create table if not exists public.bank_decision_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  source_type text not null,
  source_id uuid,
  merchant_rule_id uuid references public.merchant_rules(id) on delete set null,
  bank_statement_row_id uuid references public.bank_statement_rows(id) on delete set null,
  import_id uuid references public.bank_statement_imports(id) on delete set null,
  affected_count integer not null default 1,
  affected_amount numeric(18,2),
  before_state jsonb,
  after_state jsonb,
  impact_summary jsonb,
  reason text,
  created_at timestamptz not null default now(),
  constraint bank_decision_events_event_chk check(event_type in (
    'ROW_CONFIRM','BATCH_MERCHANT_APPLY','AUTO_POST','MERCHANT_RULE_UPDATE','MERCHANT_ALIAS_ADD','MERCHANT_ALIAS_TOGGLE','IMPORT_APPROVE'
  )),
  constraint bank_decision_events_source_chk check(source_type in ('USER','SYSTEM')),
  constraint bank_decision_events_count_chk check(affected_count >= 1)
);

create index if not exists bank_decision_events_user_created_idx
  on public.bank_decision_events(user_id,created_at desc);
create index if not exists bank_decision_events_merchant_idx
  on public.bank_decision_events(user_id,merchant_rule_id,created_at desc)
  where merchant_rule_id is not null;
create index if not exists bank_decision_events_import_idx
  on public.bank_decision_events(user_id,import_id,created_at desc)
  where import_id is not null;

commit;
