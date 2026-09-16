import {
  planLearningWorkflow,
  type ParameterEnvelope,
} from '@/financial-engine';
import { getGovernanceLearningSnapshot } from '@/repositories/governance-learning-repository';
import { learningWorkflowRepository } from '@/repositories/learning-workflow-repository';
import { routeGovernanceLearningSnapshot } from './process-governance-learning';

export interface RunGovernedLearningWorkflowInput {
  userId: string;
  caseId: string;
  target: string;
  currentVersion: string;
  candidateVersion: string;
  envelope?: ParameterEnvelope;
}

export type RunGovernedLearningWorkflowResult =
  | { status: 'NOT_FOUND' | 'BLOCKED'; blockers: string[] }
  | {
      status: 'PERSISTED';
      reviewId: string;
      proposalId: string | null;
      backtestRequestId: string | null;
      scope: string;
    };

/**
 * Production workflow entry point. All lifecycle evidence and transfer metadata are read
 * from the server-owned governance snapshot. The caller supplies only trusted release
 * configuration (target/version/envelope); no client-supplied evidence can bypass gates.
 */
export async function runGovernedLearningWorkflow(
  input: RunGovernedLearningWorkflowInput,
): Promise<RunGovernedLearningWorkflowResult> {
  const snapshot = await getGovernanceLearningSnapshot(input.userId, input.caseId);
  if (!snapshot) return { status: 'NOT_FOUND', blockers: ['GOVERNANCE_CASE_NOT_FOUND'] };

  const routed = routeGovernanceLearningSnapshot(snapshot, input.envelope);
  if (routed.status !== 'ROUTED' || !routed.route) {
    return { status: 'BLOCKED', blockers: routed.blockers };
  }

  const plan = planLearningWorkflow(routed.route);
  const persisted = await learningWorkflowRepository.persist({
    userId: input.userId,
    snapshot,
    route: routed.route,
    plan,
    target: input.target,
    currentVersion: input.currentVersion,
    candidateVersion: input.candidateVersion,
  });

  return {
    status: 'PERSISTED',
    ...persisted,
    scope: routed.route.scope,
  };
}
