-- Phase 29 — Weekly Analysis Job
create table if not exists public.weekly_analysis_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  cycle_id uuid not null references public.financial_cycles(id) on delete restrict,
  period_start date not null,
  idempotency_key text not null,
  status text not null check (status in ('RUNNING','SUCCESS','PARTIAL','FAILED')),
  attempt_count integer not null default 1 check (attempt_count > 0),
  summary jsonb,
  error_code text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index if not exists weekly_analysis_runs_cycle_period_idx
  on public.weekly_analysis_runs (user_id, cycle_id, period_start desc);
create index if not exists weekly_analysis_runs_status_idx
  on public.weekly_analysis_runs (status, started_at desc);
