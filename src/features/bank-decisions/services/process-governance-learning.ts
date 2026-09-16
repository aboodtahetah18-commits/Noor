import {
  buildLearningEvidenceFromOutcome,
  evaluateDecisionOutcomeLifecycle,
  routeBankLearning,
  type BankLearningRoute,
  type ParameterEnvelope,
} from '@/financial-engine';
import {
  getGovernanceLearningSnapshot,
  type GovernanceLearningSnapshot,
} from '@/repositories/governance-learning-repository';

export interface GovernanceLearningProcessResult {
  status: 'NOT_FOUND' | 'BLOCKED' | 'ROUTED';
  blockers: string[];
  route?: BankLearningRoute;
}

/** Pure routing step used after the snapshot has been read from the server-owned governance contract. */
export function routeGovernanceLearningSnapshot(
  snapshot: GovernanceLearningSnapshot,
  envelope?: ParameterEnvelope,
): GovernanceLearningProcessResult {
  const gate = evaluateDecisionOutcomeLifecycle(snapshot.lifecycle);
  if (!gate.eligibleForLearning) {
    return { status: 'BLOCKED', blockers: gate.blockers };
  }

  const evidence = buildLearningEvidenceFromOutcome(snapshot.lifecycle);
  const route = routeBankLearning({
    ...evidence,
    bankKey: snapshot.bankKey,
    centralTransferEligible: snapshot.centralTransferEligible,
    distinctBankCount: snapshot.distinctBankCount,
  }, envelope);

  return { status: 'ROUTED', blockers: [], route };
}

/**
 * Production entry point. Lifecycle and routing metadata come from the governance DB contract,
 * not from request payloads. The optional envelope must be supplied by trusted server configuration.
 */
export async function processGovernanceLearning(
  userId: string,
  caseId: string,
  envelope?: ParameterEnvelope,
): Promise<GovernanceLearningProcessResult> {
  const snapshot = await getGovernanceLearningSnapshot(userId, caseId);
  if (!snapshot) return { status: 'NOT_FOUND', blockers: ['GOVERNANCE_CASE_NOT_FOUND'] };
  return routeGovernanceLearningSnapshot(snapshot, envelope);
}
