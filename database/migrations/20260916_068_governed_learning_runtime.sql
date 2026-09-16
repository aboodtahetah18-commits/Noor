begin;

-- Extend the completed backtest outcome contract to match the governed runtime.
alter table public.algorithm_backtest_runs
  drop constraint if exists algorithm_backtest_runs_outcome_check;
alter table public.algorithm_backtest_runs
  add constraint algorithm_backtest_runs_outcome_check
  check (outcome in ('PASSED','FAILED','INCONCLUSIVE','INVALID'));

create table if not exists public.algorithm_learning_reviews (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete restrict,
  case_id uuid not null,
  decision_id uuid not null,
  bank_key text not null,
  learning_scope text not null check (learning_scope in (
    'EXCLUDED','USER_ONLY','BANK_LOCAL','CENTRAL_SHARED_CANDIDATE',
    'STRESS_ONLY','GOVERNANCE_PROPOSAL','VALIDATION_ONLY'
  )),
  learning_action text not null,
  cause text not null,
  lifecycle_json jsonb not null,
  route_json jsonb not null,
  status text not null,
  proposal_id uuid references public.algorithm_change_proposals(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.algorithm_backtest_requests (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete restrict,
  proposal_id uuid not null references public.algorithm_change_proposals(id) on delete restrict,
  review_id uuid not null references public.algorithm_learning_reviews(id) on delete restrict,
  baseline_version text not null,
  candidate_version text not null,
  status text not null check (status in ('PENDING','RUNNING','COMPLETED','FAILED','CANCELLED')),
  request_json jsonb not null,
  backtest_run_id uuid references public.algorithm_backtest_runs(id) on delete restrict,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (candidate_version <> baseline_version),
  check ((status = 'COMPLETED') = (backtest_run_id is not null and completed_at is not null))
);

create table if not exists public.algorithm_release_monitoring (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete restrict,
  release_id uuid not null references public.algorithm_releases(id) on delete restrict,
  metric_key text not null,
  observed_value double precision not null,
  expected_value double precision not null,
  normalized_residual double precision not null,
  previous_drift_score double precision not null,
  drift_score double precision not null,
  severity text not null check (severity in ('NORMAL','EARLY_WARNING','REVIEW_REQUIRED','ROLLBACK_REVIEW_CANDIDATE')),
  recommended_action text not null,
  evidence_json jsonb not null,
  observed_at timestamptz not null default now()
);

create table if not exists public.algorithm_rollback_reviews (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete restrict,
  release_id uuid not null references public.algorithm_releases(id) on delete restrict,
  monitoring_observation_id uuid not null references public.algorithm_release_monitoring(id) on delete restrict,
  from_version text not null,
  proposed_to_version text not null,
  status text not null check (status in ('PENDING_REVIEW','APPROVED','REJECTED')),
  rationale text,
  review_json jsonb not null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (monitoring_observation_id),
  check ((status = 'PENDING_REVIEW' and decided_at is null) or (status in ('APPROVED','REJECTED') and decided_at is not null))
);

create index if not exists algorithm_learning_reviews_case_idx
  on public.algorithm_learning_reviews(user_id, case_id, created_at desc);
create index if not exists algorithm_backtest_requests_status_idx
  on public.algorithm_backtest_requests(user_id, status, created_at);
create index if not exists algorithm_release_monitoring_release_idx
  on public.algorithm_release_monitoring(release_id, observed_at desc);
create index if not exists algorithm_rollback_reviews_release_idx
  on public.algorithm_rollback_reviews(release_id, created_at desc);

-- Append-only records. Mutable workflow rows are intentionally excluded:
-- backtest requests change from PENDING to COMPLETED, and rollback reviews receive a decision.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'algorithm_learning_reviews',
    'algorithm_release_monitoring'
  ] loop
    execute format('drop trigger if exists %I on public.%I', 'prevent_' || table_name || '_mutation', table_name);
    execute format(
      'create trigger %I before update or delete on public.%I for each row execute function public.prevent_algorithm_governance_mutation()',
      'prevent_' || table_name || '_mutation',
      table_name
    );
  end loop;
end;
$$;

-- A completed backtest request must point to a run for the same user, proposal and versions.
create or replace function public.guard_algorithm_backtest_request_update()
returns trigger
language plpgsql
as $$
declare
  run_user uuid;
  run_proposal uuid;
  run_baseline text;
  run_candidate text;
begin
  if old.status <> 'PENDING' then
    raise exception 'backtest request is already finalized';
  end if;

  if new.status = 'COMPLETED' then
    select user_id, proposal_id, baseline_version, candidate_version
      into run_user, run_proposal, run_baseline, run_candidate
    from public.algorithm_backtest_runs
    where id = new.backtest_run_id;

    if run_user is distinct from new.user_id
       or run_proposal is distinct from new.proposal_id
       or run_baseline is distinct from new.baseline_version
       or run_candidate is distinct from new.candidate_version then
      raise exception 'backtest request and run must match user, proposal and versions';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_algorithm_backtest_request_update on public.algorithm_backtest_requests;
create trigger guard_algorithm_backtest_request_update
before update on public.algorithm_backtest_requests
for each row execute function public.guard_algorithm_backtest_request_update();

-- Rollback review must always target the release's recorded previous_version.
create or replace function public.guard_algorithm_rollback_review()
returns trigger
language plpgsql
as $$
declare
  release_user uuid;
  release_version text;
  release_previous text;
begin
  select user_id, version, previous_version
    into release_user, release_version, release_previous
  from public.algorithm_releases
  where id = new.release_id;

  if release_user is distinct from new.user_id
     or release_version is distinct from new.from_version
     or release_previous is distinct from new.proposed_to_version then
    raise exception 'rollback review must match release and recorded previous version';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_algorithm_rollback_review_insert on public.algorithm_rollback_reviews;
create trigger guard_algorithm_rollback_review_insert
before insert on public.algorithm_rollback_reviews
for each row execute function public.guard_algorithm_rollback_review();

commit;
