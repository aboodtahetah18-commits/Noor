begin;

alter table public.bank_statement_imports
  add column if not exists approved_transaction_count integer not null default 0,
  add column if not exists ignored_row_count integer not null default 0,
  add column if not exists reconciliation_system_balance numeric(18,2),
  add column if not exists reconciliation_difference numeric(18,2),
  add column if not exists reconciliation_status text;

alter table public.bank_statement_imports
  drop constraint if exists bank_statement_imports_reconciliation_status_chk;
alter table public.bank_statement_imports
  add constraint bank_statement_imports_reconciliation_status_chk
  check(reconciliation_status is null or reconciliation_status in ('MATCHED','DIFFERENCE','NOT_PROVIDED'));

alter table public.bank_statement_rows
  add column if not exists final_transaction_id uuid references public.transactions(id) on delete restrict,
  add column if not exists approval_action text;

alter table public.bank_statement_rows
  drop constraint if exists bank_statement_rows_approval_action_chk;
alter table public.bank_statement_rows
  add constraint bank_statement_rows_approval_action_chk
  check(approval_action is null or approval_action in ('CREATED','MATCHED_EXISTING','INTERNAL_TRANSFER','IGNORED'));

create index if not exists bank_statement_rows_final_transaction_idx
  on public.bank_statement_rows(user_id,final_transaction_id)
  where final_transaction_id is not null;

commit;
