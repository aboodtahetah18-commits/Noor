begin;

create table if not exists public.goal_context_pattern_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  goal_id uuid not null references public.financial_goals(id) on delete cascade,
  reason_code text not null,
  custom_reason text,
  season_code text,
  custom_season_name text,
  category_ids jsonb not null default '[]'::jsonb,
  source_cycle_count integer not null default 0,
  source_category_count integer not null default 0,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goal_context_pattern_links_reason_chk check(length(trim(reason_code))>0),
  constraint goal_context_pattern_links_counts_chk check(source_cycle_count>=0 and source_category_count>=0),
  constraint goal_context_pattern_links_status_chk check(status in ('ACTIVE','ARCHIVED'))
);
create index if not exists goal_context_pattern_links_goal_idx on public.goal_context_pattern_links(user_id,goal_id,status);
create index if not exists goal_context_pattern_links_pattern_idx on public.goal_context_pattern_links(user_id,reason_code,season_code,status);
create unique index if not exists goal_context_pattern_links_active_uq on public.goal_context_pattern_links(user_id,goal_id,reason_code,coalesce(custom_reason,''),coalesce(season_code,''),coalesce(custom_season_name,'')) where status='ACTIVE';
commit;
