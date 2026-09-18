import { describe, expect, it } from 'vitest';
import { summarizeHilalRestructuringCounts } from '@/lib/conversations/hilal-restructuring-ledger';

describe('Hilal restructuring precautionary cap', () => {
  it('tracks the three-restructure cap per financing case, not across unrelated cases', () => {
    const summary = summarizeHilalRestructuringCounts({
      requested_count: 5,
      approved_count: 5,
      applied_count_total: 5,
      max_applied_per_case: 2,
      cases_at_precautionary_cap: 0,
      rejected_count: 0,
      cancelled_count: 0,
    });
    expect(summary).toMatchObject({
      applied_count_total: 5,
      max_applied_per_case: 2,
      precautionary_cap: 3,
      precautionary_cap_reached: false,
      cases_at_precautionary_cap: 0,
    });
  });

  it('marks the cap reached when any single financing has three applied restructures', () => {
    const summary = summarizeHilalRestructuringCounts({
      requested_count: 4,
      approved_count: 3,
      applied_count_total: 3,
      max_applied_per_case: 3,
      cases_at_precautionary_cap: 1,
      rejected_count: 1,
      cancelled_count: 0,
    });
    expect(summary.precautionary_cap_reached).toBe(true);
    expect(summary.cases_at_precautionary_cap).toBe(1);
  });
});
