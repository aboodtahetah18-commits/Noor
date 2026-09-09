begin;
alter table public.transactions
  add column if not exists expected_income_id uuid references public.expected_incomes(id) on delete restrict,
  add column if not exists income_source_name text,
  add column if not exists income_kind text,
  add column if not exists income_is_partial boolean;
alter table public.transactions
  add constraint transactions_income_metadata_chk check(
    transaction_type <> 'INCOME' or (
      account_id is not null and
      income_source_name is not null and length(trim(income_source_name)) > 0 and
      income_kind in ('SALARY','ADDITIONAL_INCOME','BONUS','OTHER') and
      income_is_partial is not null
    )
  );
create index if not exists transactions_user_expected_income_idx
  on public.transactions(user_id,expected_income_id)
  where expected_income_id is not null;
commit;
