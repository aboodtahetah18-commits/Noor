import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('P58 production performance contract', () => {
  it('retains bounded transaction-history pagination', () => {
    const schema = read('src/features/transactions/schemas/transaction-history.ts');
    expect(schema).toContain('.max(100)');
    expect(schema).toContain('.default(25)');
    const repository = read('src/repositories/transaction-repository.ts');
    expect(repository).toContain('limit ${filters.pageSize} offset ${offset}');
  });

  it('retains concurrent dashboard/report aggregation', () => {
    const dashboard = read('src/repositories/dashboard-repository.ts');
    const reports = read('src/repositories/report-repository.ts');
    expect(dashboard.match(/Promise\.all/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(reports).toContain('Promise.all');
  });

  it('retains the production query indexes required by hot paths', () => {
    const migration = read('database/migrations/20260902_023_performance_hardening.sql');
    for (const index of [
      'transactions_cycle_posted_type_category_idx',
      'expected_incomes_cycle_idx',
      'obligation_occurrences_open_due_idx',
      'cycle_category_snapshots_snapshot_idx',
      'recommendations_open_feed_idx',
    ]) expect(migration).toContain(index);
  });
});
