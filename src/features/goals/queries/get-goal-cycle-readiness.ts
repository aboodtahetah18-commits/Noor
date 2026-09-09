import { rawSql } from '@/infrastructure/db/client';
import { goalRepository } from '@/repositories/goal-repository';
import { Money } from '@/financial-engine/money';

export type GoalCycleReadinessCycle = {
  id: string;
  startDate: string;
  endDate: string;
  nextIncomeDate: string | null;
};

export type GoalCycleReadinessItem = {
  id: string;
  name: string;
  status: string;
  targetDate: string | null;
  remainingAmount: string;
  remainingCycles: number | null;
  requiredContribution: string | null;
  approvedThisCycle: string;
  gapThisCycle: string | null;
};

export async function getGoalCycleReadiness(userId: string) {
  const [goals, cycleRows, commitmentRows] = await Promise.all([
    goalRepository.list(userId),
    rawSql`select id,start_date::text as "startDate",end_date::text as "endDate",expected_next_income_date::text as "nextIncomeDate" from public.financial_cycles where user_id=${userId} and status='ACTIVE' order by start_date desc limit 1`,
    rawSql`select goal_id as "goalId",approved_amount::text as "approvedAmount",required_amount::text as "requiredAmount",status from public.goal_cycle_commitments gcc where gcc.user_id=${userId} and gcc.cycle_id=(select id from public.financial_cycles where user_id=${userId} and status='ACTIVE' order by start_date desc limit 1) and gcc.status in ('APPROVED','FUNDED')`,
  ]);
  const cycleRow = cycleRows[0];
  const cycle: GoalCycleReadinessCycle | null = cycleRow
    ? {
        id: String(cycleRow.id),
        startDate: String(cycleRow.startDate),
        endDate: String(cycleRow.endDate),
        nextIncomeDate: cycleRow.nextIncomeDate == null ? null : String(cycleRow.nextIncomeDate),
      }
    : null;
  const commitments = new Map(commitmentRows.map((r) => [String(r.goalId), r]));
  const items: GoalCycleReadinessItem[] = goals
    .filter((g) => ['ACTIVE','FINANCIALLY_UNREALISTIC'].includes(g.status) && Money.parse(g.remainingAmount).isPositive())
    .map((g) => {
      const c = commitments.get(g.id);
      const approved = Money.parse(String(c?.approvedAmount ?? '0'));
      const required = g.requiredContribution === null ? null : Money.parse(g.requiredContribution);
      return {
        id: g.id,
        name: g.name,
        status: g.status,
        targetDate: g.targetDate,
        remainingAmount: g.remainingAmount,
        remainingCycles: g.remainingCycles,
        requiredContribution: g.requiredContribution,
        approvedThisCycle: approved.toString(),
        gapThisCycle: required === null ? null : required.subtract(approved).max(Money.zero()).toString(),
      };
    });
  return { cycle, items };
}
