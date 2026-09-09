import { describe,it,expect } from 'vitest';import { readFileSync } from 'node:fs';
const migration=readFileSync('database/migrations/20260902_021_onboarding_progress.sql','utf8');
const repo=readFileSync('src/repositories/onboarding-repository.ts','utf8');
const finalize=readFileSync('src/features/onboarding/commands/finalize-onboarding.ts','utf8');
describe('Phase 30 onboarding contract',()=>{
  it('stores workflow progress without duplicating financial amounts',()=>{expect(migration).toContain('onboarding_progress');expect(migration).not.toMatch(/expected_amount|opening_balance|saving_amount|target_amount/)});
  it('creates first cycle and expected income atomically',()=>{expect(repo).toContain('rawSql.transaction');expect(repo).toContain("'DRAFT'");expect(repo).toContain('expected_incomes')});
  it('requires an approved plan before finalization',()=>{expect(finalize).toContain("planStatus!=='ACTIVE_PLAN'")});
  it('activates the cycle and attaches in-window obligations on completion',()=>{expect(finalize).toContain("'DRAFT','ACTIVE','ACTIVATE_CYCLE'");expect(finalize).toContain('obligation_occurrences')});
});
