export type FinancialHealthStatus = 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
export type FinancialHealthDimensionCode = 'DEFICIT_SAFETY' | 'BUDGET_ADHERENCE' | 'SAVING_ADHERENCE' | 'EMERGENCY_READINESS' | 'OBLIGATION_DISCIPLINE' | 'UNPLANNED_SPENDING' | 'GOAL_FEASIBILITY';

export interface FinancialHealthInput {
  expectedDeficit: string;
  budgetUtilizationPercent?: string | null;
  plannedSaving?: string | null;
  actualSaving?: string | null;
  emergencyProgressPercent?: string | null;
  overdueObligations: number;
  unplannedExpensePercent?: string | null;
  unrealisticGoals?: number | null;
  activeGoals?: number | null;
}

export interface FinancialHealthDimension {
  code: FinancialHealthDimensionCode;
  score: number;
  reason: string;
}

export interface FinancialHealthResult {
  score: number;
  status: FinancialHealthStatus;
  dimensions: FinancialHealthDimension[];
  method: 'EQUAL_AVERAGE_AVAILABLE_DIMENSIONS';
  engineVersion: 'P56-V1';
}

function n(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function clamp(value: number) { return Math.max(0, Math.min(100, value)); }
function status(score: number): FinancialHealthStatus {
  if (score >= 75) return 'EXCELLENT';
  if (score >= 50) return 'GOOD';
  if (score >= 25) return 'WARNING';
  return 'CRITICAL';
}

/**
 * P56 / PENDING-BR-001 resolution.
 * No hidden weights: every available dimension contributes equally.
 * Missing/non-applicable dimensions are omitted instead of being treated as zero.
 */
export function calculateFinancialHealth(input: FinancialHealthInput): FinancialHealthResult {
  if (!Number.isInteger(input.overdueObligations) || input.overdueObligations < 0) throw new Error('FINANCIAL_HEALTH_INVALID_OVERDUE_COUNT');
  const dimensions: FinancialHealthDimension[] = [];

  const deficit = n(input.expectedDeficit);
  if (deficit === null || deficit < 0) throw new Error('FINANCIAL_HEALTH_INVALID_DEFICIT');
  dimensions.push({ code: 'DEFICIT_SAFETY', score: deficit === 0 ? 100 : 0, reason: deficit === 0 ? 'لا يوجد عجز متوقع.' : 'يوجد عجز متوقع.' });

  const utilization = n(input.budgetUtilizationPercent);
  if (utilization !== null) {
    const score = utilization <= 100 ? 100 : clamp(200 - utilization);
    dimensions.push({ code: 'BUDGET_ADHERENCE', score, reason: `استخدام الميزانية ${utilization.toFixed(2)}%.` });
  }

  const plannedSaving = n(input.plannedSaving);
  const actualSaving = n(input.actualSaving);
  if (plannedSaving !== null && actualSaving !== null && plannedSaving > 0 && actualSaving >= 0) {
    const score = clamp((actualSaving / plannedSaving) * 100);
    dimensions.push({ code: 'SAVING_ADHERENCE', score, reason: `تنفيذ الادخار ${score.toFixed(2)}% من المخطط.` });
  }

  const emergency = n(input.emergencyProgressPercent);
  if (emergency !== null && emergency >= 0) {
    dimensions.push({ code: 'EMERGENCY_READINESS', score: clamp(emergency), reason: `اكتمال صندوق الطوارئ ${clamp(emergency).toFixed(2)}%.` });
  }

  dimensions.push({ code: 'OBLIGATION_DISCIPLINE', score: input.overdueObligations === 0 ? 100 : 0, reason: input.overdueObligations === 0 ? 'لا توجد التزامات متأخرة.' : `يوجد ${input.overdueObligations} التزام متأخر.` });

  const unplanned = n(input.unplannedExpensePercent);
  if (unplanned !== null && unplanned >= 0) {
    dimensions.push({ code: 'UNPLANNED_SPENDING', score: clamp(100 - unplanned), reason: `المصروف غير المخطط ${unplanned.toFixed(2)}%.` });
  }

  if (input.activeGoals !== null && input.activeGoals !== undefined && input.unrealisticGoals !== null && input.unrealisticGoals !== undefined) {
    if (!Number.isInteger(input.activeGoals) || input.activeGoals < 0 || !Number.isInteger(input.unrealisticGoals) || input.unrealisticGoals < 0 || input.unrealisticGoals > input.activeGoals) throw new Error('FINANCIAL_HEALTH_INVALID_GOAL_COUNTS');
    if (input.activeGoals > 0) {
      const score = clamp(((input.activeGoals - input.unrealisticGoals) / input.activeGoals) * 100);
      dimensions.push({ code: 'GOAL_FEASIBILITY', score, reason: `${input.activeGoals - input.unrealisticGoals} من ${input.activeGoals} أهداف نشطة متوافقة مع القدرة الحالية.` });
    }
  }

  const score = dimensions.length === 0 ? 0 : Math.round(dimensions.reduce((sum, item) => sum + item.score, 0) / dimensions.length);
  return { score, status: status(score), dimensions, method: 'EQUAL_AVERAGE_AVAILABLE_DIMENSIONS', engineVersion: 'P56-V1' };
}
