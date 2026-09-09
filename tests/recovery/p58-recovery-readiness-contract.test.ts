import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('P58 recovery readiness contract', () => {
  it('keeps migrations atomic and idempotent', () => {
    const migrate = read('scripts/migrate-deployment.mjs');
    expect(migrate).toContain("client.query('BEGIN')");
    expect(migrate).toContain("client.query('COMMIT')");
    expect(migrate).toContain("client.query('ROLLBACK')");
    expect(migrate).toContain('schema_migrations');
    expect(migrate).toContain('if (applied.has(filename))');
  });

  it('protects immutable historical recovery anchors', () => {
    const immutable = read('database/migrations/20260902_008_indexes_views_immutability.sql');
    expect(immutable).toContain('cycle_snapshots_immutable');
    expect(immutable).toContain('cycle_category_snapshots_immutable');
    expect(immutable).toContain('state_transition_logs_immutable');
    expect(immutable).toContain('prevent_update_delete');
  });

  it('requires recovery validation on a non-production PostgreSQL target', () => {
    const preflight = read('scripts/recovery-preflight.mjs');
    expect(preflight).toContain('RECOVERY_DATABASE_URL');
    expect(preflight).toContain('target === production');
    expect(preflight).toContain('BEGIN READ ONLY');
    expect(preflight).toContain('criticalTables');
    expect(preflight).toContain('64');
  });
});
