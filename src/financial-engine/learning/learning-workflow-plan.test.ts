import { describe, expect, it } from 'vitest';
import type { BankLearningRoute } from './bank-learning-routing';
import { planLearningWorkflow } from './learning-workflow-plan';

function route(scope: BankLearningRoute['scope'], action: BankLearningRoute['decision']['action']): BankLearningRoute {
  return {
    bankKey: 'SOLVENCY',
    scope,
    centralTransferBlocked: scope !== 'CENTRAL_SHARED_CANDIDATE',
    reasons: ['test'],
    decision: { action, reason: 'test' },
  } as BankLearningRoute;
}

describe('learning workflow planning', () => {
  it('records excluded evidence without proposal or backtest', () => {
    const plan = planLearningWorkflow(route('EXCLUDED', 'EXCLUDE_FROM_LEARNING'));
    expect(plan.actions).toEqual(['RECORD_REVIEW_ONLY']);
    expect(plan.requiresProposal).toBe(false);
  });

  it('routes structural gaps to governance proposal without inventing a backtest result', () => {
    const plan = planLearningWorkflow(route('GOVERNANCE_PROPOSAL', 'CHANGE_PROPOSAL_REQUIRED'));
    expect(plan.actions).toContain('CREATE_CHANGE_PROPOSAL');
    expect(plan.requiresBacktest).toBe(false);
  });

  it('creates proposal and backtest request for bounded local calibration', () => {
    const plan = planLearningWorkflow(route('BANK_LOCAL', 'BOUNDED_CALIBRATION_CANDIDATE'));
    expect(plan.actions).toEqual(['RECORD_REVIEW_ONLY', 'CREATE_CHANGE_PROPOSAL', 'CREATE_BACKTEST_REQUEST']);
    expect(plan.reviewStatus).toBe('AWAITING_BACKTEST');
  });

  it('treats central shared calibration as candidate only and still requires backtest', () => {
    const plan = planLearningWorkflow(route('CENTRAL_SHARED_CANDIDATE', 'BOUNDED_CALIBRATION_CANDIDATE'));
    expect(plan.requiresProposal).toBe(true);
    expect(plan.requiresBacktest).toBe(true);
  });
});
