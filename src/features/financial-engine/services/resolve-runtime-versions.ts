import { getRawSql } from '@/infrastructure/db/client';

export type FinancialEngineVersionSet = {
  engine: string;
  policy: string;
  weights: string;
  thresholds: string;
};

export type RuntimeBindingSource = 'BASELINE' | 'RELEASE' | 'ROLLBACK';

export type FinancialEngineRuntimeResolution = {
  versions: FinancialEngineVersionSet;
  sources: {
    engine: RuntimeBindingSource;
    policy: RuntimeBindingSource;
    weights: RuntimeBindingSource;
    thresholds: RuntimeBindingSource;
  };
  bindingIds: Partial<Record<keyof FinancialEngineVersionSet, string>>;
};

type RuntimeTarget = 'ENGINE_LOGIC' | 'POLICY' | 'WEIGHTS' | 'THRESHOLDS';

const VERSION_KEY_BY_TARGET: Record<RuntimeTarget, keyof FinancialEngineVersionSet> = {
  ENGINE_LOGIC: 'engine',
  POLICY: 'policy',
  WEIGHTS: 'weights',
  THRESHOLDS: 'thresholds',
};

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function isRuntimeTarget(value: unknown): value is RuntimeTarget {
  return value === 'ENGINE_LOGIC' || value === 'POLICY' || value === 'WEIGHTS' || value === 'THRESHOLDS';
}

export async function resolveFinancialEngineRuntimeVersions(
  userId: string,
  baseline: FinancialEngineVersionSet,
): Promise<FinancialEngineRuntimeResolution> {
  const sql = getRawSql();
  const registryRows = await sql`
    select
      to_regclass('public.algorithm_releases')::text as releases_table,
      to_regclass('public.algorithm_runtime_bindings')::text as bindings_table
  `;

  const releasesReady = Boolean(registryRows[0]?.releases_table);
  const bindingsReady = Boolean(registryRows[0]?.bindings_table);

  if (!bindingsReady) {
    if (releasesReady) {
      const releaseRows = await sql`
        select count(*)::int as release_count
        from public.algorithm_releases
        where user_id = ${userId}::uuid
          and target in ('POLICY','WEIGHTS','THRESHOLDS','ENGINE_LOGIC')
      `;
      if (Number(releaseRows[0]?.release_count ?? 0) > 0) {
        throw new Error('NAMAA_RUNTIME_BINDING_MIGRATION_REQUIRED');
      }
    }

    return {
      versions: { ...baseline },
      sources: { engine: 'BASELINE', policy: 'BASELINE', weights: 'BASELINE', thresholds: 'BASELINE' },
      bindingIds: {},
    };
  }

  const rows = await sql`
    select distinct on (target)
      id::text as binding_id,
      target,
      version,
      source_type
    from public.algorithm_runtime_bindings
    where user_id = ${userId}::uuid
      and target in ('POLICY','WEIGHTS','THRESHOLDS','ENGINE_LOGIC')
    order by target, activated_at desc, id desc
  `;

  const resolution: FinancialEngineRuntimeResolution = {
    versions: { ...baseline },
    sources: { engine: 'BASELINE', policy: 'BASELINE', weights: 'BASELINE', thresholds: 'BASELINE' },
    bindingIds: {},
  };

  for (const row of rows) {
    if (!isRuntimeTarget(row.target)) throw new Error('NAMAA_RUNTIME_BINDING_INVALID_TARGET');
    const version = text(row.version);
    const bindingId = text(row.binding_id);
    const sourceType = row.source_type === 'RELEASE' || row.source_type === 'ROLLBACK' ? row.source_type : null;
    if (!version || !bindingId || !sourceType) throw new Error('NAMAA_RUNTIME_BINDING_INVALID_RECORD');

    const key = VERSION_KEY_BY_TARGET[row.target];
    resolution.versions[key] = version;
    resolution.sources[key] = sourceType;
    resolution.bindingIds[key] = bindingId;
  }

  return resolution;
}
