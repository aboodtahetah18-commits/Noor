begin;

alter table public.bank_statement_rows
  add column if not exists recurring_candidate boolean not null default false,
  add column if not exists recurring_interval_days integer,
  add column if not exists recurring_score numeric(5,2) not null default 0;

alter table public.bank_statement_rows
  drop constraint if exists bank_statement_rows_recurring_score_chk;
alter table public.bank_statement_rows
  add constraint bank_statement_rows_recurring_score_chk
  check(recurring_score >= 0 and recurring_score <= 100);

create index if not exists bank_statement_rows_recurring_idx
  on public.bank_statement_rows(user_id, recurring_candidate, normalized_merchant)
  where recurring_candidate = true;

commit;
