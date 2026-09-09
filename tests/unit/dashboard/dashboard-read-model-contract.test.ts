import { describe, expect, it } from 'vitest';
import type { DashboardSummary } from '@/features/dashboard/types/dashboard';

describe('Phase 21 dashboard contract', () => {
  it('allows unresolved authoritative metrics to stay blocked instead of inventing values', () => {
    const safe: DashboardSummary['safeToSpend'] = { amount: null, status: 'BLOCKED', blockingIssue: 'BUFFER_POLICY_REQUIRED' };
    const forecast: DashboardSummary['forecast'] = { projectedEndBalance: null, expectedDeficit: null, deficitStatus: 'BUFFER_POLICY_REQUIRED', blockingIssue: null };
    expect(safe.amount).toBeNull();
    expect(forecast.projectedEndBalance).toBeNull();
  });
});
