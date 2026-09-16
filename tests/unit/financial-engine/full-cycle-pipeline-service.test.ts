import { beforeEach, describe, expect, it, vi } from 'vitest';

const sqlMock = vi.fn();
const resolveRuntimeVersionsMock = vi.fn();

vi.mock('@/infrastructure/db/client', () => ({
  getRawSql: () => sqlMock,
}));

vi.mock('@/features/financial-engine/services/resolve-runtime-versions', () => ({
  resolveFinancialEngineRuntimeVersions: (...args: unknown[]) => resolveRuntimeVersionsMock(...args),
}));

import {
  FINANCIAL_ENGINE_VERSIONS,
  FinancialEnginePipelineError,
  runFullCyclePipelineForUser,
} from '@/features/financial-engine/services/run-full-cycle-pipeline';

const userId = '11111111-1111-4111-8111-111111111111';
const cycleId = '22222222-2222-4222-8222-222222222222';

const runtimeBinding = {
  versions: { ...FINANCIAL_ENGINE_VERSIONS },
  sources: {
    engine: 'BASELINE' as const,
    policy: 'BASELINE' as const,
    weights: 'BASELINE' as const,
    thresholds: 'BASELINE' as const,
  },
  bindingIds: {},
};

const validResult = {
  pipeline_status: 'COMPLETED',
  cycle_id: cycleId,
  engine: {
    weighted_score: 81,
    final_state: 'STABLE',
    confidence_score: 90,
  },
  recommendation_generation: {
    generated_recommendation_ids: [],
  },
  recommendations: [],
};

describe('runFullCyclePipelineForUser', () => {
  beforeEach(() => {
    sqlMock.mockReset();
    resolveRuntimeVersionsMock.mockReset();
    resolveRuntimeVersionsMock.mockResolvedValue(runtimeBinding);
  });

  it('returns the database pipeline result with the exact runtime binding for an owned cycle', async () => {
    sqlMock
      .mockResolvedValueOnce([{ id: cycleId }])
      .mockResolvedValueOnce([{ result: validResult }]);

    await expect(runFullCyclePipelineForUser(userId, cycleId)).resolves.toEqual({
      ...validResult,
      runtime_binding: runtimeBinding,
    });
    expect(resolveRuntimeVersionsMock).toHaveBeenCalledWith(userId, FINANCIAL_ENGINE_VERSIONS);
    expect(sqlMock).toHaveBeenCalledTimes(2);
  });

  it('does not resolve runtime versions or execute the engine when the cycle is not owned by the user', async () => {
    sqlMock.mockResolvedValueOnce([]);

    await expect(runFullCyclePipelineForUser(userId, cycleId)).rejects.toMatchObject({
      code: 'FINANCIAL_CYCLE_NOT_FOUND',
      httpStatus: 404,
    } satisfies Partial<FinancialEnginePipelineError>);
    expect(resolveRuntimeVersionsMock).not.toHaveBeenCalled();
    expect(sqlMock).toHaveBeenCalledTimes(1);
  });

  it('maps stale engine results to a retryable conflict without leaking the database error', async () => {
    sqlMock
      .mockResolvedValueOnce([{ id: cycleId }])
      .mockRejectedValueOnce(new Error('NAMAA_PIPELINE_STALE_AFTER_RECOMMENDATIONS: internal details'));

    await expect(runFullCyclePipelineForUser(userId, cycleId)).rejects.toMatchObject({
      code: 'FINANCIAL_ENGINE_RECALCULATION_REQUIRED',
      httpStatus: 409,
    } satisfies Partial<FinancialEnginePipelineError>);
  });

  it('rejects an invalid database response as an internal engine failure', async () => {
    sqlMock
      .mockResolvedValueOnce([{ id: cycleId }])
      .mockResolvedValueOnce([{ result: { pipeline_status: 'COMPLETED' } }]);

    await expect(runFullCyclePipelineForUser(userId, cycleId)).rejects.toMatchObject({
      code: 'FINANCIAL_ENGINE_INVALID_RESPONSE',
      httpStatus: 500,
    } satisfies Partial<FinancialEnginePipelineError>);
  });
});
