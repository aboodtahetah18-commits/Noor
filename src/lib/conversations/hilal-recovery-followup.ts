import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import { getHilalPolicyCapEvidence } from './hilal-policy-cap';
import { evaluateHilalPolicyCapGovernance } from './hilal-policy-cap-governance';
import { getHilalRepaymentCapacity } from './hilal-repayment-capacity';
import { governedRooms } from './store';

export type HilalRecoveryFollowupTrigger = 'PAYMENT_RECORDED' | 'DAILY_OVERDUE_REVIEW';

type BaselineState = {
  monthly_net_income_confirmed?: number;
  recurring_core_obligations_total?: number;
};

export type HilalRecoveryFollowupSnapshot = {
  case_id: string;
  case_title: string;
  category_id: string;
  category_name: string;
  trigger: HilalRecoveryFollowupTrigger;
  outstanding_exposure: number;
  overdue_installment_count: number;
  overdue_planned_amount: number;
  financing_frequency: number;
  repayment_capacity: number | null;
  policy_cap: number | null;
  policy_cap_status: string;
  hard_stop: boolean;
  hard_stop_reason: string | null;
  refreshed_at: string;
};

async function readBaseline(userId: string): Promise<BaselineState> {
  const sql = getRawSql();
  const rows = await sql`
    select metadata
    from public.conversation_threads
    where user_id=${userId} and room_key='central'
    limit 1
  `;
  const metadata = rows[0]?.metadata && typeof rows[0].metadata === 'object'
    ? rows[0].metadata as Record<string, unknown>
    : {};
  return metadata.financial_baseline && typeof metadata.financial_baseline === 'object'
    ? metadata.financial_baseline as BaselineState
    : {};
}

export function hasMeaningfulHilalRecoveryChange(previous: Record<string, unknown> | null, next: HilalRecoveryFollowupSnapshot) {
  if (!previous) return true;
  return Number(previous.outstanding_exposure ?? -1) !== next.outstanding_exposure
    || Number(previous.overdue_installment_count ?? -1) !== next.overdue_installment_count
    || Number(previous.overdue_planned_amount ?? -1) !== next.overdue_planned_amount
    || Boolean(previous.hard_stop) !== next.hard_stop
    || String(previous.policy_cap_status ?? '') !== next.policy_cap_status;
}

export async function refreshHilalRecoveryGovernance(
  userId: string,
  caseId: string,
  trigger: HilalRecoveryFollowupTrigger,
) {
  const sql = getRawSql();
  const caseRows = await sql`
    select c.id::text,c.title,c.target_category_id::text as category_id,bc.name as category_name
    from public.internal_funding_cases c
    join public.budget_categories bc on bc.id=c.target_category_id and bc.user_id=c.user_id
    where c.user_id=${userId} and c.id=${caseId}::uuid
    limit 1
  `;
  const fundingCase = caseRows[0];
  if (!fundingCase?.category_id || !fundingCase?.category_name) return null;

  const baseline = await readBaseline(userId);
  const monthlyIncome = typeof baseline.monthly_net_income_confirmed === 'number'
    ? baseline.monthly_net_income_confirmed
    : 0;
  const coreObligations = typeof baseline.recurring_core_obligations_total === 'number'
    ? baseline.recurring_core_obligations_total
    : 0;

  const [policyEvidence, repaymentCapacity] = await Promise.all([
    getHilalPolicyCapEvidence(userId, String(fundingCase.category_name)),
    getHilalRepaymentCapacity(userId, {
      confirmedMonthlyIncome: monthlyIncome,
      recurringCoreObligations: coreObligations,
    }),
  ]);

  const governance = evaluateHilalPolicyCapGovernance({
    plannedAmount: policyEvidence.planned_amount_current_cycle,
    actualSpend: policyEvidence.actual_spend_current_cycle,
    historicalAverageSpend: policyEvidence.historical_average_spend,
    realizedIncome: repaymentCapacity.realized_salary_income,
    isEssential: policyEvidence.is_essential,
    expenseNatureDefault: policyEvidence.expense_nature_default,
    exposure: policyEvidence.exposure_profile,
  });

  const exposure = policyEvidence.exposure_profile;
  const snapshot: HilalRecoveryFollowupSnapshot = {
    case_id: String(fundingCase.id),
    case_title: String(fundingCase.title),
    category_id: String(fundingCase.category_id),
    category_name: String(fundingCase.category_name),
    trigger,
    outstanding_exposure: exposure?.outstanding_exposure ?? 0,
    overdue_installment_count: exposure?.overdue_installment_count ?? 0,
    overdue_planned_amount: exposure?.overdue_planned_amount ?? 0,
    financing_frequency: exposure?.total_case_count ?? 0,
    repayment_capacity: repaymentCapacity.repayment_capacity,
    policy_cap: governance.policy_cap,
    policy_cap_status: governance.status,
    hard_stop: governance.hard_stop,
    hard_stop_reason: governance.hard_stop_reason,
    refreshed_at: new Date().toISOString(),
  };

  const threadRows = await sql`
    select id,metadata
    from public.conversation_threads
    where user_id=${userId} and room_key='hilal'
    limit 1
  `;
  const thread = threadRows[0];
  if (!thread?.id) return snapshot;

  const metadata = thread.metadata && typeof thread.metadata === 'object'
    ? thread.metadata as Record<string, unknown>
    : {};
  const recoveryFollowup = metadata.recovery_followup && typeof metadata.recovery_followup === 'object'
    ? metadata.recovery_followup as Record<string, unknown>
    : {};
  const byCase = recoveryFollowup.by_case && typeof recoveryFollowup.by_case === 'object'
    ? recoveryFollowup.by_case as Record<string, unknown>
    : {};
  const previous = byCase[caseId] && typeof byCase[caseId] === 'object'
    ? byCase[caseId] as Record<string, unknown>
    : null;
  const changed = hasMeaningfulHilalRecoveryChange(previous, snapshot);

  const nextMetadata = {
    ...metadata,
    recovery_followup: {
      ...recoveryFollowup,
      by_case: {
        ...byCase,
        [caseId]: snapshot,
      },
      updated_at: snapshot.refreshed_at,
    },
  };

  const statements = [
    sql`update public.conversation_threads
      set metadata=${JSON.stringify(nextMetadata)}::jsonb,updated_at=now()
      where id=${String(thread.id)}::uuid and user_id=${userId}`,
  ];

  if (changed) {
    const participant = governedRooms.hilal.participants[0] ?? { key: 'hilal-agent', name: governedRooms.hilal.title };
    const body = snapshot.hard_stop
      ? `تحديث متابعة بنك الهلال: يوجد ${snapshot.overdue_installment_count} استرداد متأخر بقيمة ${snapshot.overdue_planned_amount.toFixed(2)} ريال. تم تفعيل إيقاف التمويل الجديد لهذا الملف حتى معالجة التأخر. التعرض القائم الآن ${snapshot.outstanding_exposure.toFixed(2)} ريال.`
      : `تحديث متابعة بنك الهلال: أعيد حساب التعرض بعد ${trigger === 'PAYMENT_RECORDED' ? 'تسجيل السداد' : 'المراجعة الدورية'}. التعرض القائم الآن ${snapshot.outstanding_exposure.toFixed(2)} ريال، ولا يوجد إيقاف بسبب تأخر حالي.`;
    statements.push(sql`insert into public.conversation_messages(
      id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
    ) values(
      ${randomUUID()},${String(thread.id)}::uuid,${userId},'agent',${participant.key},${participant.name},'risk',
      ${body},${JSON.stringify({
        recovery_followup: snapshot,
        execution_boundary: 'advisory_only',
      })}::jsonb
    )`);
  }

  await sql.transaction(statements);
  return snapshot;
}

export async function runHilalRecoveryFollowupJob() {
  const sql = getRawSql();
  const rows = await sql`
    select distinct c.user_id::text as user_id,c.id::text as case_id
    from public.internal_funding_cases c
    join public.internal_funding_recovery_schedule rs
      on rs.user_id=c.user_id and rs.case_id=c.id
    left join public.financial_cycles fc
      on fc.id=rs.cycle_id and fc.user_id=rs.user_id
    where c.status='RECOVERY'
      and rs.status='PLANNED'
      and fc.expected_next_income_date < current_date
    order by c.user_id::text,c.id::text
  `;

  const results: Array<{ userId: string; caseId: string; status: 'SUCCESS' | 'FAILED'; errorCode: string | null }> = [];
  for (const row of rows) {
    const userId = String(row.user_id);
    const caseId = String(row.case_id);
    try {
      await refreshHilalRecoveryGovernance(userId, caseId, 'DAILY_OVERDUE_REVIEW');
      results.push({ userId, caseId, status: 'SUCCESS', errorCode: null });
    } catch (error) {
      results.push({
        userId,
        caseId,
        status: 'FAILED',
        errorCode: (error instanceof Error ? error.message : 'HILAL_RECOVERY_FOLLOWUP_FAILED').slice(0, 120),
      });
    }
  }
  return results;
}
