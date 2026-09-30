begin;

create table if not exists public.budget_priority_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  normalized_label text not null,
  allocation_type text not null,
  chosen_priority text not null,
  confirmation_count integer not null default 1,
  last_confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budget_priority_preferences_label_chk check(length(trim(normalized_label))>0),
  constraint budget_priority_preferences_type_chk check(allocation_type in ('OBLIGATION','ESSENTIAL','SAVING','EMERGENCY','GOAL','FLEXIBLE')),
  constraint budget_priority_preferences_priority_chk check(chosen_priority in ('NECESSARY','IMPORTANT','OPTIONAL','ENTERTAINMENT')),
  constraint budget_priority_preferences_confirmation_chk check(confirmation_count>0),
  constraint budget_priority_preferences_uq unique(user_id,normalized_label,allocation_type)
);

create index if not exists budget_priority_preferences_type_idx
  on public.budget_priority_preferences(user_id,allocation_type,chosen_priority);

create trigger budget_priority_preferences_updated_at
  before update on public.budget_priority_preferences
  for each row execute function public.set_updated_at();

commit;
