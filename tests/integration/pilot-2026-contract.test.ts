import { describe, expect, it } from 'vitest';
import { PILOT_2026 } from '../../src/config/pilot-2026';

describe('2026 personal pilot contract', () => {
  it('runs through the end of 2026', () => {
    expect(PILOT_2026.startsAt).toBe('2026-09-16');
    expect(PILOT_2026.endsAt).toBe('2026-12-31');
    expect(PILOT_2026.reviewCadence).toBe('monthly');
  });

  it('does not permit platform-side financial execution', () => {
    expect(PILOT_2026.financialExecutionMode).toBe('user-confirmed-only');
    expect(PILOT_2026.acceptanceCriteria.join(' ')).toContain('VERIFIED_EXECUTION');
  });

  it('blocks commercial-readiness claims until the final review', () => {
    expect(PILOT_2026.commercialLaunchBlockedUntilReview).toBe(true);
    expect(PILOT_2026.acceptanceCriteria.join(' ')).toContain('31 ديسمبر 2026');
  });
});
