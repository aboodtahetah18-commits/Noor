import type { BankLearningRoute } from './bank-learning-routing';

export type LearningWorkflowAction =
  | 'RECORD_REVIEW_ONLY'
  | 'CREATE_CHANGE_PROPOSAL'
  | 'CREATE_BACKTEST_REQUEST';

export interface LearningWorkflowPlan {
  actions: LearningWorkflowAction[];
  requiresProposal: boolean;
  requiresBacktest: boolean;
  reviewStatus: 'RECORDED' | 'AWAITING_GOVERNANCE' | 'AWAITING_BACKTEST';
  reasons: string[];
}

export function planLearningWorkflow(route: BankLearningRoute): LearningWorkflowPlan {
  const reasons = [...route.reasons];

  if (route.scope === 'EXCLUDED' || route.scope === 'USER_ONLY' || route.scope === 'STRESS_ONLY' || route.scope === 'VALIDATION_ONLY') {
    return {
      actions: ['RECORD_REVIEW_ONLY'],
      requiresProposal: false,
      requiresBacktest: false,
      reviewStatus: 'RECORDED',
      reasons,
    };
  }

  if (route.scope === 'GOVERNANCE_PROPOSAL') {
    return {
      actions: ['RECORD_REVIEW_ONLY', 'CREATE_CHANGE_PROPOSAL'],
      requiresProposal: true,
      requiresBacktest: false,
      reviewStatus: 'AWAITING_GOVERNANCE',
      reasons,
    };
  }

  if (route.scope === 'BANK_LOCAL' || route.scope === 'CENTRAL_SHARED_CANDIDATE') {
    const needsBacktest = route.decision.action === 'BOUNDED_CALIBRATION_CANDIDATE';
    return {
      actions: needsBacktest
        ? ['RECORD_REVIEW_ONLY', 'CREATE_CHANGE_PROPOSAL', 'CREATE_BACKTEST_REQUEST']
        : ['RECORD_REVIEW_ONLY'],
      requiresProposal: needsBacktest,
      requiresBacktest: needsBacktest,
      reviewStatus: needsBacktest ? 'AWAITING_BACKTEST' : 'RECORDED',
      reasons,
    };
  }

  return {
    actions: ['RECORD_REVIEW_ONLY'],
    requiresProposal: false,
    requiresBacktest: false,
    reviewStatus: 'RECORDED',
    reasons,
  };
}
