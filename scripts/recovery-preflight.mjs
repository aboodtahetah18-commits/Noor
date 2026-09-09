import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const target = process.env.RECOVERY_DATABASE_URL?.trim();
if (!target) {
  console.error('RECOVERY-PREFLIGHT-FAIL RECOVERY_DATABASE_URL is required');
  process.exit(1);
}
const production = process.env.DATABASE_URL?.trim() || process.env.DATABASEURL?.trim() || '';
if (production && target === production) {
  console.error('RECOVERY-PREFLIGHT-FAIL recovery target must not equal the production database URL');
  process.exit(1);
}
if (!/^postgres(?:ql)?:\/\//i.test(target)) {
  console.error('RECOVERY-PREFLIGHT-FAIL recovery target must be a PostgreSQL URL');
  process.exit(1);
}

const migrationsDir = path.resolve('database/migrations');
const migrationFiles = (await fs.readdir(migrationsDir)).filter((name) => /^\d{8}_\d{3}_.+\.sql$/.test(name)).sort();
if (migrationFiles.length !== 64) {
  console.error(`RECOVERY-PREFLIGHT-FAIL expected 66 repository migrations, got ${migrationFiles.length}`);
  process.exit(1);
}

const { Pool } = await import('@neondatabase/serverless');
const pool = new Pool({ connectionString: target });
const client = await pool.connect();
try {
  const migrationTable = await client.query("select to_regclass('public.schema_migrations') as name");
  if (!migrationTable.rows[0]?.name) throw new Error('public.schema_migrations is missing');
  const applied = await client.query('select filename from public.schema_migrations order by filename');
  const appliedNames = new Set(applied.rows.map((row) => String(row.filename)));
  const missing = migrationFiles.filter((filename) => !appliedNames.has(filename));
  if (missing.length) throw new Error(`recovery target is missing ${missing.length} migrations`);

  const criticalTables = [
    'profiles','accounts','financial_cycles','financial_plans','transactions','obligation_occurrences',
    'saving_allocations','emergency_funds','financial_goals','recommendations','cycle_snapshots','state_transition_logs',
  ];
  for (const table of criticalTables) {
    const result = await client.query('select to_regclass($1) as name', [`public.${table}`]);
    if (!result.rows[0]?.name) throw new Error(`critical table public.${table} is missing`);
  }

  await client.query('BEGIN READ ONLY');
  try {
    await client.query('select count(*) from public.transactions');
    await client.query('select count(*) from public.cycle_snapshots');
    await client.query('select count(*) from public.state_transition_logs');
    await client.query('ROLLBACK');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }

  console.log(`RECOVERY-PREFLIGHT-PASS migrations=${migrationFiles.length} critical_tables=${criticalTables.length}`);
} catch (error) {
  console.error(`RECOVERY-PREFLIGHT-FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
