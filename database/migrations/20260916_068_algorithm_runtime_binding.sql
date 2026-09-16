begin;

-- Stage 4: bind the append-only algorithm governance ledger to the versions
-- consumed by the financial-engine runtime. Bindings are append-only events;
-- no release, rollback, or historical engine result is rewritten.
create table if not exists public.algorithm_runtime_bindings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  target text not null check (target in ('POLICY','WEIGHTS','THRESHOLDS','ENGINE_LOGIC')),
  version text not null,
  previous_version text not null,
  source_type text not null check (source_type in ('RELEASE','ROLLBACK')),
  release_id uuid references public.algorithm_releases(id) on delete restrict,
  rollback_id uuid references public.algorithm_rollbacks(id) on delete restrict,
  artifact_json jsonb not null,
  activated_at timestamptz not null default now(),
  check (
    (source_type = 'RELEASE' and release_id is not null and rollback_id is null)
    or
    (source_type = 'ROLLBACK' and release_id is not null and rollback_id is not null)
  )
);

create unique index if not exists algorithm_runtime_bindings_release_unique
  on public.algorithm_runtime_bindings(release_id)
  where source_type = 'RELEASE';
create unique index if not exists algorithm_runtime_bindings_rollback_unique
  on public.algorithm_runtime_bindings(rollback_id)
  where source_type = 'ROLLBACK';
create index if not exists algorithm_runtime_bindings_active_idx
  on public.algorithm_runtime_bindings(user_id, target, activated_at desc, id desc);

-- Runtime history follows the same append-only rule as the governance ledger.
drop trigger if exists prevent_algorithm_runtime_bindings_mutation on public.algorithm_runtime_bindings;
create trigger prevent_algorithm_runtime_bindings_mutation
before update or delete on public.algorithm_runtime_bindings
for each row execute function public.prevent_algorithm_governance_mutation();

-- A release can only advance from the currently active governed version.
-- The very first governed release is allowed to advance from the proposal's
-- baseline; migration 067 already proves APPROVED + PASSED + same proposal.
create or replace function public.guard_algorithm_release_runtime_chain()
returns trigger
language plpgsql
as $$
declare
  active_version text;
begin
  if new.target not in ('POLICY','WEIGHTS','THRESHOLDS','ENGINE_LOGIC') then
    return new;
  end if;

  select b.version
    into active_version
  from public.algorithm_runtime_bindings b
  where b.user_id = new.user_id and b.target = new.target
  order by b.activated_at desc, b.id desc
  limit 1;

  if active_version is not null and active_version is distinct from new.previous_version then
    raise exception 'release previous_version does not match active runtime binding';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_algorithm_release_runtime_chain_insert on public.algorithm_releases;
create trigger guard_algorithm_release_runtime_chain_insert
before insert on public.algorithm_releases
for each row execute function public.guard_algorithm_release_runtime_chain();

create or replace function public.bind_algorithm_release_runtime()
returns trigger
language plpgsql
as $$
begin
  if new.target in ('POLICY','WEIGHTS','THRESHOLDS','ENGINE_LOGIC') then
    insert into public.algorithm_runtime_bindings (
      user_id, target, version, previous_version, source_type,
      release_id, rollback_id, artifact_json, activated_at
    ) values (
      new.user_id, new.target, new.version, new.previous_version, 'RELEASE',
      new.id, null,
      jsonb_build_object(
        'activationMode', 'GOVERNED_RUNTIME_BINDING',
        'releaseArtifact', new.artifact_json
      ),
      new.released_at
    );
  end if;
  return new;
end;
$$;

drop trigger if exists bind_algorithm_release_runtime_insert on public.algorithm_releases;
create trigger bind_algorithm_release_runtime_insert
after insert on public.algorithm_releases
for each row execute function public.bind_algorithm_release_runtime();

-- Rollback is valid only for the release that is active now. This prevents an
-- old release from rewinding a newer runtime binding.
create or replace function public.guard_algorithm_rollback_runtime_chain()
returns trigger
language plpgsql
as $$
declare
  release_target text;
  release_version text;
  active_version text;
  active_release_id uuid;
begin
  select r.target, r.version
    into release_target, release_version
  from public.algorithm_releases r
  where r.id = new.release_id and r.user_id = new.user_id;

  if release_target not in ('POLICY','WEIGHTS','THRESHOLDS','ENGINE_LOGIC') then
    return new;
  end if;

  select b.version, b.release_id
    into active_version, active_release_id
  from public.algorithm_runtime_bindings b
  where b.user_id = new.user_id and b.target = release_target
  order by b.activated_at desc, b.id desc
  limit 1;

  if active_version is distinct from release_version or active_release_id is distinct from new.release_id then
    raise exception 'rollback release is not the active runtime binding';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_algorithm_rollback_runtime_chain_insert on public.algorithm_rollbacks;
create trigger guard_algorithm_rollback_runtime_chain_insert
before insert on public.algorithm_rollbacks
for each row execute function public.guard_algorithm_rollback_runtime_chain();

create or replace function public.bind_algorithm_rollback_runtime()
returns trigger
language plpgsql
as $$
declare
  release_row public.algorithm_releases%rowtype;
begin
  select * into release_row
  from public.algorithm_releases
  where id = new.release_id and user_id = new.user_id;

  if release_row.target in ('POLICY','WEIGHTS','THRESHOLDS','ENGINE_LOGIC') then
    insert into public.algorithm_runtime_bindings (
      user_id, target, version, previous_version, source_type,
      release_id, rollback_id, artifact_json, activated_at
    ) values (
      new.user_id, release_row.target, new.to_version, new.from_version, 'ROLLBACK',
      release_row.id, new.id,
      jsonb_build_object(
        'activationMode', 'GOVERNED_RUNTIME_ROLLBACK',
        'sourceReleaseArtifact', release_row.artifact_json,
        'reason', new.reason
      ),
      new.created_at
    );
  end if;
  return new;
end;
$$;

drop trigger if exists bind_algorithm_rollback_runtime_insert on public.algorithm_rollbacks;
create trigger bind_algorithm_rollback_runtime_insert
after insert on public.algorithm_rollbacks
for each row execute function public.bind_algorithm_rollback_runtime();

-- Backfill all historical executable release/rollback events. Their original
-- timestamps preserve the same effective ordering they had in the ledger.
insert into public.algorithm_runtime_bindings (
  user_id, target, version, previous_version, source_type,
  release_id, rollback_id, artifact_json, activated_at
)
select
  r.user_id,
  r.target,
  r.version,
  r.previous_version,
  'RELEASE',
  r.id,
  null,
  jsonb_build_object(
    'activationMode', 'GOVERNED_RUNTIME_BINDING',
    'releaseArtifact', r.artifact_json
  ),
  r.released_at
from public.algorithm_releases r
where r.target in ('POLICY','WEIGHTS','THRESHOLDS','ENGINE_LOGIC')
on conflict do nothing;

insert into public.algorithm_runtime_bindings (
  user_id, target, version, previous_version, source_type,
  release_id, rollback_id, artifact_json, activated_at
)
select
  rb.user_id,
  r.target,
  rb.to_version,
  rb.from_version,
  'ROLLBACK',
  r.id,
  rb.id,
  jsonb_build_object(
    'activationMode', 'GOVERNED_RUNTIME_ROLLBACK',
    'sourceReleaseArtifact', r.artifact_json,
    'reason', rb.reason
  ),
  rb.created_at
from public.algorithm_rollbacks rb
join public.algorithm_releases r on r.id = rb.release_id and r.user_id = rb.user_id
where r.target in ('POLICY','WEIGHTS','THRESHOLDS','ENGINE_LOGIC')
on conflict do nothing;

commit;
