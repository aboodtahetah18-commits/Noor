import fs from 'node:fs';

const schemaPath = 'src/infrastructure/db/algorithm-governance-schema.ts';
const migration067Path = 'database/migrations/20260916_067_algorithm_change_governance.sql';
const migration068Path = 'database/migrations/20260916_068_governed_learning_runtime.sql';

for (const path of [schemaPath, migration067Path, migration068Path]) {
  if (!fs.existsSync(path)) throw new Error(`ALGORITHM_GOVERNANCE_CONTRACT_MISSING_FILE:${path}`);
}

const schema = fs.readFileSync(schemaPath, 'utf8');
const migration067 = fs.readFileSync(migration067Path, 'utf8');
const migration068 = fs.readFileSync(migration068Path, 'utf8');
const migrations = `${migration067}\n${migration068}`;

const requiredTables = [
  ['algorithmChangeProposals', 'algorithm_change_proposals'],
  ['algorithmLearningReviews', 'algorithm_learning_reviews'],
  ['algorithmBacktestRequests', 'algorithm_backtest_requests'],
  ['algorithmBacktestRuns', 'algorithm_backtest_runs'],
  ['algorithmChangeDecisions', 'algorithm_change_decisions'],
  ['algorithmReleases', 'algorithm_releases'],
  ['algorithmReleaseMonitoring', 'algorithm_release_monitoring'],
  ['algorithmRollbackReviews', 'algorithm_rollback_reviews'],
  ['algorithmRollbacks', 'algorithm_rollbacks'],
];

for (const [exportName, sqlName] of requiredTables) {
  if (!schema.includes(`export const ${exportName}`)) {
    throw new Error(`ALGORITHM_GOVERNANCE_SCHEMA_EXPORT_MISSING:${exportName}`);
  }
  if (!migrations.includes(`public.${sqlName}`)) {
    throw new Error(`ALGORITHM_GOVERNANCE_MIGRATION_TABLE_MISSING:${sqlName}`);
  }
}

const requiredRuntimeColumns = [
  'backtest_run_id',
  'completed_at',
  'monitoring_id',
  'previous_drift_score',
  'normalized_residual',
  'drift_score',
  'action',
  'proposed_to_version',
  'review_json',
];
for (const column of requiredRuntimeColumns) {
  if (!migration068.includes(column)) {
    throw new Error(`ALGORITHM_GOVERNANCE_RUNTIME_COLUMN_MISSING:${column}`);
  }
}

const schemaColumnContracts = [
  "uuid('backtest_run_id')",
  "uuid('monitoring_id')",
  "text('previous_drift_score')",
  "text('normalized_residual')",
  "text('drift_score')",
  "text('action')",
  "text('proposed_to_version')",
  "jsonb('review_json')",
];
for (const token of schemaColumnContracts) {
  if (!schema.includes(token)) {
    throw new Error(`ALGORITHM_GOVERNANCE_DRIZZLE_COLUMN_MISSING:${token}`);
  }
}

for (const outcome of ['PASSED', 'FAILED', 'INCONCLUSIVE', 'INVALID']) {
  if (!migration068.includes(`'${outcome}'`)) {
    throw new Error(`ALGORITHM_BACKTEST_OUTCOME_CONTRACT_MISSING:${outcome}`);
  }
}

const requiredGuards = [
  'guard_algorithm_release',
  'guard_algorithm_decision',
  'guard_algorithm_backtest_request_update',
  'guard_algorithm_rollback_review',
];
for (const guard of requiredGuards) {
  if (!migrations.includes(guard)) {
    throw new Error(`ALGORITHM_GOVERNANCE_DB_GUARD_MISSING:${guard}`);
  }
}

if (!migration068.includes("'PENDING_REVIEW','APPROVED','REJECTED'")) {
  throw new Error('ROLLBACK_REVIEW_STATUS_CONTRACT_MISSING');
}
if (!migration068.includes('candidate_version <> baseline_version')) {
  throw new Error('BACKTEST_VERSION_CHANGE_GUARD_MISSING');
}

console.log('ALGORITHM-GOVERNANCE-SCHEMA-CONTRACT-PASS');
