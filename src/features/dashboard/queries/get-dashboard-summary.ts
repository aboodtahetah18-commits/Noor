import { dashboardRepository } from '@/repositories/dashboard-repository';
import { Money } from '@/financial-engine/money';
import { getCurrentFinancialState } from '@/features/financial-engine/queries/get-current-financial-state';
import { listCycleRecommendations } from '@/features/financial-engine/queries/list-cycle-recommendations';
import { FinancialPlatformError } from '@/features/financial-engine/services/financial-platform-error';

export async function getDashboardSummary(userId: string, cycleId?: string) {
  const dashboard = await dashboardRepository.get(userId, cycleId);
  if (!dashboard || dashboard.cycle.source !== 'LIVE') return dashboard;

  try {
    const [engine, recommendations] = await Promise.all([
      getCurrentFinancialState(userId, dashboard.cycle.id),
      listCycleRecommendations(userId, dashboard.cycle.id),
    ]);
    const expectedTotal = Money.parse(engine.verifiedIncomeReceived)
      .add(Money.parse(engine.expectedIncomeUnreceived))
      .toString();
    const top = recommendations[0] ?? null;

    return {
      ...dashboard,
      liquidity: { total: engine.actualLiquidity },
      safeToSpend: {
        amount: engine.freeCashAmount,
        status: Money.parse(engine.freeCashAmount).isZero() ? 'ZERO' as const : 'AVAILABLE' as const,
        blockingIssue: null,
      },
      income: {
        expected: expectedTotal,
        actual: engine.verifiedIncomeReceived,
      },
      forecast: {
        projectedEndBalance: engine.projectedEndBalance,
        expectedDeficit: engine.projectedDeficit,
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
