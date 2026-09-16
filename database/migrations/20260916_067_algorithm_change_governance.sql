begin;

create table if not exists public.algorithm_change_proposals (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete restrict,
  review_item_id text not null,
  dimension_key text not null,
  target text not null check (target in ('POLICY','WEIGHTS','THRESHOLDS','ENGINE_LOGIC','MEASUREMENT_CONTRACT')),
  current_version text not null,
  candidate_version text not null,
  title text not null,
  rationale text not null,
  spec_json jsonb not null,
  acceptance_criteria_json jsonb not null,
  rollback_plan_json jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, review_item_id, candidate_version)
);

create table if not exists public.algorithm_backtest_runs (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete restrict,
  proposal_id uuid not null references public.algorithm_change_proposals(id) on delete restrict,
  baseline_version text not null,
  candidate_version text not null,
  dataset_starts_at date not null,
  dataset_ends_at date not null,
  outcome text not null check (outcome in ('PASSED','FAILED','INCONCLUSIVE')),
  metrics_json jsonb not null,
  evidence_json jsonb not null,
  notes text,
  completed_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (dataset_ends_at >= dataset_starts_at)
);

create table if not exists public.algorithm_change_decisions (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete restrict,
  proposal_id uuid not null references public.algorithm_change_proposals(id) on delete restrict,
  backtest_run_id uuid references public.algorithm_backtest_runs(id) on delete restrict,
  decision text not null check (decision in ('APPROVED','REJECTED','CHANGES_REQUESTED')),
  rationale text not null,
  decided_at timestamptz not null default now()
);

create table if not exists public.algorithm_releases (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete restrict,
  proposal_id uuid not null references public.algorithm_change_proposals(id) on delete restrict,
  approval_decision_id uuid not null references public.algorithm_change_decisions(id) on delete restrict,
  target text not null check (target in ('POLICY','WEIGHTS','THRESHOLDS','ENGINE_LOGIC','MEASUREMENT_CONTRACT')),
  version text not null,
  previous_version text not null,
  artifact_json jsonb not null,
  released_at timestamptz not null default now(),
  unique (user_id, target, version)
);

create table if not exists public.algorithm_rollbacks (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete restrict,
  release_id uuid not null references public.algorithm_releases(id) on delete restrict,
  from_version text not null,
  to_version text not null,
  reason text not null,
  created_at timestamptz not null default now(),
  unique (release_id)
);

create index if not exists algorithm_change_proposals_user_created_idx
  on public.algorithm_change_proposals(user_id, created_at desc);
create index if not exists algorithm_backtest_runs_proposal_idx
  on public.algorithm_backtest_runs(proposal_id, completed_at desc);
create index if not exists algorithm_change_decisions_proposal_idx
  on public.algorithm_change_decisions(proposal_id, decided_at desc);
create index if not exists algorithm_releases_target_idx
  on public.algorithm_releases(user_id, target, released_at desc);

create or replace function public.prevent_algorithm_governance_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'algorithm governance ledger rows are immutable; append a new event instead';
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'algorithm_change_proposals',
    'algorithm_backtest_runs',
    'algorithm_change_decisions',
    'algorithm_releases',
    'algorithm_rollbacks'
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

-- A release is valid only when it references an APPROVED decision backed by a PASSED backtest
-- for the same proposal. The trigger enforces this at the database boundary.
create or replace function public.guard_algorithm_release()
returns trigger
language plpgsql
as $$
declare
  decision_value text;
  decision_proposal uuid;
  run_outcome text;
  run_proposal uuid;
begin
  select d.decision, d.proposal_id, b.outcome, b.proposal_id
    into decision_value, decision_proposal, run_outcome, run_proposal
  from public.algorithm_change_decisions d
  left join public.algorithm_backtest_runs b on b.id = d.backtest_run_id
  where d.id = new.approval_decision_id;

  if decision_value is distinct from 'APPROVED' then
    raise exception 'release requires an APPROVED decision';
  end if;
  if run_outcome is distinct from 'PASSED' then
    raise exception 'release requires a PASSED backtest';
  end if;
  if decision_proposal is distinct from new.proposal_id or run_proposal is distinct from new.proposal_id then
    raise exception 'release proposal, decision and backtest must match';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_algorithm_release_insert on public.algorithm_releases;
create trigger guard_algorithm_release_insert
before insert on public.algorithm_releases
for each row execute function public.guard_algorithm_release();

-- APPROVED decisions themselves must already reference a PASSED backtest for the same proposal.
create or replace function public.guard_algorithm_decision()
returns trigger
language plpgsql
as $$
declare
  run_outcome text;
  run_proposal uuid;
begin
  if new.decision = 'APPROVED' then
    if new.backtest_run_id is null then
      raise exception 'APPROVED decision requires a backtest';
    end if;
    select outcome, proposal_id into run_outcome, run_proposal
      from public.algorithm_backtest_runs where id = new.backtest_run_id;
    if run_outcome is distinct from 'PASSED' or run_proposal is distinct from new.proposal_id then
      raise exception 'APPROVED decision requires a PASSED backtest for the same proposal';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_algorithm_decision_insert on public.algorithm_change_decisions;
create trigger guard_algorithm_decision_insert
before insert on public.algorithm_change_decisions
for each row execute function public.guard_algorithm_decision();

commit;
