import { describe, expect, it } from 'vitest';
import { evaluateUnifiedEvidenceVerification } from '@/features/financial-engine/services/evidence-verification-contract';

describe('central-registry evidence verification contract', () => {
  it('keeps incomplete evidence pending bank matching', () => {
    expect(evaluateUnifiedEvidenceVerification({
      completeEvidence: false,
      candidateCount: 0,
      matchConfidence: null,
      autoMatchThreshold: 95,
      hasMaterialDifference: false,
      accountingClassificationReady: true,
    })).toMatchObject({
      status: 'PENDING_MATCH',
      state_machine_id: 'حالة-تنفيذ-٣٦',
      storage_status: 'PENDING',
      reason: 'EVIDENCE_FIELDS_INCOMPLETE',
    });
  });

  it('does not reject complete evidence only because the bank match has not appeared yet', () => {
    expect(evaluateUnifiedEvidenceVerification({
      completeEvidence: true,
      candidateCount: 0,
      matchConfidence: null,
      autoMatchThreshold: 95,
      hasMaterialDifference: false,
      accountingClassificationReady: true,
    })).toMatchObject({
      status: 'PENDING_MATCH',
      storage_status: 'PENDING',
      reason: 'BANK_MATCH_NOT_AVAILABLE_YET',
    });
  });

  it('opens reconciliation when an unexplained material difference exists', () => {
    expect(evaluateUnifiedEvidenceVerification({
      completeEvidence: true,
      candidateCount: 0,
      matchConfidence: null,
      autoMatchThreshold: 95,
      hasMaterialDifference: true,
      accountingClassificationReady: false,
    })).toMatchObject({
      status: 'RECONCILIATION_REQUIRED',
      state_machine_id: 'حالة-مطابقة-٣٨',
      storage_status: 'MISMATCH',
      reason: 'MATERIAL_DIFFERENCE_REQUIRES_RECONCILIATION',
    });
  });

  it('sends multiple matching candidates to review', () => {
    expect(evaluateUnifiedEvidenceVerification({
      completeEvidence: true,
      candidateCount: 2,
      matchConfidence: 99,
      autoMatchThreshold: 95,
      hasMaterialDifference: false,
      accountingClassificationReady: true,
    })).toMatchObject({
      status: 'REVIEW_REQUIRED',
      storage_status: 'NEEDS_CLARIFICATION',
      reason: 'MULTIPLE_BANK_STATEMENT_MATCHES',
    });
  });

  it('does not auto-close a unique match without governed confidence', () => {
    expect(evaluateUnifiedEvidenceVerification({
      completeEvidence: true,
      candidateCount: 1,
      matchConfidence: null,
      autoMatchThreshold: 95,
      hasMaterialDifference: false,
      accountingClassificationReady: true,
    })).toMatchObject({
      status: 'REVIEW_REQUIRED',
      reason: 'MATCH_CONFIDENCE_NOT_AVAILABLE',
    });
  });

  it('keeps a strong bank match under review until accounting classification is ready', () => {
    expect(evaluateUnifiedEvidenceVerification({
      completeEvidence: true,
      candidateCount: 1,
      matchConfidence: 99,
      autoMatchThreshold: 95,
      hasMaterialDifference: false,
      accountingClassificationReady: false,
    })).toMatchObject({
      status: 'REVIEW_REQUIRED',
      storage_status: 'NEEDS_CLARIFICATION',
      reason: 'ACCOUNTING_CLASSIFICATION_REQUIRED',
    });
  });

  it('requires confidence to exceed the configured threshold, not merely equal it', () => {
    expect(evaluateUnifiedEvidenceVerification({
      completeEvidence: true,
      candidateCount: 1,
      matchConfidence: 95,
      autoMatchThreshold: 95,
      hasMaterialDifference: false,
      accountingClassificationReady: true,
    }).status).toBe('REVIEW_REQUIRED');

    expect(evaluateUnifiedEvidenceVerification({
      completeEvidence: true,
      candidateCount: 1,
      matchConfidence: 96,
      autoMatchThreshold: 95,
      hasMaterialDifference: false,
      accountingClassificationReady: true,
    })).toMatchObject({
      status: 'FINAL_MATCHED',
      state_machine_id: 'حالة-مطابقة-٣٧',
      storage_status: 'MATCHED',
      reason: 'UNIQUE_BANK_STATEMENT_MATCH',
    });
  });
});
