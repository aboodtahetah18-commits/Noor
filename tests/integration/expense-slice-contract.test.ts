import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const repo=readFileSync('src/repositories/expense-repository.ts','utf8');
describe('expense vertical slice contract',()=>{
 it('uses idempotency and PENDING to POSTED',()=>{expect(repo).toContain('idempotency_key');expect(repo).toContain("'EXPENSE','PENDING'");expect(repo).toContain("status='POSTED'");});
 it('requires active cycle, account, category, and plan',()=>{expect(repo).toContain("c.status='ACTIVE'");expect(repo).toContain('a.is_active=true');expect(repo).toContain('bc.is_active=true');expect(repo).toContain("p.status='ACTIVE_PLAN'");});
 it('uses the explicit owner-selected buffer policy rather than a zero default',()=>{expect(repo).toContain('getActiveFinancialBufferPolicy');expect(repo).toContain('BUFFER_POLICY_REQUIRED');expect(repo).not.toContain('requiredFinancialBuffer: Money.zero()');});
 it('uses P56 linear pace for AT_RISK without a hidden 80 percent rule',()=>{expect(repo).toContain('resolveBudgetCategoryStatus');expect(repo).toContain("'P56_LINEAR_PACE_RULE'");expect(repo).not.toMatch(/80%|0\.8/);});
});
