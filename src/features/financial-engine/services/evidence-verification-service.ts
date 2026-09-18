import { getRawSql } from '@/infrastructure/db/client';
import { getCentralPolicyNumericParameter } from './central-policy-parameters';
import { evaluateUnifiedEvidenceVerification } from './evidence-verification-contract';
import { enqueueCycleRecalcForMatchedTransaction } from './enqueue-matched-execution-recalc';

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
      ec.confidence::text as match_confidence,
      ec.reviewer_type,
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
  const sourceAccountRef = evidence.source_account_ref == null
    ? null
    : String(evidence.source_account_ref);
  const externalReference = evidence.external_reference == null
    ? (evidence.file_or_reference == null ? null : String(evidence.file_or_reference))
    : String(evidence.external_reference);
  const counterpartyRef = evidence.counterparty_ref == null
    ? null
    : String(evidence.counterparty_ref);
  const locator = externalReference ?? counterpartyRef;
  const completeEvidence = (
    claimedAmount !== null
    && Boolean(claimedDate)
    && Boolean(sourceAccountRef)
    && Boolean(locator)
  );

  const [dateTolerance, autoMatchThreshold] = await Promise.all([
    getCentralPolicyNumericParameter('SET-RC-001'),
    getCentralPolicyNumericParameter('SET-RC-002'),
  ]);

  if (!completeEvidence) {
    const pending = evaluateUnifiedEvidenceVerification({
      completeEvidence: false,
      candidateCount: 0,
      matchConfidence: null,
      autoMatchThreshold: autoMatchThreshold.value,
      hasMaterialDifference: false,
      accountingClassificationReady: false,
    });
    await sql`
      update public.evidence_cases
      set verification_status=${pending.storage_status},
          verification_reason=${pending.reason},
          candidate_count=0,
          matched_statement_row_id=null,
          reviewer_type=coalesce(reviewer_type,'SYSTEM_BANK_STATEMENT'),
          verified_at=null
      where id=${evidenceCaseId}::uuid and user_id=${userId}::uuid
    `;
    return {
      evidenceCaseId,
      decisionReference: evidence.decision_reference == null ? null : String(evidence.decision_reference),
      ...pending,
      candidateCount: 0,
      matchedStatementRowId: null,
      recalculation,
    policySnapshot: {
        dateTolerance: { id: 'SET-RC-001', ...dateTolerance },
        autoMatchThreshold: { id: 'SET-RC-002', ...autoMatchThreshold },
      },
    };
  }

  const candidates = await sql`
    select
      r.id::text as row_id,
      r.transaction_date::text as transaction_date,
      r.amount::text as amount,
      r.description,
      a.id::text as account_id,
      a.name as account_name,
      a.iban,
      a.account_number,
      r.final_transaction_id::text as final_transaction_id,
      (
        lower(a.name)=lower(${sourceAccountRef})
        or a.id::text=${sourceAccountRef}
        or lower(coalesce(a.iban,''))=lower(${sourceAccountRef})
        or lower(coalesce(a.account_number,''))=lower(${sourceAccountRef})
      ) as account_matches
    from public.bank_statement_rows r
    join public.bank_statement_imports i
      on i.id=r.import_id and i.user_id=r.user_id
    join public.accounts a
      on a.id=i.account_id and a.user_id=i.user_id
    where r.user_id=${userId}::uuid
      and i.status='APPROVED'
      and r.review_status in ('AUTO','CONFIRMED')
      and r.direction='DEBIT'
      and abs(r.transaction_date-${claimedDate}::date) <= ${dateTolerance.value}
      and (
        position(lower(${locator}) in lower(r.description)) > 0
        or position(lower(${locator}) in lower(coalesce(r.normalized_merchant,''))) > 0
      )
    order by abs(r.transaction_date-${claimedDate}::date),r.created_at desc
    limit 10
  `;

  const exactCandidates = candidates.filter((row) =>
    row.account_matches === true
    && Math.abs(Number(row.amount ?? 0) - (claimedAmount ?? 0)) < 0.01,
  );
  const hasMaterialDifference = candidates.length > 0 && exactCandidates.length === 0;

  const existingConfidence = evidence.match_confidence == null
    ? null
    : Number(evidence.match_confidence);
  const matchConfidence = (
    evidence.reviewer_type === 'APPROVED_MATCH_ENGINE'
    && Number.isFinite(existingConfidence)
  ) ? existingConfidence : null;

  const classifiedTransactionId = exactCandidates.length === 1 && exactCandidates[0]?.final_transaction_id
    ? String(exactCandidates[0].final_transaction_id)
    : null;

  const result = evaluateUnifiedEvidenceVerification({
    completeEvidence: true,
    candidateCount: exactCandidates.length,
    matchConfidence,
    autoMatchThreshold: autoMatchThreshold.value,
    hasMaterialDifference,
    accountingClassificationReady: Boolean(classifiedTransactionId),
  });

  const matchedStatementRowId = result.status === 'FINAL_MATCHED'
    ? String(exactCandidates[0]?.row_id ?? '')
    : null;

  await sql`
    update public.evidence_cases
    set verification_status=${result.storage_status},
        verification_reason=${result.reason},
        candidate_count=${hasMaterialDifference ? candidates.length : exactCandidates.length},
        matched_statement_row_id=${matchedStatementRowId},
        reviewer_type=coalesce(reviewer_type,'SYSTEM_BANK_STATEMENT'),
        verified_at=${result.status === 'FINAL_MATCHED' ? new Date().toISOString() : null}
    where id=${evidenceCaseId}::uuid and user_id=${userId}::uuid
  `;

  const taskId = String(evidence.execution_task_id);
  const eventId = String(evidence.execution_event_id);

  let recalculation: Awaited<ReturnType<typeof enqueueCycleRecalcForMatchedTransaction>> | null = null;

  if (result.status === 'FINAL_MATCHED') {
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
    if (classifiedTransactionId) {
      recalculation = await enqueueCycleRecalcForMatchedTransaction({
        userId,
        executionEventId: eventId,
        transactionId: classifiedTransactionId,
      });
    }
  } else if (result.status === 'RECONCILIATION_REQUIRED') {
    await sql.transaction([
      sql`
        update public.execution_events
        set status='DISPUTED'
        where id=${eventId}::uuid and user_id=${userId}::uuid
      `,
      sql`
        update public.execution_tasks
        set status='RECONCILIATION',updated_at=now()
        where id=${taskId}::uuid and user_id=${userId}::uuid
      `,
    ]);
  } else {
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
  }

  return {
    evidenceCaseId,
    decisionReference: evidence.decision_reference == null ? null : String(evidence.decision_reference),
    ...result,
    candidateCount: hasMaterialDifference ? candidates.length : exactCandidates.length,
    matchedStatementRowId,
    policySnapshot: {
      dateTolerance: { id: 'SET-RC-001', ...dateTolerance },
      autoMatchThreshold: { id: 'SET-RC-002', ...autoMatchThreshold },
    },
  };
}
