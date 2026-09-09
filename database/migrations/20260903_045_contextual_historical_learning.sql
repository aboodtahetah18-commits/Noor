begin;

create table if not exists public.cycle_category_contexts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  cycle_id uuid not null references public.financial_cycles(id) on delete restrict,
  category_id uuid not null references public.budget_categories(id) on delete restrict,
  direction text not null,
  reason_codes jsonb not null default '[]'::jsonb,
  custom_reason text,
  persistence text not null default 'TEMPORARY',
  season_code text,
  custom_season_name text,
  use_for_next_plan boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cycle_category_contexts_uq unique(user_id,cycle_id,category_id),
  constraint cycle_category_contexts_direction_chk check(direction in ('LOWER','NORMAL','HIGHER')),
  constraint cycle_category_contexts_persistence_chk check(persistence in ('TEMPORARY','RECURRING','PERMANENT')),
  constraint cycle_category_contexts_season_chk check(season_code is null or season_code in ('RAMADAN','EID_FITR','EID_ADHA','SUMMER_HOLIDAY','BACK_TO_SCHOOL','TRAVEL_SEASON','WINTER','SUMMER','CUSTOM')),
  constraint cycle_category_contexts_custom_season_chk check(season_code <> 'CUSTOM' or length(trim(custom_season_name)) > 0)
);

create index if not exists cycle_category_contexts_lookup_idx on public.cycle_category_contexts(user_id,category_id,cycle_id);
create index if not exists cycle_category_contexts_season_idx on public.cycle_category_contexts(user_id,season_code) where season_code is not null;

drop trigger if exists cycle_category_contexts_updated_at on public.cycle_category_contexts;
create trigger cycle_category_contexts_updated_at before update on public.cycle_category_contexts for each row execute function public.set_updated_at();

commit;
