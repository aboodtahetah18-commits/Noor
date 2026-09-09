import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationDir = join(process.cwd(), 'database', 'migrations');
const files = readdirSync(migrationDir).filter((name) => name.endsWith('.sql')).sort();
const sql = files.map((name) => readFileSync(join(migrationDir, name), 'utf8')).join('\n');

describe('Neon PostgreSQL migration contract', () => {
  it('contains Better Auth and financial schema migrations', () => {
    expect(files.length).toBeGreaterThanOrEqual(9);
    expect(sql).toContain('create schema if not exists auth');
    expect(sql).toContain('create table public.transactions');
  });

  it('uses fixed precision money types', () => {
    expect(sql.toLowerCase()).toContain('numeric(18,2)');
    expect(sql.toLowerCase()).not.toMatch(/\b(float|real|double precision)\b/);
  });

  it('does not depend on Supabase auth helpers', () => {
    expect(sql).not.toContain('auth.uid()');
    expect(sql).not.toContain('auth.users');
  });
});
