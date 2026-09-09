begin;

alter table public.merchant_rules
  add column if not exists approval_mode text not null default 'REVIEW',
  add column if not exists priority integer not null default 100,
  add column if not exists matched_account_id uuid references public.accounts(id) on delete restrict,
  add column if not exists notes text;

alter table public.merchant_rules drop constraint if exists merchant_rules_approval_mode_chk;
alter table public.merchant_rules add constraint merchant_rules_approval_mode_chk
  check(approval_mode in ('AUTO','REVIEW','CONFIRM'));

alter table public.merchant_rules drop constraint if exists merchant_rules_priority_chk;
alter table public.merchant_rules add constraint merchant_rules_priority_chk
  check(priority between 1 and 999);

alter table public.bank_statement_rows
  add column if not exists decision_reason text;

create index if not exists merchant_rules_priority_idx
  on public.merchant_rules(user_id,is_active,priority desc,updated_at desc);

commit;
