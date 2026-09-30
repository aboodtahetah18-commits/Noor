begin;

create table if not exists public.budget_temporary_amount_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  normalized_label text not null,
  context_reason text not null,
  confirmation_count integer not null default 1,
  average_position numeric(8,6) not null,
  last_confirmed_amount numeric(18,2),
  last_confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budget_temporary_amount_preferences_label_chk check(length(trim(normalized_label))>0),
  constraint budget_temporary_amount_preferences_reason_chk check(context_reason in ('TRAVEL','OCCASION','HEALTH','MAINTENANCE','UNUSUAL_MONTH','OTHER')),
  constraint budget_temporary_amount_preferences_count_chk check(confirmation_count>0),
  constraint budget_temporary_amount_preferences_position_chk check(average_position>=0 and average_position<=1),
  constraint budget_temporary_amount_preferences_uq unique(user_id,normalized_label,context_reason)
);

create index if not exists budget_temporary_amount_preferences_lookup_idx
  on public.budget_temporary_amount_preferences(user_id,context_reason,confirmation_count desc);

create trigger budget_temporary_amount_preferences_updated_at
  before update on public.budget_temporary_amount_preferences
  for each row execute function public.set_updated_at();

commit;
