import { getRawSql } from '@/infrastructure/db/client';
import { evaluateUnifiedEvidenceVerification } from './evidence-verification-contract';

export async function verifyUnifiedEvidenceCase(userId: string, evidenceCaseId: string) {
  const sql = getRawSql();

  const evidenceRows = await sql`
    select
      ec.id::text,
      ec.execution_event_id::text,
      ec.claimed_amount::text as claimed_amount,
      ec.claimed_date::text as claimed_date,
      ec.source_account_ref,
      ec.counterparty_ref,
      ec.file_or_reference,
      ec.decision_reference,
      ee.execution_task_id::text as execution_task_id,
      ee.external_reference
    from public.evidence_cases ec
    join public.execution_events ee
      on ee.id=ec.execution_event_id and ee.user_id=ec.user_id
    where ec.id=${evidenceCaseId}::uuid
      and ec.user_id=${userId}::uuid
    limit 1
  `;

  const evidence = evidenceRows[0];
  if (!evidence) return null;

  const claimedAmount = evidence.claimed_amount == null ? null : Number(evidence.claimed_amount);
  const claimedDate = evidence.claimed_date == null
    ? null
    : String(evidence.claimed_date).slice(0, 10);
  const sourceAccountRef = evidence.source_account_ref == null ? null : String(evidence.source_account_ref);
  const externalReference = evidence.external_reference == null
    ? (evidence.file_or_reference == null ? null : String(evidence.file_or_reference))
    : String(evidence.external_reference);
  const counterpartyRef = evidence.counterparty_ref == null ? null : String(evidence.counterparty_ref);

  const readiness = evaluateUnifiedEvidenceVerification({
    claimedAmount,
    claimedDate,
    sourceAccountRef,
    externalReference,
    counterpartyRef,
    candidateCount: 0,
  });

  if (readiness.status === 'PENDING') {
    await sql`
      update public.evidence_cases
      set verification_status='PENDING',
          verification_reason=${readiness.reason},
          candidate_count=0
      where id=${evidenceCaseId}::uuid and user_id=${userId}::uuid
    `;
    return {
      evidenceCaseId,
      decisionReference: evidence.decision_reference == null ? null : String(evidence.decision_reference),
      status: readiness.status,
      reason: readiness.reason,
      candidateCount: 0,
      matchedStatementRowId: null,
    };
  }

  const locator = externalReference ?? counterpartyRef;
  const candidates = await sql`
    select
      r.id::text as row_id,
      r.transaction_date::text as transaction_date,
      r.amount::text as amount,
      a.id::text as account_id,
      a.name as account_name
    from public.bank_statement_rows r
    join public.bank_statement_imports i
      on i.id=r.import_id and i.user_id=r.user_id
    join public.accounts a
      on a.id=i.account_id and a.user_id=i.user_id
    where r.user_id=${userId}::uuid
      and i.status='APPROVED'
      and r.review_status in ('AUTO','CONFIRMED')
      and r.direction='DEBIT'
      and abs(r.amount-${claimedAmount}) < 0.01
      and r.transaction_date=${claimedDate}::date
      and (
        lower(a.name)=lower(${sourceAccountRef})
        or a.id::text=${sourceAccountRef}
        or lower(coalesce(a.iban,''))=lower(${sourceAccountRef})
        or lower(coalesce(a.account_number,''))=lower(${sourceAccountRef})
      )
      and (
        position(lower(${locator}) in lower(r.description)) > 0
        or position(lower(${locator}) in lower(coalesce(r.normalized_merchant,''))) > 0
      )
    order by r.created_at desc
    limit 5
  `;

  const result = evaluateUnifiedEvidenceVerification({
    claimedAmount,
    claimedDate,
    sourceAccountRef,
    externalReference,
    counterpartyRef,
    candidateCount: candidates.length,
  });

  const matchedStatementRowId = result.status === 'VERIFIED'
    ? String(candidates[0]?.row_id ?? '')
    : null;

  await sql`
    update public.evidence_cases
    set verification_status=${result.status},
        verification_reason=${result.reason},
        candidate_count=${candidates.length},
        matched_statement_row_id=${matchedStatementRowId},
        confidence=${result.status === 'VERIFIED' ? 1 : result.status === 'AMBIGUOUS' ? 0.5 : 0},
        reviewer_type='SYSTEM_BANK_STATEMENT',
        verified_at=${result.status === 'VERIFIED' ? new Date().toISOString() : null}
    where id=${evidenceCaseId}::uuid and user_id=${userId}::uuid
  `;

  const taskId = String(evidence.execution_task_id);
  const eventId = String(evidence.execution_event_id);

  if (result.status === 'VERIFIED') {
    await sql.transaction([
      sql`
        update public.execution_events
        set status='VERIFIED_EXECUTION',
            verified_amount=${claimedAmount},
            verified_at=now()
        where id=${eventId}::uuid and user_id=${userId}::uuid
      `,
      sql`
        update public.execution_tasks
        set status='VERIFIED_EXECUTION',updated_at=now()
        where id=${taskId}::uuid and user_id=${userId}::uuid
      `,
    ]);
  } else if (result.status === 'AMBIGUOUS') {
    await sql.transaction([
      sql`
        update public.execution_events
        set status='EVIDENCE_PENDING'
        where id=${eventId}::uuid and user_id=${userId}::uuid
      `,
      sql`
        update public.execution_tasks
        set status='EVIDENCE_PENDING',updated_at=now()
        where id=${taskId}::uuid and user_id=${userId}::uuid
      `,
    ]);
  } else {
    await sql.transaction([
      sql`
        update public.execution_events
        set status='EVIDENCE_REJECTED'
        where id=${eventId}::uuid and user_id=${userId}::uuid
      `,
      sql`
        update public.execution_tasks
        set status='WAITING_USER_CONFIRMATION',updated_at=now()
        where id=${taskId}::uuid and user_id=${userId}::uuid
      `,
    ]);
  }

  return {
    evidenceCaseId,
    decisionReference: evidence.decision_reference == null ? null : String(evidence.decision_reference),
    status: result.status,
    reason: result.reason,
    candidateCount: candidates.length,
    matchedStatementRowId,
  };
}
