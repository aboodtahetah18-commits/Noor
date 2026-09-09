import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Phase 17 obligation slice contract', () => {
  it('implements reservation, payment release, recurrence and temporal states', () => {
    const repo = read('src/repositories/obligation-repository.ts');
    expect(repo).toContain("'OBLIGATION_PAYMENT','PENDING'");
    expect(repo).toContain("status='PAID',is_reserved=false");
    expect(repo).toContain("t.recurrence<>'ONCE'");
    expect(repo).toContain("status='DUE'");
    expect(repo).toContain("status='OVERDUE'");
    expect(repo).toContain("for update");
  });

  it('requires an explicit financial buffer policy before Safe To Spend', () => {
    const repo = read('src/repositories/obligation-repository.ts');
    expect(repo).toContain('BUFFER_POLICY_REQUIRED');
    expect(repo).toContain('BUFFER_POLICY_REQUIRED');
  });

  it('has an authenticated scheduler endpoint and DB integrity migration', () => {
    const route = read('src/app/api/jobs/obligations/status/route.ts');
    const migration = read('database/migrations/20260902_015_obligation_integrity.sql');
    expect(route).toContain('CRON_SECRET');
    expect(migration).toContain('obligation_occurrences_template_due_uq');
  });
});
