export type UnifiedEvidenceVerificationStatus =
  | 'PENDING_MATCH'
  | 'FINAL_MATCHED'
  | 'REVIEW_REQUIRED'
  | 'RECONCILIATION_REQUIRED';

export type UnifiedEvidenceStateMachineId =
  | 'حالة-تنفيذ-٣٦'
  | 'حالة-مطابقة-٣٧'
  | 'حالة-مطابقة-٣٨';

export type UnifiedEvidenceVerificationInput = {
  completeEvidence: boolean;
  candidateCount: number;
  matchConfidence: number | null;
  autoMatchThreshold: number;
  hasMaterialDifference: boolean;
};

export function evaluateUnifiedEvidenceVerification(
  input: UnifiedEvidenceVerificationInput,
): {
  status: UnifiedEvidenceVerificationStatus;
  state_machine_id: UnifiedEvidenceStateMachineId;
  reason:
    | 'EVIDENCE_FIELDS_INCOMPLETE'
    | 'BANK_MATCH_NOT_AVAILABLE_YET'
    | 'MATCH_CONFIDENCE_NOT_AVAILABLE'
    | 'MATCH_CONFIDENCE_BELOW_THRESHOLD'
    | 'UNIQUE_BANK_STATEMENT_MATCH'
    | 'MULTIPLE_BANK_STATEMENT_MATCHES'
    | 'MATERIAL_DIFFERENCE_REQUIRES_RECONCILIATION';
} {
  if (!input.completeEvidence) {
    return {
      status: 'PENDING_MATCH',
      state_machine_id: 'حالة-تنفيذ-٣٦',
      reason: 'EVIDENCE_FIELDS_INCOMPLETE',
    };
  }

  if (input.hasMaterialDifference) {
    return {
      status: 'RECONCILIATION_REQUIRED',
      state_machine_id: 'حالة-مطابقة-٣٨',
      reason: 'MATERIAL_DIFFERENCE_REQUIRES_RECONCILIATION',
    };
  }

  if (input.candidateCount === 0) {
    return {
      status: 'PENDING_MATCH',
      state_machine_id: 'حالة-تنفيذ-٣٦',
      reason: 'BANK_MATCH_NOT_AVAILABLE_YET',
    };
  }

  if (input.candidateCount > 1) {
    return {
      status: 'REVIEW_REQUIRED',
      state_machine_id: 'حالة-تنفيذ-٣٦',
      reason: 'MULTIPLE_BANK_STATEMENT_MATCHES',
    };
  }

  if (input.matchConfidence === null) {
    return {
      status: 'REVIEW_REQUIRED',
      state_machine_id: 'حالة-تنفيذ-٣٦',
      reason: 'MATCH_CONFIDENCE_NOT_AVAILABLE',
    };
  }

  if (input.matchConfidence <= input.autoMatchThreshold) {
    return {
      status: 'REVIEW_REQUIRED',
      state_machine_id: 'حالة-تنفيذ-٣٦',
      reason: 'MATCH_CONFIDENCE_BELOW_THRESHOLD',
    };
  }

  return {
    status: 'FINAL_MATCHED',
    state_machine_id: 'حالة-مطابقة-٣٧',
    reason: 'UNIQUE_BANK_STATEMENT_MATCH',
  };
}
