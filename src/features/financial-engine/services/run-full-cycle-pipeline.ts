import { getRawSql } from '@/infrastructure/db/client';
import {
  resolveFinancialEngineRuntimeVersions,
  type FinancialEngineRuntimeResolution,
} from '@/features/financial-engine/services/resolve-runtime-versions';

export type FullCyclePipelineResult = {
  pipeline_status: string;
  cycle_id: string;
  engine: Record<string, unknown>;
  recommendation_generation: Record<string, unknown>;
  recommendations: unknown[];
  runtime_binding: FinancialEngineRuntimeResolution;
};

export class FinancialEnginePipelineError extends Error {
  constructor(
    public readonly code: string,
    public readonly httpStatus: number,
  ) {
    super(code);
    this.name = 'FinancialEnginePipelineError';
  }
}

export const FINANCIAL_ENGINE_VERSIONS = {
  engine: 'P2.9-v1',
  policy: 'namaa-central-policy-v1',
  weights: 'namaa-central-weights-v1',
  thresholds: 'namaa-central-thresholds-v1',
} as const;

function databaseErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function mapPipelineDatabaseError(error: unknown): FinancialEnginePipelineError {
  const message = databaseErrorMessage(error);

  if (message.includes('NAMAA_RUNTIME_BINDING_')) {
    return new FinancialEnginePipelineError('ALGORITHM_RUNTIME_BINDING_INVALID', 409);
  }

  if (message.includes('NAMAA_ORCHESTRATOR_CYCLE_NOT_OPERATIONAL')) {
    return new FinancialEnginePipelineError('CYCLE_NOT_OPERATIONAL', 409);
  }

  if (
    message.includes('NAMAA_ORCHESTRATOR_STALE_AFTER_COMPUTE') ||
    message.includes('NAMAA_PIPELINE_STALE_AFTER_RECOMMENDATIONS') ||
    message.includes('NAMAA_RECOMMENDER_STALE_ENGINE_RESULT')
  ) {
    return new FinancialEnginePipelineError('FINANCIAL_ENGINE_RECALCULATION_REQUIRED', 409);
  }

  if (
    message.includes('NAMAA_ENGINE_CYCLE_OWNER_MISMATCH') ||
    message.includes('NAMAA_ORCHESTRATOR_USER_CYCLE_REQUIRED') ||
    message.includes('NAMAA_RECOMMENDER_SCORE_NOT_FOUND') ||
    message.includes('NAMAA_RECOMMENDER_SNAPSHOT_NOT_FOUND')
  ) {
    return new FinancialEnginePipelineError('FINANCIAL_CYCLE_NOT_FOUND', 404);
  }

  return new FinancialEnginePipelineError('FINANCIAL_ENGINE_FAILED', 500);
}

function isPipelineResult(value: unknown): value is Omit<FullCyclePipelineResult, 'runtime_binding'> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result.pipeline_status === 'string' &&
    typeof result.cycle_id === 'string' &&
    !!result.engine &&
    typeof result.engine === 'object' &&
    Array.isArray(result.recommendations)
  );
}

export async function runFullCyclePipelineForUser(
  userId: string,
  cycleId: string,
): Promise<FullCyclePipelineResult> {
  const sql = getRawSql();

  const cycleRows = await sql`
    SELECT id
    FROM public.financial_cycles
    WHERE id = ${cycleId}::uuid
      AND user_id = ${userId}::uuid
    LIMIT 1
  `;

  if (cycleRows.length === 0) {
    throw new FinancialEnginePipelineError('FINANCIAL_CYCLE_NOT_FOUND', 404);
  }

  try {
    const runtimeBinding = await resolveFinancialEngineRuntimeVersions(userId, FINANCIAL_ENGINE_VERSIONS);
    const rows = await sql`
      SELECT public.namaa_run_full_cycle_pipeline(
        ${userId}::uuid,
        ${cycleId}::uuid,
        ${runtimeBinding.versions.engine},
        ${runtimeBinding.versions.policy},
        ${runtimeBinding.versions.weights},
        ${runtimeBinding.versions.thresholds}
      ) AS result
    `;

    const result = rows[0]?.result;
    if (!isPipelineResult(result)) {
      throw new FinancialEnginePipelineError('FINANCIAL_ENGINE_INVALID_RESPONSE', 500);
    }

    return { ...result, runtime_binding: runtimeBinding };
  } catch (error) {
    if (error instanceof FinancialEnginePipelineError) throw error;
    throw mapPipelineDatabaseError(error);
  }
}
