import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const repository = readFileSync('src/repositories/dashboard-repository.ts', 'utf8');
const page = readFileSync('src/app/(protected)/dashboard/page.tsx', 'utf8');

describe('Phase 21 dashboard structure', () => {
  it('keeps calculations on the backend read model', () => {
    expect(repository).toContain('class DashboardRepository');
    expect(page).toContain('getDashboardSummary');
    expect(page).not.toContain('rawSql`');
  });
  it('does not invent unresolved Safe To Spend or forecast', () => {
    expect(repository).toContain("blockingIssue: 'BUFFER_POLICY_REQUIRED'");
    expect(repository).toContain("deficitStatus: 'BUFFER_POLICY_REQUIRED'");
  });
});

describe('Phase 22 dashboard recommendation integration', () => {
  it('reconciles deterministic rules before reading dashboard recommendation', () => {
    expect(repository).toContain('await runRecommendationRules(userId, resolvedCycleId)');
    expect(repository).toContain("recommendationEngineStatus: 'AVAILABLE'");
  });
});
