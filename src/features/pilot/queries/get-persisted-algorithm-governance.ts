import { rawSql } from '@/infrastructure/db/client';

export type PersistedAlgorithmGovernanceRow = {
  proposalId: string;
  title: string;
  dimensionKey: string;
  target: string;
  currentVersion: string;
  candidateVersion: string;
  createdAt: string;
  backtestOutcome: string | null;
  backtestCompletedAt: string | null;
  decision: string | null;
  decidedAt: string | null;
  releasedVersion: string | null;
  releasedAt: string | null;
  rollbackToVersion: string | null;
  rolledBackAt: string | null;
  lifecycleStage: 'SPEC_RECORDED' | 'BACKTESTED' | 'DECIDED' | 'RELEASED' | 'ROLLED_BACK';
};

export type PersistedAlgorithmGovernanceResult = {
  storageReady: boolean;
  rows: PersistedAlgorithmGovernanceRow[];
};

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export async function getPersistedAlgorithmGovernance(userId: string): Promise<PersistedAlgorithmGovernanceResult> {
  const existence = await rawSql`
    select to_regclass('public.algorithm_change_proposals')::text as table_name
  `;
  if (!existence[0]?.table_name) return { storageReady: false, rows: [] };

  const rows = await rawSql`
    select
      p.id::text as proposal_id,
      p.title,
      p.dimension_key,
      p.target,
      p.current_version,
      p.candidate_version,
      p.created_at::text as created_at,
      b.outcome as backtest_outcome,
      b.completed_at::text as backtest_completed_at,
      d.decision,
      d.decided_at::text as decided_at,
      r.version as released_version,
      r.released_at::text as released_at,
      rb.to_version as rollback_to_version,
      rb.created_at::text as rolled_back_at
    from public.algorithm_change_proposals p
    left join lateral (
      select outcome, completed_at
      from public.algorithm_backtest_runs
      where proposal_id = p.id and user_id = p.user_id
      order by completed_at desc, created_at desc
      limit 1
    ) b on true
    left join lateral (
      select decision, decided_at
      from public.algorithm_change_decisions
      where proposal_id = p.id and user_id = p.user_id
      order by decided_at desc
      limit 1
    ) d on true
    left join lateral (
      select id, version, released_at
      from public.algorithm_releases
      where proposal_id = p.id and user_id = p.user_id
      order by released_at desc
      limit 1
    ) r on true
    left join lateral (
      select to_version, created_at
      from public.algorithm_rollbacks
      where release_id = r.id and user_id = p.user_id
      order by created_at desc
      limit 1
    ) rb on true
    where p.user_id = ${userId}
    order by p.created_at desc
  `;

  return {
    storageReady: true,
    rows: rows.flatMap((row) => {
      const proposalId = text(row.proposal_id);
      const title = text(row.title);
      const dimensionKey = text(row.dimension_key);
      const target = text(row.target);
      const currentVersion = text(row.current_version);
      const candidateVersion = text(row.candidate_version);
      const createdAt = text(row.created_at);
      if (!proposalId || !title || !dimensionKey || !target || !currentVersion || !candidateVersion || !createdAt) return [];

      const rolledBackAt = text(row.rolled_back_at);
      const releasedAt = text(row.released_at);
      const decidedAt = text(row.decided_at);
      const backtestCompletedAt = text(row.backtest_completed_at);
      const lifecycleStage: PersistedAlgorithmGovernanceRow['lifecycleStage'] = rolledBackAt
        ? 'ROLLED_BACK'
        : releasedAt
          ? 'RELEASED'
          : decidedAt
            ? 'DECIDED'
            : backtestCompletedAt
              ? 'BACKTESTED'
              : 'SPEC_RECORDED';

      return [{
        proposalId,
        title,
        dimensionKey,
        target,
        currentVersion,
        candidateVersion,
        createdAt,
        backtestOutcome: text(row.backtest_outcome),
        backtestCompletedAt,
        decision: text(row.decision),
        decidedAt,
        releasedVersion: text(row.released_version),
        releasedAt,
        rollbackToVersion: text(row.rollback_to_version),
        rolledBackAt,
        lifecycleStage,
      }];
    }),
  };
}
