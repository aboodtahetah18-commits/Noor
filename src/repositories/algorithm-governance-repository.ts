import { randomUUID } from 'node:crypto';
import { rawSql } from '@/infrastructure/db/client';
import type { GovernedReleaseArtifact, GovernedRollbackEvent } from '@/financial-engine/learning/governed-learning-governance';

export interface PersistReleaseInput {
  userId: string;
  proposalId: string;
  approvalDecisionId: string;
  target: string;
  version: string;
  previousVersion: string;
  artifact: GovernedReleaseArtifact;
}

export class AlgorithmGovernanceRepository {
  async releaseApprovedCandidate(input: PersistReleaseInput): Promise<string> {
    const releaseId = randomUUID();
    const artifactJson = JSON.stringify(input.artifact);

    const rows = await rawSql`
      insert into public.algorithm_releases
        (id,user_id,proposal_id,approval_decision_id,target,version,previous_version,artifact_json)
      select
        ${releaseId}::uuid,
        ${input.userId}::uuid,
        p.id,
        d.id,
        ${input.target},
        ${input.version},
        ${input.previousVersion},
        ${artifactJson}::jsonb
      from public.algorithm_change_proposals p
      join public.algorithm_change_decisions d
        on d.proposal_id=p.id
       and d.user_id=p.user_id
       and d.id=${input.approvalDecisionId}::uuid
       and d.decision='APPROVED'
      join public.algorithm_backtest_runs b
        on b.id=d.backtest_run_id
       and b.proposal_id=p.id
       and b.user_id=p.user_id
       and b.outcome='PASSED'
      where p.id=${input.proposalId}::uuid
        and p.user_id=${input.userId}::uuid
        and p.target=${input.target}
        and p.candidate_version=${input.version}
        and p.current_version=${input.previousVersion}
      returning id::text as id
    `;

    if (!rows[0]) throw new Error('ALGORITHM_RELEASE_GOVERNANCE_GATE_FAILED');
    return String(rows[0].id);
  }

  async rollbackRelease(userId: string, event: GovernedRollbackEvent): Promise<string> {
    const rollbackId = randomUUID();
    const rows = await rawSql`
      insert into public.algorithm_rollbacks
        (id,user_id,release_id,from_version,to_version,reason)
      select
        ${rollbackId}::uuid,
        r.user_id,
        r.id,
        r.version,
        r.previous_version,
        ${event.reason}
      from public.algorithm_releases r
      where r.id=${event.releaseId}::uuid
        and r.user_id=${userId}::uuid
        and r.version=${event.fromVersion}
        and r.previous_version=${event.toVersion}
      returning id::text as id
    `;

    if (!rows[0]) throw new Error('ALGORITHM_ROLLBACK_RELEASE_MISMATCH');
    return String(rows[0].id);
  }
}

export const algorithmGovernanceRepository = new AlgorithmGovernanceRepository();
