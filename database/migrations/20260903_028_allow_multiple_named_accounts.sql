begin;

-- Account names are user-facing labels, not identifiers. Multiple banks may have the
-- same label (e.g. "الحساب الرئيسي"), and one bank may also contain several accounts.
drop index if exists public.accounts_active_name_uq;

-- IBAN remains the strong identity key whenever it exists.
create unique index if not exists accounts_user_iban_uq
  on public.accounts(user_id, iban)
  where iban is not null and is_active = true;

commit;
