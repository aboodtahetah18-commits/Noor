import { describe, expect, it } from 'vitest';
import { buildWeeklyAnalysisIdempotencyKey, getWeeklyPeriodStart } from '@/features/weekly-analysis/jobs/period';

describe('weekly analysis period', () => {
  it('uses Monday as the Riyadh-local weekly boundary', () => {
    expect(getWeeklyPeriodStart(new Date('2026-09-02T16:00:00Z'))).toBe('2026-08-31');
  });

  it('keeps every day in the same week on the same idempotency key', () => {
    const monday = getWeeklyPeriodStart(new Date('2026-08-31T12:00:00Z'));
    const sunday = getWeeklyPeriodStart(new Date('2026-09-06T12:00:00Z'));
    expect(monday).toBe(sunday);
    expect(buildWeeklyAnalysisIdempotencyKey('u1', 'c1', monday)).toBe(buildWeeklyAnalysisIdempotencyKey('u1', 'c1', sunday));
  });

  it('changes the key for a new week', () => {
    const first = getWeeklyPeriodStart(new Date('2026-09-06T12:00:00Z'));
    const next = getWeeklyPeriodStart(new Date('2026-09-07T12:00:00Z'));
    expect(first).not.toBe(next);
  });
});
