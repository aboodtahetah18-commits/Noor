import { Money } from '@/financial-engine/money';
import type { HistoricalCycleRow } from '@/features/reports/types/reports';
import type { HistoricalAnalysisResult, HistoricalMetricAverage, HistoricalTrend, TrendDirection } from '@/features/historical-analysis/types/historical-analysis';

function average(values: string[]): string {
  if (values.length === 0) return '0.00';
  const total = values.reduce((sum, value) => sum.add(Money.parse(value)), Money.zero());
  const halalas = total.toHalalas();
  const divisor = BigInt(values.length);
  const rounded = (halalas + divisor / 2n) / divisor;
  return Money.fromHalalas(rounded).toString();
}

function compareTrend(metric: HistoricalTrend['metric'], chronological: HistoricalCycleRow[], getter: (row: HistoricalCycleRow) => string | null, higherIsBetter: boolean): HistoricalTrend {
  if (chronological.length < 2) return { metric, direction: 'INSUFFICIENT_DATA', firstValue: null, latestValue: null, absoluteChange: null };
  const firstRaw = getter(chronological[0]!);
  const latestRaw = getter(chronological[chronological.length - 1]!);
  if (firstRaw == null || latestRaw == null) return { metric, direction: 'INSUFFICIENT_DATA', firstValue: firstRaw, latestValue: latestRaw, absoluteChange: null };
  const first = Money.parse(firstRaw);
  const latest = Money.parse(latestRaw);
  const cmp = latest.compare(first);
  let direction: TrendDirection = 'STABLE';
  if (cmp !== 0) direction = (cmp > 0) === higherIsBetter ? 'IMPROVING' : 'DECLINING';
  return { metric, direction, firstValue: firstRaw, latestValue: latestRaw, absoluteChange: latest.subtract(first).toString() };
}

export function analyzeClosedCycles(itemsNewestFirst: HistoricalCycleRow[], requestedWindow: 3 | 6): HistoricalAnalysisResult {
  const items = itemsNewestFirst.slice(0, requestedWindow);
  const availableCount = items.length;
  if (availableCount === 0) {
    return { requestedWindow, availableCount, hasFullWindow: false, source: 'CLOSED_CYCLE_SNAPSHOTS_ONLY', items, averages: null, trends: [], recurringSignals: null };
  }

  const endBalances = items.map(x => x.actualEndBalance).filter((x): x is string => x != null);
  const averages: HistoricalMetricAverage = {
    actualIncome: average(items.map(x => x.actualIncome)),
    actualExpense: average(items.map(x => x.actualExpense)),
    actualSaving: average(items.map(x => x.actualSaving)),
    surplus: average(items.map(x => x.surplus)),
    deficit: average(items.map(x => x.deficit)),
    emergencyContribution: average(items.map(x => x.emergencyContribution)),
    goalContributions: average(items.map(x => x.goalContributions)),
    actualEndBalance: endBalances.length === items.length ? average(endBalances) : null,
  };

  const chronological = [...items].reverse();
  const trends: HistoricalTrend[] = [
    compareTrend('ACTUAL_INCOME', chronological, x => x.actualIncome, true),
    compareTrend('ACTUAL_EXPENSE', chronological, x => x.actualExpense, false),
    compareTrend('ACTUAL_SAVING', chronological, x => x.actualSaving, true),
    compareTrend('SURPLUS', chronological, x => x.surplus, true),
    compareTrend('DEFICIT', chronological, x => x.deficit, false),
    compareTrend('END_BALANCE', chronological, x => x.actualEndBalance, true),
  ];

  const recurringSignals = {
    cyclesWithSurplus: items.filter(x => Money.parse(x.surplus).compare(Money.zero()) > 0).length,
    cyclesWithDeficit: items.filter(x => Money.parse(x.deficit).compare(Money.zero()) > 0).length,
    cyclesSavingAtOrAbovePlan: items.filter(x => Money.parse(x.actualSaving).compare(Money.parse(x.plannedSaving)) >= 0).length,
    cyclesExpenseAtOrBelowPlan: items.filter(x => Money.parse(x.actualExpense).compare(Money.parse(x.plannedExpense)) <= 0).length,
  };

  return { requestedWindow, availableCount, hasFullWindow: availableCount >= requestedWindow, source: 'CLOSED_CYCLE_SNAPSHOTS_ONLY', items, averages, trends, recurringSignals };
}
