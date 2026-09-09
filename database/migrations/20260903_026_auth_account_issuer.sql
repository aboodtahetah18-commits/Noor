begin;

-- Better Auth 1.7 scopes account identity by issuer. Credential accounts use
-- the deterministic local namespace `local:credential`.
alter table auth.account
  add column if not exists issuer text;

-- Existing credential rows from earlier builds are safe to normalize to the
-- Better Auth local credential namespace.
update auth.account
set issuer = 'local:credential'
where issuer is null
  and provider_id = 'credential';

-- Any other legacy row must still receive a deterministic local namespace so
-- the column can become NOT NULL without discarding data.
update auth.account
set issuer = 'local:provider:' || provider_id
where issuer is null;

alter table auth.account
  alter column issuer set not null;

create unique index if not exists auth_account_issuer_account_uq
  on auth.account(issuer, account_id);

commit;
