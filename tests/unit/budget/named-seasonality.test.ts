import { describe, expect, it } from 'vitest';
import { namedSeasonCoverage, namedSeasonSignal, namedSeasonsForDate } from '@/features/budget/services/named-seasonality';

describe('named budget seasonality',()=>{
  it('detects summer and the approximate back-to-school overlap',()=>{
    expect(namedSeasonsForDate('2026-07-10')).toContain('SUMMER');
    expect(namedSeasonsForDate('2026-08-20')).toEqual(expect.arrayContaining(['SUMMER','BACK_TO_SCHOOL']));
  });

  it('measures season coverage inside a financial cycle',()=>{
    const summer=namedSeasonCoverage('2026-07-01','2026-08-01').find(item=>item.season==='SUMMER');
    expect(summer?.coverage).toBe(1);
    expect(summer?.days).toBe(31);
  });

  it('uses repeated historical summer spending only when the named season signal is material',()=>{
    const dailySpend=[
      {date:'2024-07-10',amount:300},
      {date:'2024-07-20',amount:300},
      {date:'2025-07-10',amount:300},
      {date:'2025-07-20',amount:300},
      {date:'2024-01-10',amount:30},
      {date:'2025-01-10',amount:30},
    ];
    const signal=namedSeasonSignal({
      cycleStart:'2026-07-01',
      cycleEnd:'2026-08-01',
      dailySpend,
      historyStart:'2024-01-01',
      historyEnd:'2026-01-01',
    });
    expect(signal?.season).toBe('SUMMER');
    expect(signal?.historicalSeasonOccurrences).toBeGreaterThanOrEqual(2);
    expect(signal?.weightedFactor).toBeGreaterThan(1);
  });
});
