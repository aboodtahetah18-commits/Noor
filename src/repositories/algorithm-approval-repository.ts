import { randomUUID } from 'node:crypto';
import { rawSql } from '@/infrastructure/db/client';

export type AlgorithmGovernanceDecision = 'APPROVED' | 'REJECTED';

export interface RecordAlgorithmDecisionInput {
  userId: string;
  proposalId: string;
  backtestRunId: string;
  decision: AlgorithmGovernanceDecision;
  rationale: string;
  decidedByActorUserId?: string | null;
}

export class AlgorithmApprovalRepository {
  async recordDecision(input: RecordAlgorithmDecisionInput): Promise<string> {
    const rationale = input.rationale.trim();
    if (!rationale) throw new Error('ALGORITHM_DECISION_RATIONALE_REQUIRED');
    const decisionId = randomUUID();

    const rows = input.decision === 'APPROVED'
      ? await rawSql`
          insert into public.algorithm_change_decisions
            (id,user_id,proposal_id,backtest_run_id,decision,rationale,decided_by_actor_user_id)
          select
            ${decisionId}::uuid,
            b.user_id,
            b.proposal_id,
            b.id,
            'APPROVED',
            ${rationale},
            ${input.decidedByActorUserId ?? null}::uuid
          from public.algorithm_backtest_runs b
          join public.algorithm_backtest_requests r
            on r.backtest_run_id=b.id
           and r.user_id=b.user_id
           and r.proposal_id=b.proposal_id
           and r.status='COMPLETED'
          where b.id=${input.backtestRunId}::uuid
            and b.user_id=${input.userId}::uuid
            and b.proposal_id=${input.proposalId}::uuid
            and b.outcome='PASSED'
          returning id::text as id
        `
      : await rawSql`
          insert into public.algorithm_change_decisions
            (id,user_id,proposal_id,backtest_run_id,decision,rationale,decided_by_actor_user_id)
          select
            ${decisionId}::uuid,
            b.user_id,
            b.proposal_id,
            b.id,
            'REJECTED',
            ${rationale},
            ${input.decidedByActorUserId ?? null}::uuid
          from public.algorithm_backtest_runs b
          join public.algorithm_backtest_requests r
            on r.backtest_run_id=b.id
           and r.user_id=b.user_id
           and r.proposal_id=b.proposal_id
           and r.status='COMPLETED'
          where b.id=${input.backtestRunId}::uuid
            and b.user_id=${input.userId}::uuid
            and b.proposal_id=${input.proposalId}::uuid
          returning id::text as id
        `;

    if (!rows[0]) {
      throw new Error(input.decision === 'APPROVED'
        ? 'ALGORITHM_APPROVAL_REQUIRES_PASSED_BACKTEST'
        : 'ALGORITHM_REJECTION_REQUIRES_COMPLETED_BACKTEST');
    }

    return String(rows[0].id);
  }
}

export const algorithmApprovalRepository = new AlgorithmApprovalRepository();
