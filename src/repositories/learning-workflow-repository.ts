import { randomUUID } from 'node:crypto';
import { rawSql } from '@/infrastructure/db/client';
import type { GovernanceLearningSnapshot } from './governance-learning-repository';
import type { BankLearningRoute, LearningWorkflowPlan } from '@/financial-engine';

export interface PersistLearningWorkflowInput {
  userId: string;
  snapshot: GovernanceLearningSnapshot;
  route: BankLearningRoute;
  plan: LearningWorkflowPlan;
  target: string;
  currentVersion: string;
  candidateVersion: string;
}

export interface PersistedLearningWorkflow {
  reviewId: string;
  proposalId: string | null;
  backtestRequestId: string | null;
}

export class LearningWorkflowRepository {
  async persist(input: PersistLearningWorkflowInput): Promise<PersistedLearningWorkflow> {
    const reviewId = randomUUID();
    const proposalId = input.plan.requiresProposal ? randomUUID() : null;
    const backtestRequestId = input.plan.requiresBacktest ? randomUUID() : null;
    const candidate = input.route.decision.candidate;
    const spec = {
      bankKey: input.snapshot.bankKey,
      scope: input.route.scope,
      action: input.route.decision.action,
      candidate,
      sourceVersions: input.snapshot.lifecycle.versions,
    };

    await rawSql.begin(async (sql) => {
      await sql`
        insert into public.algorithm_learning_reviews
          (id,user_id,case_id,decision_id,bank_key,learning_scope,learning_action,cause,lifecycle_json,route_json,status,proposal_id)
        values (
          ${reviewId}::uuid,
          ${input.userId}::uuid,
          ${input.snapshot.lifecycle.caseId}::uuid,
          ${input.snapshot.lifecycle.decisionId}::uuid,
          ${input.snapshot.bankKey},
          ${input.route.scope},
          ${input.route.decision.action},
          ${String(input.snapshot.lifecycle.cause)},
          ${JSON.stringify(input.snapshot.lifecycle)}::jsonb,
          ${JSON.stringify(input.route)}::jsonb,
          ${input.plan.reviewStatus},
          ${proposalId}::uuid
        )
      `;

      if (proposalId) {
        await sql`
          insert into public.algorithm_change_proposals
            (id,user_id,review_item_id,dimension_key,target,current_version,candidate_version,title,rationale,spec_json,acceptance_criteria_json,rollback_plan_json)
          values (
            ${proposalId}::uuid,
            ${input.userId}::uuid,
            ${reviewId},
            ${candidate?.parameter ?? 'STRUCTURAL_CHANGE'},
            ${input.target},
            ${input.currentVersion},
            ${input.candidateVersion},
            ${`Learning proposal: ${input.snapshot.bankKey}`},
            ${input.route.reasons.join(' | ')},
            ${JSON.stringify(spec)}::jsonb,
            ${JSON.stringify({ backtestRequired: input.plan.requiresBacktest, approvalRequired: true })}::jsonb,
            ${JSON.stringify({ mode: 'GOVERNED_REGISTRY_ONLY', restoreVersion: input.currentVersion })}::jsonb
          )
        `;
      }

      if (backtestRequestId && proposalId) {
        await sql`
          insert into public.algorithm_backtest_requests
            (id,user_id,proposal_id,review_id,baseline_version,candidate_version,status,request_json)
          values (
            ${backtestRequestId}::uuid,
            ${input.userId}::uuid,
            ${proposalId}::uuid,
            ${reviewId}::uuid,
            ${input.currentVersion},
            ${input.candidateVersion},
            'PENDING',
            ${JSON.stringify({ target: input.target, scope: input.route.scope, candidate, evidence: input.snapshot.lifecycle })}::jsonb
          )
        `;
      }
    });

    return { reviewId, proposalId, backtestRequestId };
  }
}

export const learningWorkflowRepository = new LearningWorkflowRepository();
