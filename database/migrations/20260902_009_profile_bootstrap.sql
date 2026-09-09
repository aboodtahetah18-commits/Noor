begin;
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, nullif(new.name,''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth."user";
create trigger on_auth_user_created
after insert on auth."user"
for each row execute function public.handle_new_auth_user();
commit;
