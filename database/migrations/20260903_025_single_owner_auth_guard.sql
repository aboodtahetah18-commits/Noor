begin;

-- V1 is intentionally single-owner. The API route prevents public sign-up
-- after the first user exists; this trigger is the database-level race guard.
create or replace function auth.enforce_single_owner()
returns trigger
language plpgsql
security definer
set search_path = auth, pg_temp
as $$
begin
  perform pg_advisory_xact_lock(hashtext('personal-finance-advisor:single-owner'));

  if exists (select 1 from auth."user") then
    raise exception 'single owner already exists'
      using errcode = '23505', constraint = 'auth_single_owner_guard';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_single_owner_before_insert on auth."user";
create trigger enforce_single_owner_before_insert
before insert on auth."user"
for each row execute function auth.enforce_single_owner();

commit;
