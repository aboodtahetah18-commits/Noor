import { evaluateLearning, type LearningDecision, type LearningEvidence, type ParameterEnvelope } from './governed-learning';

export type BankLearningScope =
  | 'EXCLUDED'
  | 'USER_ONLY'
  | 'BANK_LOCAL'
  | 'CENTRAL_SHARED_CANDIDATE'
  | 'STRESS_ONLY'
  | 'GOVERNANCE_PROPOSAL'
  | 'VALIDATION_ONLY';

export interface BankLearningEvidence extends LearningEvidence {
  /** Stable internal bank identifier, not a display name. */
  bankKey: string;
  /** Number of distinct governed bank domains carrying materially comparable evidence. */
  distinctBankCount?: number;
  /** Explicit governance flag; absence means evidence must remain bank-local. */
  centralTransferEligible?: boolean;
}

export interface BankLearningRoute {
  bankKey: string;
  scope: BankLearningScope;
  decision: LearningDecision;
  centralTransferBlocked: boolean;
  reasons: string[];
}

const MIN_DISTINCT_BANKS_FOR_CENTRAL_CANDIDATE = 3;

function assertBankKey(bankKey: string): string {
  const normalized = bankKey.trim();
  if (!normalized) throw new Error('BANK_LEARNING_BANK_KEY_REQUIRED');
  return normalized;
}

/**
 * Routes bank outcome evidence without ever promoting it directly to a live central rule.
 * A shared result is only a CENTRAL_SHARED_CANDIDATE and must still pass its own backtest,
 * approval and governed release flow.
 */
export function routeBankLearning(
  evidence: BankLearningEvidence,
  envelope?: ParameterEnvelope,
): BankLearningRoute {
  const bankKey = assertBankKey(evidence.bankKey);
  const decision = evaluateLearning(evidence, envelope);
  const reasons = [decision.reason];

  switch (decision.action) {
    case 'EXCLUDE_FROM_LEARNING':
      return { bankKey, scope: 'EXCLUDED', decision, centralTransferBlocked: true, reasons };
    case 'USER_PROFILE_UPDATE_CANDIDATE':
      return {
        bankKey,
        scope: 'USER_ONLY',
        decision,
        centralTransferBlocked: true,
        reasons: [...reasons, 'User-behavior evidence is never generalized into a cross-bank rule.'],
      };
    case 'STRESS_SCENARIO_ONLY':
      return {
        bankKey,
        scope: 'STRESS_ONLY',
        decision,
        centralTransferBlocked: true,
        reasons: [...reasons, 'Stress evidence may enrich scenarios but cannot recalibrate the central baseline.'],
      };
    case 'CHANGE_PROPOSAL_REQUIRED':
      return {
        bankKey,
        scope: 'GOVERNANCE_PROPOSAL',
        decision,
        centralTransferBlocked: true,
        reasons: [...reasons, 'Structural policy or algorithm changes require explicit governance review.'],
      };
    case 'NO_CHANGE':
      return { bankKey, scope: 'VALIDATION_ONLY', decision, centralTransferBlocked: true, reasons };
    case 'ASSUMPTION_RELIABILITY_UPDATE':
      return {
        bankKey,
        scope: 'BANK_LOCAL',
        decision,
        centralTransferBlocked: true,
        reasons: [...reasons, 'Assumption reliability remains local until independently validated across governed bank domains.'],
      };
    case 'BOUNDED_CALIBRATION_CANDIDATE':
      break;
  }

  const distinctBankCount = Math.max(1, Math.trunc(evidence.distinctBankCount ?? 1));
  if (!evidence.centralTransferEligible) {
    return {
      bankKey,
      scope: 'BANK_LOCAL',
      decision,
      centralTransferBlocked: true,
      reasons: [...reasons, 'Central transfer was not explicitly authorized for this evidence class.'],
    };
  }
  if (distinctBankCount < MIN_DISTINCT_BANKS_FOR_CENTRAL_CANDIDATE) {
    return {
      bankKey,
      scope: 'BANK_LOCAL',
      decision,
      centralTransferBlocked: true,
      reasons: [
        ...reasons,
        `Central transfer requires comparable evidence from at least ${MIN_DISTINCT_BANKS_FOR_CENTRAL_CANDIDATE} distinct bank domains.`,
      ],
    };
  }

  return {
    bankKey,
    scope: 'CENTRAL_SHARED_CANDIDATE',
    decision,
    centralTransferBlocked: false,
    reasons: [
      ...reasons,
      'Evidence is eligible only as a central shared candidate; it still requires independent central backtest, approval and release.',
    ],
  };
}
