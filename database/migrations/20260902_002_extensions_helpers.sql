begin;
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prevent_update_delete()
returns trigger language plpgsql as $$
begin
  raise exception 'immutable_record';
end;
$$;
commit;
