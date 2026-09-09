import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('transaction history source invariants', () => {
  const root = process.cwd();
  const repository = fs.readFileSync(path.join(root,'src/repositories/transaction-repository.ts'),'utf8');
  it('always scopes queries by authenticated owner', () => {
    expect(repository).toContain('t.user_id=${userId}');
  });
  it('uses pagination rather than returning all rows', () => {
    expect(repository).toContain('limit ${filters.pageSize} offset ${offset}');
  });
  it('uses fixed sort choices rather than interpolating a column name', () => {
    expect(repository).toContain("case when ${filters.sort}='DATE_DESC'");
    expect(repository).not.toContain('order by ${filters.sort}');
  });
});
