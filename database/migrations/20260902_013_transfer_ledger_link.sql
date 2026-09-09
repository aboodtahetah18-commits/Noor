begin;
alter table public.transactions add column if not exists transfer_id uuid references public.transfers(id) on delete restrict;
alter table public.transactions drop constraint if exists transactions_transfer_fields_chk;
alter table public.transactions add constraint transactions_transfer_fields_chk check(
  transaction_type <> 'TRANSFER' or (account_id is not null and transaction_direction in ('IN','OUT') and transfer_id is not null)
);
create unique index if not exists transactions_transfer_direction_uq
  on public.transactions(user_id,transfer_id,transaction_direction) where transfer_id is not null;
create index if not exists transactions_transfer_id_idx on public.transactions(user_id,transfer_id) where transfer_id is not null;
commit;
