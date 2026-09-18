import { getRawSql } from '@/infrastructure/db/client';
import { HILAL_REPAYMENT_SAVINGS_SHARE } from './hilal-calibration';

export type HilalRepaymentCapacityInput = {
  confirmedMonthlyIncome: number;
  recurringCoreObligations: number;
  realizedSalaryIncome: number;
  repaymentCycles?: number;
};

export type HilalRepaymentCapacityResult = {
  source_status: 'REALIZED_SALARY_AVAILABLE' | 'NO_REALIZED_SALARY';
  realized_salary_income: number;
  conservative_income_basis: number;
  recurring_core_obligations: number;
  safe_savings: number;
  max_monthly_repayment: number;
  repayment_cycles: number | null;
  repayment_capacity: number | null;
  parameter_id: string;
  parameter_version: string;
  methodology: 'MIN_REALIZED_AND_CONFIRMED_INCOME';
};

export function calculateHilalRepaymentCapacity(input: HilalRepaymentCapacityInput): HilalRepaymentCapacityResult {
  const confirmedIncome = Math.max(input.confirmedMonthlyIncome, 0);
  const realizedSalary = Math.max(input.realizedSalaryIncome, 0);
  const obligations = Math.max(input.recurringCoreObligations, 0);
  const conservativeIncomeBasis = Math.min(confirmedIncome, realizedSalary);
  const safeSavings = Math.max(conservativeIncomeBasis - obligations, 0);
  const maxMonthlyRepayment = safeSavings * HILAL_REPAYMENT_SAVINGS_SHARE.max;
  const repaymentCycles = typeof input.repaymentCycles === 'number' && Number.isInteger(input.repaymentCycles) && input.repaymentCycles > 0
    ? input.repaymentCycles
    : null;

  return {
    source_status: realizedSalary > 0 ? 'REALIZED_SALARY_AVAILABLE' : 'NO_REALIZED_SALARY',
    realized_salary_income: realizedSalary,
    conservative_income_basis: conservativeIncomeBasis,
    recurring_core_obligations: obligations,
    safe_savings: safeSavings,
    max_monthly_repayment: maxMonthlyRepayment,
    repayment_cycles: repaymentCycles,
    repayment_capacity: repaymentCycles === null ? null : maxMonthlyRepayment * repaymentCycles,
    parameter_id: HILAL_REPAYMENT_SAVINGS_SHARE.parameter_id,
    parameter_version: HILAL_REPAYMENT_SAVINGS_SHARE.version,
    methodology: 'MIN_REALIZED_AND_CONFIRMED_INCOME',
  };
}

export async function getHilalRepaymentCapacity(
  userId: string,
  input: Omit<HilalRepaymentCapacityInput, 'realizedSalaryIncome'>,
) {
  const sql = getRawSql();
  const rows = await sql`
    select coalesce(sum(t.amount) filter (
      where t.transaction_type='INCOME'
        and t.status='POSTED'
        and t.income_kind='SALARY'
    ),0)::text as realized_salary_income
    from public.financial_cycles c
    left join public.transactions t on t.user_id=c.user_id and t.cycle_id=c.id
    where c.user_id=${userId}
      and c.status in ('ACTIVE','CLOSING')
    group by c.id,c.activated_at
    order by c.activated_at desc nulls last
    limit 1
  `;
  const realizedSalaryIncome = Number(rows[0]?.realized_salary_income ?? 0);
  return calculateHilalRepaymentCapacity({
    ...input,
    realizedSalaryIncome: Number.isFinite(realizedSalaryIncome) ? realizedSalaryIncome : 0,
  });
}
