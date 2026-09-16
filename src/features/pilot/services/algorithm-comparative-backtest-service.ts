import { randomUUID } from 'node:crypto';
import { rawSql } from '@/infrastructure/db/client';
import { FinancialPlatformError, databaseErrorText } from '@/features/financial-engine/services/financial-platform-error';
import {
  CURRENT_STATE_THRESHOLDS,
  STATE_RANK,
  classifyScore,
  scoreWithWeights,
  validateCandidateThresholds,
  validateCandidateWeights,
  type BacktestComponents,
  type CandidateThresholds,
  type CandidateWeights,
  type FinancialState,
} from '@/features/pilot/services/algorithm-backtest-math';

export type ComparativeBacktestAcceptance = {
  minSampleCount: number;
  maxStateDowngradeRatePct: number;
  maxMeanAbsoluteScoreDelta: number;
};

type Assessment = {
  id: string;
  cycleId: string;
  weightedScore: number;
  finalState: FinancialState;
  hardGateCode: string | null;
  components: BacktestComponents;
};

type Proposal = {
  id: string;
  target: 'POLICY' | 'WEIGHTS' | 'THRESHOLDS' | 'ENGINE_LOGIC' | 'MEASUREMENT_CONTRACT';
  currentVersion: string;
  candidateVersion: string;
};

function numberOrNull(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function requiredNumber(value: unknown): number {
  const parsed = numberOrNull(value);
  if (parsed == null) throw new FinancialPlatformError('INVALID_BACKTEST_DATA', 500);
  return parsed;
}

function financialState(value: unknown): FinancialState {
  if (value === 'CRITICAL' || value === 'VULNERABLE' || value === 'BALANCED' || value === 'STABLE' || value === 'STRONG') {
    return value;
  }
  throw new FinancialPlatformError('INVALID_HISTORICAL_FINANCIAL_STATE', 500);
}

function mapDatabaseError(error: unknown): never {
  if (error instanceof FinancialPlatformError) throw error;
  const message = databaseErrorText(error);
  if (message.includes('duplicate key value')) throw new FinancialPlatformError('GOVERNANCE_RECORD_CONFLICT', 409);
  throw new FinancialPlatformError('COMPARATIVE_BACKTEST_FAILED', 500);
}

async function getProposal(userId: string, proposalId: string): Promise<Proposal> {
  const rows = await rawSql`
    select id::text, target, current_version, candidate_version
    from public.algorithm_change_proposals
    where id = ${proposalId}::uuid and user_id = ${userId}::uuid
    limit 1
  `;
  const row = rows[0];
  if (!row?.id) throw new FinancialPlatformError('GOVERNANCE_PROPOSAL_NOT_FOUND', 404);
  return {
    id: String(row.id),
    target: String(row.target) as Proposal['target'],
    currentVersion: String(row.current_version),
    candidateVersion: String(row.candidate_version),
  };
}

async function getAssessments(userId: string, startsAt: string, endsAt: string): Promise<Assessment[]> {
  const rows = await rawSql`
    select
      id::text,
      cycle_id::text,
      weighted_score,
      final_state,
      hard_gate_code,
      essentials_score,
      cash_liquidity_score,
      reserve_emergency_score,
      debt_score,
      income_shock_score,
      spending_flexibility_score,
      asset_liquidity_score,
      execution_discipline_score,
      goals_score,
      investment_concentration_score
    from public.cycle_financial_score_assessments
    where user_id = ${userId}::uuid
      and assessed_at >= ${startsAt}::date
      and assessed_at < (${endsAt}::date + interval '1 day')
    order by assessed_at asc, id asc
  `;

  return rows.map((row) => ({
    id: String(row.id),
    cycleId: String(row.cycle_id),
    weightedScore: requiredNumber(row.weighted_score),
    finalState: financialState(row.final_state),
    hardGateCode: typeof row.hard_gate_code === 'string' ? row.hard_gate_code : null,
    components: {
      essentials: numberOrNull(row.essentials_score),
      cashLiquidity: numberOrNull(row.cash_liquidity_score),
      reserveEmergency: numberOrNull(row.reserve_emergency_score),
      debt: numberOrNull(row.debt_score),
      incomeShock: numberOrNull(row.income_shock_score),
      spendingFlexibility: numberOrNull(row.spending_flexibility_score),
      assetLiquidity: numberOrNull(row.asset_liquidity_score),
      executionDiscipline: numberOrNull(row.execution_discipline_score),
      goals: numberOrNull(row.goals_score),
      investmentConcentration: numberOrNull(row.investment_concentration_score),
    },
  }));
}

function percentage(part: number, total: number): number {
  return total <= 0 ? 0 : (part / total) * 100;
}

export async function runComparativeBacktest(input: {
  userId: string;
  proposalId: string;
  datasetStartsAt: string;
  datasetEndsAt: string;
  candidateWeights?: CandidateWeights;
  candidateThresholds?: CandidateThresholds;
  acceptance: ComparativeBacktestAcceptance;
}) {
  try {
    const proposal = await getProposal(input.userId, input.proposalId);
    if (proposal.target !== 'WEIGHTS' && proposal.target !== 'THRESHOLDS') {
      throw new FinancialPlatformError('AUTOMATED_BACKTEST_NOT_SUPPORTED_FOR_TARGET', 409);
    }

    if (proposal.target === 'WEIGHTS') {
      if (!input.candidateWeights) throw new FinancialPlatformError('CANDIDATE_WEIGHTS_REQUIRED', 422);
      validateCandidateWeights(input.candidateWeights);
    } else {
      if (!input.candidateThresholds) throw new FinancialPlatformError('CANDIDATE_THRESHOLDS_REQUIRED', 422);
      validateCandidateThresholds(input.candidateThresholds);
    }

    const assessments = await getAssessments(input.userId, input.datasetStartsAt, input.datasetEndsAt);
    const replayRows = assessments.flatMap((assessment) => {
      let candidateScore = assessment.weightedScore;
      if (proposal.target === 'WEIGHTS') {
        const recomputed = scoreWithWeights(assessment.components, input.candidateWeights as CandidateWeights);
        if (recomputed == null) return [];
        candidateScore = recomputed;
      }

      const thresholds = proposal.target === 'THRESHOLDS'
        ? input.candidateThresholds as CandidateThresholds
        : CURRENT_STATE_THRESHOLDS;
      const candidateState = assessment.hardGateCode
        ? assessment.finalState
        : classifyScore(candidateScore, thresholds);

      return [{
        assessmentId: assessment.id,
        cycleId: assessment.cycleId,
        baselineScore: assessment.weightedScore,
        candidateScore,
        baselineState: assessment.finalState,
        candidateState,
        hardGateCode: assessment.hardGateCode,
      }];
    });

    const sampleCount = replayRows.length;
    const downgradeCount = replayRows.filter((row) => STATE_RANK[row.candidateState] < STATE_RANK[row.baselineState]).length;
    const upgradeCount = replayRows.filter((row) => STATE_RANK[row.candidateState] > STATE_RANK[row.baselineState]).length;
    const changedStateCount = downgradeCount + upgradeCount;
    const hardGateMismatchCount = replayRows.filter((row) => row.hardGateCode && row.candidateState !== row.baselineState).length;
    const meanAbsoluteScoreDelta = sampleCount > 0
      ? replayRows.reduce((sum, row) => sum + Math.abs(row.candidateScore - row.baselineScore), 0) / sampleCount
      : 0;
    const downgradeRatePct = percentage(downgradeCount, sampleCount);

    const enoughSamples = sampleCount >= input.acceptance.minSampleCount;
    const passesGuardrails = enoughSamples
      && downgradeRatePct <= input.acceptance.maxStateDowngradeRatePct
      && meanAbsoluteScoreDelta <= input.acceptance.maxMeanAbsoluteScoreDelta
      && hardGateMismatchCount === 0;
    const outcome: 'PASSED' | 'FAILED' | 'INCONCLUSIVE' = !enoughSamples
      ? 'INCONCLUSIVE'
      : passesGuardrails
        ? 'PASSED'
        : 'FAILED';

    const metrics = {
      contractVersion: 'comparative-backtest-v1',
      sampleCount,
      changedStateCount,
      upgradeCount,
      downgradeCount,
      downgradeRatePct,
      hardGateMismatchCount,
      meanAbsoluteScoreDelta,
      acceptance: input.acceptance,
    };
    const evidence = {
      proposalTarget: proposal.target,
      currentVersion: proposal.currentVersion,
      candidateVersion: proposal.candidateVersion,
      candidateWeights: input.candidateWeights ?? null,
      candidateThresholds: input.candidateThresholds ?? null,
      baselineStateThresholds: CURRENT_STATE_THRESHOLDS,
      replayRows,
      note: 'Historical replay is observational. A passing replay does not prove future performance or causality.',
    };

    const id = randomUUID();
    await rawSql`
      insert into public.algorithm_backtest_runs (
        id, user_id, proposal_id, baseline_version, candidate_version,
        dataset_starts_at, dataset_ends_at, outcome, metrics_json, evidence_json, notes, completed_at
      ) values (
        ${id}::uuid,
        ${input.userId}::uuid,
        ${proposal.id}::uuid,
        ${proposal.currentVersion},
        ${proposal.candidateVersion},
        ${input.datasetStartsAt}::date,
        ${input.datasetEndsAt}::date,
        ${outcome},
        ${JSON.stringify(metrics)}::jsonb,
        ${JSON.stringify(evidence)}::jsonb,
        ${outcome === 'INCONCLUSIVE' ? 'Insufficient historical sample for the user-defined minimum sample count.' : null},
        now()
      )
    `;

    return { backtestRunId: id, outcome, metrics };
  } catch (error) {
    return mapDatabaseError(error);
  }
}
