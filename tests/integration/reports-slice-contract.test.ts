import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const repo = fs.readFileSync('src/repositories/report-repository.ts','utf8');

describe('Phase 26 reports contract',()=>{
  it('uses snapshots for CLOSED cycle reports',()=>{
    expect(repo).toContain("String(cycle.status) === 'CLOSED' ? this.closed");
    expect(repo).toContain('public.cycle_snapshots');
    expect(repo).toContain('public.cycle_category_snapshots');
  });
  it('historical comparison includes CLOSED cycles only',()=>{
    expect(repo).toContain("fc.status='CLOSED'");
  });
  it('does not manufacture live final surplus/deficit',()=>{
    expect(repo).toContain("finalResult: { surplus: null, deficit: null, status: 'PENDING_CLOSING' }");
  });
});
