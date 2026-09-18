import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';

export type HilalRestructuringEventType = 'REQUESTED' | 'APPROVED' | 'APPLIED' | 'REJECTED' | 'CANCELLED';

export type HilalRestructuringEventInput = {
  caseId: string;
  categoryId?: string | null;
  eventType: HilalRestructuringEventType;
  rootCause?: string | null;
  previousPlan?: Record<string, unknown> | null;
  proposedPlan?: Record<string, unknown> | null;
  evidence?: Record<string, unknown>;
  reason?: string | null;
};

export type HilalRestructuringSummary = {
  requested_count: number;
  approved_count: number;
  applied_count_total: number;
  max_applied_per_case: number;
  cases_at_precautionary_cap: number;
  rejected_count: number;
  cancelled_count: number;
  precautionary_cap: 3;
  precautionary_cap_reached: boolean;
  ledger_status: 'AVAILABLE' | 'MIGRATION_REQUIRED';
  policy_reference: 'HILAL_POLICY_1.0_SECTION_14';
};

function intValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

export function summarizeHilalRestructuringCounts(row: Record<string, unknown>): HilalRestructuringSummary {
  const appliedTotal = intValue(row.applied_count_total);
  const maxAppliedPerCase = intValue(row.max_applied_per_case);
  return {
    requested_count: intValue(row.requested_count),
    approved_count: intValue(row.approved_count),
    applied_count_total: appliedTotal,
    max_applied_per_case: maxAppliedPerCase,
    cases_at_precautionary_cap: intValue(row.cases_at_precautionary_cap),
    rejected_count: intValue(row.rejected_count),
    cancelled_count: intValue(row.cancelled_count),
    precautionary_cap: 3,
    precautionary_cap_reached: maxAppliedPerCase >= 3,
    ledger_status: 'AVAILABLE',
    policy_reference: 'HILAL_POLICY_1.0_SECTION_14',
  };
}

export async function getHilalRestructuringSummary(userId: string, categoryId: string): Promise<HilalRestructuringSummary> {
  const sql = getRawSql();
  const tableRows = await sql`select to_regclass('public.internal_funding_restructuring_events')::text as relation`;
  if (!tableRows[0]?.relation) {
    return {
      requested_count: 0,
      approved_count: 0,
      applied_count_total: 0,
      max_applied_per_case: 0,
      cases_at_precautionary_cap: 0,
      rejected_count: 0,
      cancelled_count: 0,
      precautionary_cap: 3,
      precautionary_cap_reached: false,
      ledger_status: 'MIGRATION_REQUIRED',
      policy_reference: 'HILAL_POLICY_1.0_SECTION_14',
    };
  }
  const rows = await sql`
    with category_events as (
      select e.*
      from public.internal_funding_restructuring_events e
      where e.user_id=${userId}
        and e.category_id=${categoryId}::uuid
    ),
    per_case as (
      select case_id,count(*) filter(where event_type='APPLIED')::int as applied_count
      from category_events
      group by case_id
    )
    select
      (select count(*) filter(where event_type='REQUESTED') from category_events)::int as requested_count,
      (select count(*) filter(where event_type='APPROVED') from category_events)::int as approved_count,
      (select count(*) filter(where event_type='APPLIED') from category_events)::int as applied_count_total,
      (select count(*) filter(where event_type='REJECTED') from category_events)::int as rejected_count,
      (select count(*) filter(where event_type='CANCELLED') from category_events)::int as cancelled_count,
      coalesce((select max(applied_count) from per_case),0)::int as max_applied_per_case,
      coalesce((select count(*) from per_case where applied_count>=3),0)::int as cases_at_precautionary_cap
  `;
  return summarizeHilalRestructuringCounts((rows[0] ?? {}) as Record<string, unknown>);
}

export async function recordHilalRestructuringEvent(userId: string, input: HilalRestructuringEventInput) {
  const sql = getRawSql();
  const tableRows = await sql`select to_regclass('public.internal_funding_restructuring_events')::text as relation`;
  if (!tableRows[0]?.relation) throw new Error('HILAL_RESTRUCTURING_LEDGER_MIGRATION_REQUIRED');

  if (input.eventType === 'APPLIED') {
    const countRows = await sql`
      select count(*)::int as applied_count
      from public.internal_funding_restructuring_events
      where user_id=${userId}
        and case_id=${input.caseId}::uuid
        and event_type='APPLIED'
    `;
    const appliedCount = intValue(countRows[0]?.applied_count);
    if (appliedCount >= 3) {
      throw new Error('HILAL_RESTRUCTURING_PRECAUTIONARY_CAP_REACHED');
    }
  }

  const rows = await sql`
    insert into public.internal_funding_restructuring_events(
      id,user_id,case_id,category_id,event_type,root_cause,previous_plan,proposed_plan,evidence,reason
    )
    select
      ${randomUUID()},${userId},c.id,${input.categoryId ?? null}::uuid,${input.eventType},
      ${input.rootCause ?? null},
      ${input.previousPlan ? JSON.stringify(input.previousPlan) : null}::jsonb,
      ${input.proposedPlan ? JSON.stringify(input.proposedPlan) : null}::jsonb,
      ${JSON.stringify(input.evidence ?? {})}::jsonb,
      ${input.reason ?? null}
    from public.internal_funding_cases c
    where c.id=${input.caseId}::uuid and c.user_id=${userId}
      and (
        ${input.categoryId ?? null}::uuid is null
        or c.target_category_id=${input.categoryId ?? null}::uuid
      )
    returning id,event_type,created_at
  `;

  if (!rows[0]) throw new Error('HILAL_RESTRUCTURING_CASE_PRECONDITION_FAILED');
  return rows[0];
}
