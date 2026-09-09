function dateParts(now: Date, timeZone: string): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: 'year' | 'month' | 'day') => Number(parts.find((part) => part.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

/** Returns the Monday date that owns this user's local week. */
export function getWeeklyPeriodStart(now: Date = new Date(), timeZone = 'Asia/Riyadh'): string {
  const { year, month, day } = dateParts(now, timeZone);
  const localDateAsUtc = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = localDateAsUtc.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  localDateAsUtc.setUTCDate(localDateAsUtc.getUTCDate() - daysSinceMonday);
  return localDateAsUtc.toISOString().slice(0, 10);
}

export function buildWeeklyAnalysisIdempotencyKey(userId: string, cycleId: string, periodStart: string): string {
  return `weekly-analysis:${userId}:${cycleId}:${periodStart}`;
}
