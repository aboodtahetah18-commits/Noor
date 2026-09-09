begin;

create table if not exists public.cycle_monthly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  cycle_id uuid not null references public.financial_cycles(id) on delete restrict,
  status text not null default 'DRAFT',
  bank_reconciliation_ready boolean not null default false,
  unresolved_bank_items integer not null default 0,
  overspent_categories integer not null default 0,
  unused_categories integer not null default 0,
  recurring_candidates integer not null default 0,
  next_cycle_recommendations jsonb not null default '[]'::jsonb,
  user_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cycle_monthly_reviews_status_chk check(status in ('DRAFT','REVIEWED')),
  constraint cycle_monthly_reviews_counts_chk check(unresolved_bank_items >= 0 and overspent_categories >= 0 and unused_categories >= 0 and recurring_candidates >= 0),
  constraint cycle_monthly_reviews_cycle_uq unique(user_id, cycle_id),
  constraint cycle_monthly_reviews_owner_uq unique(user_id,id)
);

create index if not exists cycle_monthly_reviews_user_status_idx on public.cycle_monthly_reviews(user_id,status,created_at desc);
create trigger cycle_monthly_reviews_updated_at before update on public.cycle_monthly_reviews for each row execute function public.set_updated_at();

commit;
