export type UnifiedEvidenceVerificationStatus =
  | 'PENDING'
  | 'VERIFIED'
  | 'REJECTED'
  | 'AMBIGUOUS';

export type UnifiedEvidenceVerificationInput = {
  claimedAmount: number | null;
  claimedDate: string | null;
  sourceAccountRef: string | null;
  externalReference: string | null;
  counterpartyRef: string | null;
  candidateCount: number;
};

export function evaluateUnifiedEvidenceVerification(
  input: UnifiedEvidenceVerificationInput,
): {
  status: UnifiedEvidenceVerificationStatus;
  reason:
    | 'EVIDENCE_FIELDS_INCOMPLETE'
    | 'UNIQUE_BANK_STATEMENT_MATCH'
    | 'NO_BANK_STATEMENT_MATCH'
    | 'MULTIPLE_BANK_STATEMENT_MATCHES';
} {
  const hasLocator = Boolean(input.externalReference || input.counterpartyRef);
  const complete =
    input.claimedAmount !== null
    && Boolean(input.claimedDate)
    && Boolean(input.sourceAccountRef)
    && hasLocator;

  if (!complete) {
    return { status: 'PENDING', reason: 'EVIDENCE_FIELDS_INCOMPLETE' };
  }
  if (input.candidateCount === 1) {
    return { status: 'VERIFIED', reason: 'UNIQUE_BANK_STATEMENT_MATCH' };
  }
  if (input.candidateCount > 1) {
    return { status: 'AMBIGUOUS', reason: 'MULTIPLE_BANK_STATEMENT_MATCHES' };
  }
  return { status: 'REJECTED', reason: 'NO_BANK_STATEMENT_MATCH' };
}
