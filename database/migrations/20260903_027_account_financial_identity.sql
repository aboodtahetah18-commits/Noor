begin;

alter table public.accounts
  add column if not exists bank_code text,
  add column if not exists bank_name text,
  add column if not exists account_number text,
  add column if not exists iban text,
  add column if not exists card_last4 char(4);

alter table public.accounts
  drop constraint if exists accounts_card_last4_ck;
alter table public.accounts
  add constraint accounts_card_last4_ck
  check (card_last4 is null or card_last4 ~ '^[0-9]{4}$');

alter table public.accounts
  drop constraint if exists accounts_iban_sa_ck;
alter table public.accounts
  add constraint accounts_iban_sa_ck
  check (iban is null or iban ~ '^SA[0-9]{22}$');

create unique index if not exists accounts_user_iban_uq
  on public.accounts(user_id, iban)
  where iban is not null and is_active = true;

create index if not exists accounts_user_bank_code_idx
  on public.accounts(user_id, bank_code)
  where is_active = true;

create index if not exists accounts_user_card_last4_idx
  on public.accounts(user_id, card_last4)
  where card_last4 is not null and is_active = true;

commit;
