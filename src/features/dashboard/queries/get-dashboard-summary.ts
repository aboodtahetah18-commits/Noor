import { dashboardRepository } from '@/repositories/dashboard-repository';
import { Money } from '@/financial-engine/money';
import { getCurrentFinancialState } from '@/features/financial-engine/queries/get-current-financial-state';
import { listCycleRecommendations } from '@/features/financial-engine/queries/list-cycle-recommendations';
import { FinancialPlatformError } from '@/features/financial-engine/services/financial-platform-error';
import { getLivePersonalBudgetCalculation } from '@/lib/finance/live-personal-budget-calculation';

export async function getDashboardSummary(userId: string, cycleId?: string) {
  const dashboard = await dashboardRepository.get(userId, cycleId);
  if (!dashboard || dashboard.cycle.source !== 'LIVE') return dashboard;

  try {
    const [engine, recommendations, liveCalculation] = await Promise.all([
      getCurrentFinancialState(userId, dashboard.cycle.id),
      listCycleRecommendations(userId, dashboard.cycle.id),
      getLivePersonalBudgetCalculation(userId, dashboard.cycle.id),
    ]);
    const expectedTotal = Money.parse(engine.verifiedIncomeReceived)
      .add(Money.parse(engine.expectedIncomeUnreceived))
      .toString();
    const top = recommendations[0] ?? null;

    if(!liveCalculation)return dashboard;
    const unified = liveCalculation.calculation.values;
    return {
      ...dashboard,
      liquidity: { total: engine.actualLiquidity },
      safeToSpend: {
        amount: unified.trueAvailable,
        status: Money.parse(unified.trueAvailable).isZero() ? 'ZERO' as const : 'AVAILABLE' as const,
        blockingIssue: null,
      },
      dailySafeLimit: {
        amount: unified.dailyGuidance ?? '0.00',
        status: Money.parse(unified.dailyGuidance ?? '0.00').isZero() ? 'ZERO' as const : 'AVAILABLE' as const,
        blockingIssue: null,
      },
      income: {
        expected: expectedTotal,
        actual: unified.verifiedIncome,
      },
      budget: {
        planned: unified.plannedAmount,
        actual: unified.realizedAmount,
        remaining: Money.parse(unified.plannedAmount).subtract(Money.parse(unified.realizedAmount)).max(Money.zero()).toString(),
        utilizationPercent: unified.utilizationPercent,
      },
      saving: {
        ...dashboard.saving,
        actual: unified.netRealizedSavings,
        rate: unified.savingsRatePercent,
      },
      forecast: {
        projectedEndBalance: unified.projectedEndBalance ?? engine.projectedEndBalance,
        expectedDeficit: Money.parse(unified.operatingDeficit).max(Money.parse(engine.projectedDeficit)).toString(),
        deficitStatus: 'AVAILABLE' as const,
        blockingIssue: null,
      },
      topRecommendation: top ? {
        id: top.id,
        type: top.type,
        priority: top.priority,
        title: top.title,
        message: top.message,
        reasonCode: top.reasonCode,
        status: top.status,
      } : null,
      recommendationEngineStatus: 'AVAILABLE' as const,
    };
  } catch (error) {
    if (error instanceof FinancialPlatformError && ['FINANCIAL_STATE_NOT_AVAILABLE','FINANCIAL_CYCLE_NOT_FOUND'].includes(error.code)) {
      return dashboard;
    }
    throw error;
  }
}
