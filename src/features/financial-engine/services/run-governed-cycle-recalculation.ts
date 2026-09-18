import { getRawSql } from '@/infrastructure/db/client';
import { getCentralPolicyTextParameter } from './central-policy-parameters';
import {
  FINANCIAL_ENGINE_VERSIONS,
  runFullCyclePipelineForUser,
  type FullCyclePipelineResult,
} from './run-full-cycle-pipeline';
import { resolveFinancialEngineRuntimeVersions } from './resolve-runtime-versions';

export type GovernedCycleRecalculationResult =
  | {
      mode: 'FACTS_AND_HARD_GATES_ONLY';
      cycle_id: string;
      engine_snapshot_id: string;
      weight_governance_state: string;
    }
  | {
      mode: 'FULL_GOVERNING_PIPELINE';
      cycle_id: string;
      weight_governance_state: string;
      pipeline: FullCyclePipelineResult;
    };

export async function runGovernedCycleRecalculationForUser(
  userId: string,
  cycleId: string,
): Promise<GovernedCycleRecalculationResult> {
  const sql = getRawSql();
  const weightGovernance = await getCentralPolicyTextParameter('إعداد-معايرة-١');

  const isGoverning = weightGovernance.value === 'حاكم';

  if (!isGoverning) {
    const runtimeBinding = await resolveFinancialEngineRuntimeVersions(
      userId,
      FINANCIAL_ENGINE_VERSIONS,
    );
    const rows = await sql`
      select public.namaa_compute_cycle_financial_engine(
        ${userId}::uuid,
        ${cycleId}::uuid,
        ${runtimeBinding.versions.engine},
        ${runtimeBinding.versions.policy}
      )::text as snapshot_id
    `;
    const snapshotId = rows[0]?.snapshot_id;
    if (!snapshotId) throw new Error('GOVERNED_RECALC_SNAPSHOT_MISSING');

    return {
      mode: 'FACTS_AND_HARD_GATES_ONLY',
      cycle_id: cycleId,
      engine_snapshot_id: String(snapshotId),
      weight_governance_state: weightGovernance.value,
    };
  }

  const pipeline = await runFullCyclePipelineForUser(userId, cycleId);
  return {
    mode: 'FULL_GOVERNING_PIPELINE',
    cycle_id: cycleId,
    weight_governance_state: weightGovernance.value,
    pipeline,
  };
}
