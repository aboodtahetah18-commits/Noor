import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('database/migrations/20260916_068_algorithm_runtime_binding.sql', 'utf8');
const governanceMigration = readFileSync('database/migrations/20260916_067_algorithm_change_governance.sql', 'utf8');

describe('algorithm runtime binding database contract', () => {
  it('keeps release approval and backtest guards at the database boundary', () => {
    expect(governanceMigration).toContain("decision_value is distinct from 'APPROVED'");
    expect(governanceMigration).toContain("run_outcome is distinct from 'PASSED'");
    expect(governanceMigration).toContain('release proposal, decision and backtest must match');
  });

  it('stores runtime activation as an append-only event stream', () => {
    expect(migration).toContain('create table if not exists public.algorithm_runtime_bindings');
    expect(migration).toContain('prevent_algorithm_runtime_bindings_mutation');
    expect(migration).toContain("source_type in ('RELEASE','ROLLBACK')");
    expect(migration).not.toMatch(/update\s+public\.algorithm_runtime_bindings/i);
    expect(migration).not.toMatch(/delete\s+from\s+public\.algorithm_runtime_bindings/i);
  });

  it('binds release and rollback in the same transaction as their governance event', () => {
    expect(migration).toContain('after insert on public.algorithm_releases');
    expect(migration).toContain('execute function public.bind_algorithm_release_runtime()');
    expect(migration).toContain('after insert on public.algorithm_rollbacks');
    expect(migration).toContain('execute function public.bind_algorithm_rollback_runtime()');
    expect(migration.trim().toLowerCase().startsWith('begin;')).toBe(true);
    expect(migration.trim().toLowerCase().endsWith('commit;')).toBe(true);
  });

  it('blocks stale releases and stale rollback attempts', () => {
    expect(migration).toContain('release previous_version does not match active runtime binding');
    expect(migration).toContain('rollback release is not the active runtime binding');
    expect(migration).toContain('order by b.activated_at desc, b.id desc');
  });

  it('keeps runtime bindings isolated by user and executable target', () => {
    expect(migration).toContain('where b.user_id = new.user_id and b.target = new.target');
    expect(migration).toContain("target in ('POLICY','WEIGHTS','THRESHOLDS','ENGINE_LOGIC')");
    expect(migration).not.toContain("target in ('POLICY','WEIGHTS','THRESHOLDS','ENGINE_LOGIC','MEASUREMENT_CONTRACT')");
  });

  it('backfills historical release and rollback events without deleting history', () => {
    expect(migration).toContain('from public.algorithm_releases r');
    expect(migration).toContain('from public.algorithm_rollbacks rb');
    expect(migration).toContain('on conflict do nothing');
    expect(migration).toContain("'GOVERNED_RUNTIME_BINDING'");
    expect(migration).toContain("'GOVERNED_RUNTIME_ROLLBACK'");
  });
});
