begin;

create table if not exists public.merchant_rule_aliases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  merchant_rule_id uuid not null references public.merchant_rules(id) on delete cascade,
  normalized_alias text not null,
  display_alias text,
  is_active boolean not null default true,
  confirmation_count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint merchant_rule_aliases_owner_alias_uq unique(user_id, normalized_alias),
  constraint merchant_rule_aliases_nonblank_chk check(length(trim(normalized_alias)) > 0)
);

create index if not exists merchant_rule_aliases_rule_idx
  on public.merchant_rule_aliases(user_id, merchant_rule_id, is_active, updated_at desc);

create index if not exists merchant_rule_aliases_lookup_idx
  on public.merchant_rule_aliases(user_id, is_active, normalized_alias);

drop trigger if exists merchant_rule_aliases_updated_at on public.merchant_rule_aliases;
create trigger merchant_rule_aliases_updated_at
before update on public.merchant_rule_aliases
for each row execute function public.set_updated_at();

commit;
