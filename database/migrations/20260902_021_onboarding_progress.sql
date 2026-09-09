create table if not exists public.onboarding_progress (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_step integer not null default 1,
  obligations_reviewed boolean not null default false,
  controls_reviewed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint onboarding_progress_step_chk check(current_step between 1 and 6)
);

create trigger onboarding_progress_updated_at
before update on public.onboarding_progress
for each row execute function public.set_updated_at();
