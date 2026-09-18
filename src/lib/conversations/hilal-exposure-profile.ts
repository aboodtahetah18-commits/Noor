import { getRawSql } from '@/infrastructure/db/client';

export type HilalExposureProfile = {
  category_id: string;
  total_case_count: number;
  active_case_count: number;
  recovery_case_count: number;
  closed_case_count: number;
  total_approved_amount: number;
  total_used_principal: number;
  total_growth_contribution: number;
  total_paid_repayments: number;
  outstanding_exposure: number;
  planned_repayment_total: number;
  overdue_planned_amount: number;
  overdue_installment_count: number;
  next_installment_number: number | null;
  financing_history_available: boolean;
  reschedule_count: null;
  reschedule_tracking_status: 'NOT_TRACKED_IN_CANONICAL_LEDGER';
  source: 'INTERNAL_FUNDING_LEDGER';
};

type ExposureRow = {
  total_case_count?: unknown;
  active_case_count?: unknown;
  recovery_case_count?: unknown;
  closed_case_count?: unknown;
  total_approved_amount?: unknown;
  total_used_principal?: unknown;
  total_growth_contribution?: unknown;
  total_paid_repayments?: unknown;
  planned_repayment_total?: unknown;
  overdue_planned_amount?: unknown;
  overdue_installment_count?: unknown;
  next_installment_number?: unknown;
};

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function summarizeHilalExposureRow(categoryId: string, row: ExposureRow): HilalExposureProfile {
  const usedPrincipal = numberValue(row.total_used_principal);
  const growth = numberValue(row.total_growth_contribution);
  const paid = numberValue(row.total_paid_repayments);
  const totalCases = Math.max(0, Math.trunc(numberValue(row.total_case_count)));
  const nextRaw = Number(row.next_installment_number);

  return {
    category_id: categoryId,
    total_case_count: totalCases,
    active_case_count: Math.max(0, Math.trunc(numberValue(row.active_case_count))),
    recovery_case_count: Math.max(0, Math.trunc(numberValue(row.recovery_case_count))),
    closed_case_count: Math.max(0, Math.trunc(numberValue(row.closed_case_count))),
    total_approved_amount: numberValue(row.total_approved_amount),
    total_used_principal: usedPrincipal,
    total_growth_contribution: growth,
    total_paid_repayments: paid,
    outstanding_exposure: Math.max(usedPrincipal + growth - paid, 0),
    planned_repayment_total: numberValue(row.planned_repayment_total),
    overdue_planned_amount: numberValue(row.overdue_planned_amount),
    overdue_installment_count: Math.max(0, Math.trunc(numberValue(row.overdue_installment_count))),
    next_installment_number: Number.isInteger(nextRaw) && nextRaw > 0 ? nextRaw : null,
    financing_history_available: totalCases > 0,
    reschedule_count: null,
    reschedule_tracking_status: 'NOT_TRACKED_IN_CANONICAL_LEDGER',
    source: 'INTERNAL_FUNDING_LEDGER',
  };
}

export async function getHilalExposureProfile(userId: string, categoryId: string): Promise<HilalExposureProfile> {
  const sql = getRawSql();
  const rows = await sql`
    with category_cases as (
      select c.id,c.status,c.approved_amount
      from public.internal_funding_cases c
      where c.user_id=${userId}
        and c.target_category_id=${categoryId}::uuid
    ),
    allocations as (
      select
        coalesce(sum(a.amount),0) as principal,
        coalesce(sum(a.growth_contribution),0) as growth
      from public.internal_funding_expense_allocations a
      join category_cases c on c.id=a.case_id
      where a.user_id=${userId} and a.category_id=${categoryId}::uuid
    ),
    repayments as (
      select coalesce(sum(r.amount) filter(where r.status='PAID'),0) as paid
      from public.internal_funding_repayments r
      join category_cases c on c.id=r.case_id
      where r.user_id=${userId} and r.category_id=${categoryId}::uuid
    ),
    schedule as (
      select
        coalesce(sum(rs.total_amount) filter(where rs.status='PLANNED'),0) as planned_total,
        coalesce(sum(rs.total_amount) filter(
          where rs.status='PLANNED'
            and fc.expected_next_income_date < current_date
        ),0) as overdue_total,
        count(*) filter(
          where rs.status='PLANNED'
            and fc.expected_next_income_date < current_date
        )::int as overdue_count,
        min(rs.installment_number) filter(where rs.status='PLANNED')::int as next_installment
      from public.internal_funding_recovery_schedule rs
      join category_cases c on c.id=rs.case_id
      left join public.financial_cycles fc
        on fc.id=rs.cycle_id and fc.user_id=rs.user_id
      where rs.user_id=${userId} and rs.category_id=${categoryId}::uuid
    )
    select
      count(*)::int as total_case_count,
      count(*) filter(where status in ('PLANNING','ACTIVE'))::int as active_case_count,
      count(*) filter(where status='RECOVERY')::int as recovery_case_count,
      count(*) filter(where status='CLOSED')::int as closed_case_count,
      coalesce(sum(approved_amount),0)::text as total_approved_amount,
      (select principal::text from allocations) as total_used_principal,
      (select growth::text from allocations) as total_growth_contribution,
      (select paid::text from repayments) as total_paid_repayments,
      (select planned_total::text from schedule) as planned_repayment_total,
      (select overdue_total::text from schedule) as overdue_planned_amount,
      (select overdue_count from schedule) as overdue_installment_count,
      (select next_installment from schedule) as next_installment_number
    from category_cases
  `;

  return summarizeHilalExposureRow(categoryId, (rows[0] ?? {}) as ExposureRow);
}
