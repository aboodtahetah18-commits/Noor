import {
  routeBankLearning,
  type BankLearningEvidence,
  type BankLearningRoute,
  type ParameterEnvelope,
} from '@/financial-engine';

export interface ProcessBankOutcomeLearningInput {
  evidence: BankLearningEvidence;
  envelope?: ParameterEnvelope;
}

/**
 * Application-layer entry point for feeding a bank outcome into the governed learning engine.
 * This function produces routing/learning decisions only. It does not execute a financial action,
 * mutate live weights, or bypass proposal/backtest/approval/release governance.
 */
export function processBankOutcomeLearning(input: ProcessBankOutcomeLearningInput): BankLearningRoute {
  return routeBankLearning(input.evidence, input.envelope);
}
