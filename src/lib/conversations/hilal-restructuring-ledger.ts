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
  applied_count: number;
  rejected_count: number;
  cancelled_count: number;
  precautionary_cap: 3;
  precautionary_cap_reached: boolean;
  remaining_precautionary_slots: number;
  policy_reference: 'HILAL_POLICY_1.0_SECTION_14';
};

function intValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

export function summarizeHilalRestructuringCounts(row: Record<string, unknown>): HilalRestructuringSummary {
  const applied = intValue(row.applied_count);
  return {
    requested_count: intValue(row.requested_count),
    approved_count: intValue(row.approved_count),
    applied_count: applied,
    rejected_count: intValue(row.rejected_count),
    cancelled_count: intValue(row.cancelled_count),
    precautionary_cap: 3,
    precautionary_cap_reached: applied >= 3,
    remaining_precautionary_slots: Math.max(3 - applied, 0),
    policy_reference: 'HILAL_POLICY_1.0_SECTION_14',
  };
}

export async function getHilalRestructuringSummary(userId: string, categoryId: string): Promise<HilalRestructuringSummary> {
  const sql = getRawSql();
  const rows = await sql`
    select
      count(*) filter(where e.event_type='REQUESTED')::int as requested_count,
      count(*) filter(where e.event_type='APPROVED')::int as approved_count,
      count(*) filter(where e.event_type='APPLIED')::int as applied_count,
      count(*) filter(where e.event_type='REJECTED')::int as rejected_count,
      count(*) filter(where e.event_type='CANCELLED')::int as cancelled_count
    from public.internal_funding_restructuring_events e
    where e.user_id=${userId}
      and e.category_id=${categoryId}::uuid
  `;
  return summarizeHilalRestructuringCounts((rows[0] ?? {}) as Record<string, unknown>);
}

export async function recordHilalRestructuringEvent(userId: string, input: HilalRestructuringEventInput) {
  const sql = getRawSql();

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
