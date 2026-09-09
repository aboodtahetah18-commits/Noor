begin;
create or replace function public.enforce_refund_integrity() returns trigger language plpgsql as $$
declare original public.transactions%rowtype; refunded numeric(18,2);
begin
  if new.transaction_type <> 'REFUND' then return new; end if;
  if new.related_transaction_id is null then raise exception 'REFUND_ORIGINAL_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.related_transaction_id::text,0));
  select * into original from public.transactions where id=new.related_transaction_id and user_id=new.user_id for update;
  if not found or original.transaction_type <> 'EXPENSE' or original.status <> 'POSTED' then raise exception 'REFUND_ORIGINAL_INVALID'; end if;
  if new.category_id is distinct from original.category_id or new.cycle_id is distinct from original.cycle_id then raise exception 'REFUND_CONTEXT_MISMATCH'; end if;
  select coalesce(sum(amount),0) into refunded from public.transactions where user_id=new.user_id and transaction_type='REFUND' and status='POSTED' and related_transaction_id=original.id and id<>new.id;
  if refunded + new.amount > original.amount then raise exception 'REFUND_EXCEEDS_ORIGINAL'; end if;
  return new;
end $$;
drop trigger if exists transactions_refund_integrity_trg on public.transactions;
create trigger transactions_refund_integrity_trg before insert or update of status,amount,related_transaction_id on public.transactions for each row execute function public.enforce_refund_integrity();
create index if not exists transactions_refund_original_idx on public.transactions(user_id,related_transaction_id) where transaction_type='REFUND';
commit;
