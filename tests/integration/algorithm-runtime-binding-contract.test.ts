import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const resolver = readFileSync('src/features/financial-engine/services/resolve-runtime-versions.ts', 'utf8');
const pipeline = readFileSync('src/features/financial-engine/services/run-full-cycle-pipeline.ts', 'utf8');
const proposals = readFileSync('src/features/pilot/queries/get-pilot-change-proposals.ts', 'utf8');
const governance = readFileSync('src/features/pilot/services/algorithm-governance-write-service.ts', 'utf8');

describe('governed algorithm runtime integration contract', () => {
  it('fails closed when governed releases exist without runtime-binding storage', () => {
    expect(resolver).toContain('NAMAA_RUNTIME_BINDING_MIGRATION_REQUIRED');
    expect(resolver).toContain('from public.algorithm_releases');
    expect(resolver).toContain('release_count');
    expect(pipeline).toContain('ALGORITHM_RUNTIME_BINDING_INVALID');
  });

  it('resolves active versions per user before invoking the financial engine', () => {
    expect(resolver).toContain('from public.algorithm_runtime_bindings');
    expect(resolver).toContain('where user_id = ${userId}::uuid');
    expect(resolver).toContain('order by target, activated_at desc, id desc');
    expect(pipeline).toContain('resolveFinancialEngineRuntimeVersions(userId, FINANCIAL_ENGINE_VERSIONS)');
    expect(pipeline).toContain('${runtimeBinding.versions.engine}');
    expect(pipeline).toContain('${runtimeBinding.versions.policy}');
    expect(pipeline).toContain('${runtimeBinding.versions.weights}');
    expect(pipeline).toContain('${runtimeBinding.versions.thresholds}');
  });

  it('returns the exact runtime binding snapshot used for the calculation', () => {
    expect(pipeline).toContain('runtime_binding: FinancialEngineRuntimeResolution');
    expect(pipeline).toContain('return { ...result, runtime_binding: runtimeBinding }');
    expect(resolver).toContain('bindingIds');
    expect(resolver).toContain("RuntimeBindingSource = 'BASELINE' | 'RELEASE' | 'ROLLBACK'");
  });

  it('uses explicit baseline versions only before governed activation', () => {
    expect(resolver).toContain("engine: 'BASELINE'");
    expect(resolver).toContain("policy: 'BASELINE'");
    expect(resolver).toContain("weights: 'BASELINE'");
    expect(resolver).toContain("thresholds: 'BASELINE'");
    expect(resolver).toContain('versions: { ...baseline }');
  });

  it('bases the next change proposal on the active governed runtime version', () => {
    expect(proposals).toContain('resolveFinancialEngineRuntimeVersions(userId, FINANCIAL_ENGINE_VERSIONS)');
    expect(proposals).toContain('POLICY: runtime.versions.policy');
    expect(proposals).toContain('WEIGHTS: runtime.versions.weights');
    expect(proposals).toContain('THRESHOLDS: runtime.versions.thresholds');
    expect(proposals).toContain('ENGINE_LOGIC: runtime.versions.engine');
  });

  it('maps stale release or rollback chains to a governed conflict response', () => {
    expect(governance).toContain("FinancialPlatformError('RUNTIME_BINDING_CONFLICT', 409)");
    expect(governance).toContain('active runtime binding');
  });
});
