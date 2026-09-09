import { describe, expect, it } from 'vitest';
import { analyzeClosedCycles } from '@/features/historical-analysis/services/analyze-closed-cycles';
import type { HistoricalCycleRow } from '@/features/reports/types/reports';

const row = (id: string, income: string, expense: string, saving: string, surplus: string, deficit: string): HistoricalCycleRow => ({
  cycleId:id,cycleName:id,startDate:'2026-01-01',closedAt:`2026-0${id}-28`,expectedIncome:income,actualIncome:income,
  plannedExpense:'3000.00',actualExpense:expense,plannedSaving:'1000.00',actualSaving:saving,emergencyContribution:'200.00',goalContributions:'300.00',surplus,deficit,actualEndBalance:'5000.00'
});

describe('analyzeClosedCycles', () => {
  it('does not fake a full 6-cycle window from two cycles', () => {
    const result = analyzeClosedCycles([row('2','6000.00','2800.00','1200.00','2000.00','0.00'),row('1','5000.00','3200.00','800.00','1000.00','0.00')],6);
    expect(result.availableCount).toBe(2);
    expect(result.hasFullWindow).toBe(false);
  });
  it('uses deterministic money averages and trends', () => {
    const result = analyzeClosedCycles([row('3','7000.00','2500.00','1500.00','3000.00','0.00'),row('2','6000.00','2800.00','1200.00','2000.00','0.00'),row('1','5000.00','3200.00','800.00','1000.00','0.00')],3);
    expect(result.averages?.actualIncome).toBe('6000.00');
    expect(result.trends.find(x=>x.metric==='ACTUAL_INCOME')?.direction).toBe('IMPROVING');
    expect(result.trends.find(x=>x.metric==='ACTUAL_EXPENSE')?.direction).toBe('IMPROVING');
  });
});
