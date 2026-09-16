import { randomUUID } from 'node:crypto';
import { PILOT_2026 } from '@/config/pilot-2026';
import { rawSql } from '@/infrastructure/db/client';
import { FinancialPlatformError, databaseErrorText } from '@/features/financial-engine/services/financial-platform-error';
import { getPilotAlgorithmChangeProposals } from '@/features/pilot/queries/get-pilot-change-proposals';

function mapGovernanceError(error: unknown): never {
  if (error instanceof FinancialPlatformError) throw error;
  const message = databaseErrorText(error);
  if (message.includes('duplicate key value')) throw new FinancialPlatformError('GOVERNANCE_RECORD_CONFLICT', 409);
  if (message.includes('APPROVED decision requires a backtest')) throw new FinancialPlatformError('BACKTEST_REQUIRED', 409);
  if (message.includes('APPROVED decision requires a PASSED backtest')) throw new FinancialPlatformError('PASSED_BACKTEST_REQUIRED', 409);
  if (message.includes('release requires')) throw new FinancialPlatformError('RELEASE_GUARD_BLOCKED', 409);
  throw new FinancialPlatformError('ALGORITHM_GOVERNANCE_WRITE_FAILED', 500);
}

export async function createAlgorithmChangeProposal(input: {
  userId: string;
  reviewItemId: string;
  candidateVersion: string;
  specText: string;
  acceptanceCriteriaText: string;
  rollbackPlanText: string;
}) {
  try {
    const derived = await getPilotAlgorithmChangeProposals(input.userId, PILOT_2026.startsAt, PILOT_2026.endsAt);
    const source = derived.find((item) => item.reviewItemId === input.reviewItemId);
    if (!source) throw new FinancialPlatformError('REVIEW_ITEM_NOT_FOUND', 404);
    if (source.stage === 'EVIDENCE_COLLECTION') throw new FinancialPlatformError('REVIEW_ITEM_NOT_READY', 409);
    if (input.candidateVersion === source.currentVersion) throw new FinancialPlatformError('CANDIDATE_VERSION_MUST_DIFFER', 422);

    const id = randomUUID();
    await rawSql`
      insert into public.algorithm_change_proposals (
        id, user_id, review_item_id, dimension_key, target, current_version, candidate_version,
        title, rationale, spec_json, acceptance_criteria_json, rollback_plan_json
      ) values (
        ${id}::uuid,
        ${input.userId}::uuid,
        ${source.reviewItemId},
        ${source.dimensionKey},
        ${source.target},
        ${source.currentVersion},
        ${input.candidateVersion},
        ${source.title},
        ${source.rationale},
        ${JSON.stringify({ text: input.specText })}::jsonb,
        ${JSON.stringify({ text: input.acceptanceCriteriaText })}::jsonb,
        ${JSON.stringify({ text: input.rollbackPlanText })}::jsonb
      )
    `;
    return { proposalId: id };
  } catch (error) {
    return mapGovernanceError(error);
  }
}

export async function recordAlgorithmBacktest(input: {
  userId: string;
  proposalId: string;
  datasetStartsAt: string;
  datasetEndsAt: string;
  outcome: 'PASSED' | 'FAILED' | 'INCONCLUSIVE';
  metricsText: string;
  evidenceText: string;
  notes?: string | null;
}) {
  try {
    const id = randomUUID();
    const rows = await rawSql`
      insert into public.algorithm_backtest_runs (
        id, user_id, proposal_id, baseline_version, candidate_version,
        dataset_starts_at, dataset_ends_at, outcome, metrics_json, evidence_json, notes, completed_at
      )
      select
        ${id}::uuid,
        p.user_id,
        p.id,
        p.current_version,
        p.candidate_version,
        ${input.datasetStartsAt}::date,
        ${input.datasetEndsAt}::date,
        ${input.outcome},
        ${JSON.stringify({ text: input.metricsText })}::jsonb,
        ${JSON.stringify({ text: input.evidenceText })}::jsonb,
        ${input.notes ?? null},
        now()
      from public.algorithm_change_proposals p
      where p.id = ${input.proposalId}::uuid and p.user_id = ${input.userId}::uuid
      returning id::text
    `;
    if (!rows[0]?.id) throw new FinancialPlatformError('GOVERNANCE_PROPOSAL_NOT_FOUND', 404);
    return { backtestRunId: id };
  } catch (error) {
    return mapGovernanceError(error);
  }
}

export async function recordAlgorithmChangeDecision(input: {
  userId: string;
  proposalId: string;
  backtestRunId?: string | null;
  decision: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
  rationale: string;
}) {
  try {
    const id = randomUUID();
    const rows = await rawSql`
      insert into public.algorithm_change_decisions (
        id, user_id, proposal_id, backtest_run_id, decision, rationale
      )
      select
        ${id}::uuid,
        p.user_id,
        p.id,
        ${input.backtestRunId ?? null}::uuid,
        ${input.decision},
        ${input.rationale}
      from public.algorithm_change_proposals p
      where p.id = ${input.proposalId}::uuid and p.user_id = ${input.userId}::uuid
      returning id::text
    `;
    if (!rows[0]?.id) throw new FinancialPlatformError('GOVERNANCE_PROPOSAL_NOT_FOUND', 404);
    return { decisionId: id };
  } catch (error) {
    return mapGovernanceError(error);
  }
}
