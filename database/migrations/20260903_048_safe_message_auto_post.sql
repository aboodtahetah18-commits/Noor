begin;

alter table public.bank_statement_rows
  add column if not exists transaction_time time,
  add column if not exists source_fingerprint text,
  add column if not exists auto_post_eligible boolean not null default false,
  add column if not exists auto_post_reason text;

create index if not exists bank_statement_rows_message_fingerprint_idx
  on public.bank_statement_rows(user_id,source_fingerprint)
  where source_fingerprint is not null;

create index if not exists bank_statement_rows_message_time_idx
  on public.bank_statement_rows(user_id,transaction_date,transaction_time,normalized_merchant,amount)
  where transaction_time is not null;

commit;
