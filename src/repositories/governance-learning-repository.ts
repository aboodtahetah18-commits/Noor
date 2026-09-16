import { getGovernanceCaseContract, type GovernanceCaseContract } from './governance-case-repository';
import type { CauseClassification, VersionBundle } from '@/financial-engine/learning/governed-learning';
import type { DecisionOutcomeLifecycleInput } from '@/financial-engine/learning/decision-outcome-lifecycle';

const CAUSES = new Set<CauseClassification>([
  'ESTIMATION_ERROR',
  'DATA_ERROR',
  'USER_BEHAVIOR_VARIANCE',
  'EXECUTION_VARIANCE',
  'EXTERNAL_SHOCK',
  'POLICY_GAP',
  'ALGORITHM_GAP',
  'MODEL_CALIBRATION_ERROR',
  'ASSUMPTION_FAILURE',
  'NO_MATERIAL_ERROR',
]);

export interface GovernanceLearningSnapshot {
  lifecycle: DecisionOutcomeLifecycleInput;
  bankKey: string;
  centralTransferEligible: boolean;
  distinctBankCount: number;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function finiteNumber(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function requiredText(value: unknown, code: string): string {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(code);
  return text;
}

function versionsFrom(payload: Record<string, unknown>): VersionBundle {
  const learning = record(payload.learningContext);
  const versions = record(learning.versions);
  return {
    policyVersion: requiredText(versions.policyVersion, 'LEARNING_POLICY_VERSION_REQUIRED'),
    algorithmVersion: requiredText(versions.algorithmVersion, 'LEARNING_ALGORITHM_VERSION_REQUIRED'),
    modelVersion: requiredText(versions.modelVersion, 'LEARNING_MODEL_VERSION_REQUIRED'),
    parameterVersion: requiredText(versions.parameterVersion, 'LEARNING_PARAMETER_VERSION_REQUIRED'),
  };
}

export function governanceContractToLearningInput(contract: GovernanceCaseContract): DecisionOutcomeLifecycleInput {
  if (!contract.decisionId) throw new Error('GOVERNANCE_DECISION_REQUIRED_FOR_LEARNING');
  const learning = record(contract.apiPayload.learningContext);
  const causeRaw = String(learning.cause ?? '').trim().toUpperCase();
  const cause = CAUSES.has(causeRaw as CauseClassification) ? causeRaw as CauseClassification : undefined;
  const sampleCountRaw = finiteNumber(learning.sampleCount);
  const confidenceRaw = finiteNumber(learning.evidenceConfidence);

  return {
    caseId: contract.caseId,
    decisionId: contract.decisionId,
    userDecisionStatus: contract.userDecisionStatus,
    executionTaskStatus: contract.executionTaskStatus,
    latestExecutionStatus: contract.latestExecutionStatus,
    pendingEvidenceCount: contract.pendingEvidenceCount,
    matchedEvidenceCount: contract.matchedEvidenceCount,
    monitoringStatus: contract.monitoringStatus,
    outcomeStatus: contract.outcomeStatus,
    settlementStatus: contract.settlementStatus,
    learningReviewStatus: contract.learningReviewStatus,
    expectedValue: finiteNumber(learning.expectedValue),
    actualValue: finiteNumber(learning.actualValue),
    sampleCount: sampleCountRaw == null ? 0 : Math.max(0, Math.trunc(sampleCountRaw)),
    evidenceConfidence: confidenceRaw == null ? Number.NaN : confidenceRaw,
    cause,
    versions: versionsFrom(contract.apiPayload),
  };
}

export function governanceContractToLearningSnapshot(contract: GovernanceCaseContract): GovernanceLearningSnapshot {
  const learning = record(contract.apiPayload.learningContext);
  const distinctBankCount = Math.max(1, Math.trunc(finiteNumber(learning.distinctBankCount) ?? 1));
  return {
    lifecycle: governanceContractToLearningInput(contract),
    bankKey: requiredText(learning.bankKey, 'LEARNING_BANK_KEY_REQUIRED'),
    centralTransferEligible: learning.centralTransferEligible === true,
    distinctBankCount,
  };
}

/** Reads the server-owned governance contract. Caller input cannot override lifecycle or routing state. */
export async function getGovernanceLearningSnapshot(userId: string, caseId: string): Promise<GovernanceLearningSnapshot | null> {
  const contract = await getGovernanceCaseContract(userId, caseId);
  return contract ? governanceContractToLearningSnapshot(contract) : null;
}

export async function getGovernanceLearningInput(userId: string, caseId: string): Promise<DecisionOutcomeLifecycleInput | null> {
  const snapshot = await getGovernanceLearningSnapshot(userId, caseId);
  return snapshot?.lifecycle ?? null;
}
