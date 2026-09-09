begin;

alter table public.bank_statement_rows
  add column if not exists merchant_rule_id uuid references public.merchant_rules(id) on delete set null,
  add column if not exists matched_account_id uuid references public.accounts(id) on delete restrict,
  add column if not exists decision_source text not null default 'HEURISTIC',
  add column if not exists duplicate_score numeric(5,2) not null default 0;

alter table public.bank_statement_rows
  drop constraint if exists bank_statement_rows_decision_source_chk;
alter table public.bank_statement_rows
  add constraint bank_statement_rows_decision_source_chk
  check(decision_source in ('HEURISTIC','MERCHANT_RULE','INTERNAL_TRANSFER','DUPLICATE_MATCH','USER'));

alter table public.bank_statement_rows
  drop constraint if exists bank_statement_rows_duplicate_score_chk;
alter table public.bank_statement_rows
  add constraint bank_statement_rows_duplicate_score_chk
  check(duplicate_score >= 0 and duplicate_score <= 100);

create index if not exists bank_statement_rows_rule_idx
  on public.bank_statement_rows(user_id, merchant_rule_id)
  where merchant_rule_id is not null;

create index if not exists bank_statement_rows_matched_account_idx
  on public.bank_statement_rows(user_id, matched_account_id)
  where matched_account_id is not null;

commit;
