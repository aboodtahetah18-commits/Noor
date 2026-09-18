import { describe, expect, it } from 'vitest';
import { evaluateUnifiedEvidenceVerification } from '@/features/financial-engine/services/evidence-verification-contract';

describe('unified evidence verification contract', () => {
  it('keeps incomplete evidence pending', () => {
    expect(evaluateUnifiedEvidenceVerification({
      claimedAmount: 500,
      claimedDate: null,
      sourceAccountRef: 'acc-1',
      externalReference: 'REF-1',
      counterpartyRef: null,
      candidateCount: 0,
    })).toEqual({
      status: 'PENDING',
      reason: 'EVIDENCE_FIELDS_INCOMPLETE',
    });
  });

  it('verifies exactly one approved statement match', () => {
    expect(evaluateUnifiedEvidenceVerification({
      claimedAmount: 500,
      claimedDate: '2026-09-18',
      sourceAccountRef: 'acc-1',
      externalReference: 'REF-1',
      counterpartyRef: null,
      candidateCount: 1,
    })).toEqual({
      status: 'VERIFIED',
      reason: 'UNIQUE_BANK_STATEMENT_MATCH',
    });
  });

  it('marks multiple matches as ambiguous', () => {
    expect(evaluateUnifiedEvidenceVerification({
      claimedAmount: 500,
      claimedDate: '2026-09-18',
      sourceAccountRef: 'acc-1',
      externalReference: 'REF-1',
      counterpartyRef: null,
      candidateCount: 2,
    }).status).toBe('AMBIGUOUS');
  });

  it('rejects complete evidence with no approved statement match', () => {
    expect(evaluateUnifiedEvidenceVerification({
      claimedAmount: 500,
      claimedDate: '2026-09-18',
      sourceAccountRef: 'acc-1',
      externalReference: null,
      counterpartyRef: 'merchant-1',
      candidateCount: 0,
    }).status).toBe('REJECTED');
  });
});
