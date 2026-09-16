import type { ParameterEnvelope } from './governed-learning';
import { routeBankLearning, type BankLearningRoute } from './bank-learning-routing';
import {
  buildLearningEvidenceFromOutcome,
  evaluateDecisionOutcomeLifecycle,
  type DecisionOutcomeGate,
  type DecisionOutcomeLifecycleInput,
} from './decision-outcome-lifecycle';

export interface ProcessDecisionOutcomeLearningInput extends DecisionOutcomeLifecycleInput {
  bankKey: string;
  distinctBankCount?: number;
  centralTransferEligible?: boolean;
  envelope?: ParameterEnvelope;
}

export type ProcessDecisionOutcomeLearningResult =
  | { status: 'BLOCKED'; gate: DecisionOutcomeGate; route: null }
  | { status: 'ROUTED'; gate: DecisionOutcomeGate; route: BankLearningRoute };

/**
 * Single governed entrypoint from completed decision outcomes into adaptive learning.
 * No bank route is evaluated before execution/evidence/monitoring/outcome/settlement/review gates pass.
 */
export function processDecisionOutcomeLearning(
  input: ProcessDecisionOutcomeLearningInput,
): ProcessDecisionOutcomeLearningResult {
  const gate = evaluateDecisionOutcomeLifecycle(input);
  if (!gate.eligibleForLearning) return { status: 'BLOCKED', gate, route: null };

  const evidence = buildLearningEvidenceFromOutcome(input);
  const route = routeBankLearning(
    {
      ...evidence,
      bankKey: input.bankKey,
      distinctBankCount: input.distinctBankCount,
      centralTransferEligible: input.centralTransferEligible,
    },
    input.envelope,
  );

  return { status: 'ROUTED', gate, route };
}
