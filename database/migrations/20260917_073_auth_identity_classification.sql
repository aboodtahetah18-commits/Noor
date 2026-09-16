begin;

-- Preserve the personal-finance single-owner model while allowing additional
-- authenticated governance actors and service identities.
alter table auth."user"
  add column if not exists identity_type text not null default 'FINANCIAL_OWNER';

alter table auth."user"
  drop constraint if exists auth_user_identity_type_chk;
alter table auth."user"
  add constraint auth_user_identity_type_chk
  check (identity_type in ('FINANCIAL_OWNER','GOVERNANCE_ACTOR','SYSTEM_SERVICE'));

-- The legacy guard prohibited every second auth identity. Replace it with a
-- database-level singleton constraint that applies only to the financial owner.
drop trigger if exists enforce_single_owner_before_insert on auth."user";
drop function if exists auth.enforce_single_owner();

create unique index if not exists auth_single_financial_owner_uq
  on auth."user" (identity_type)
  where identity_type = 'FINANCIAL_OWNER';

-- Identity class is an issuance-time security property; role/grant changes do
-- not silently transform a governance actor into the financial owner.
create or replace function auth.prevent_identity_type_change()
returns trigger
language plpgsql
as $$
begin
  if new.identity_type is distinct from old.identity_type then
    raise exception 'auth identity type is immutable'
      using errcode = '23514', constraint = 'auth_identity_type_immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_auth_identity_type_change on auth."user";
create trigger prevent_auth_identity_type_change
before update of identity_type on auth."user"
for each row execute function auth.prevent_identity_type_change();

commit;
