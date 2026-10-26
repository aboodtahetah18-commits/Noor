import fs from 'node:fs/promises';
import path from 'node:path';

const MIGRATION_FILE_PATTERN = /^\d{8}_\d{3}_.+\.sql$/;

export async function discoverMigrationFiles(rootDir = process.cwd()) {
  const migrationsDir = path.resolve(rootDir, 'database/migrations');
  const names = await fs.readdir(migrationsDir);
  return names.filter((name) => MIGRATION_FILE_PATTERN.test(name)).sort();
}

export async function getMigrationReadiness(client, options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const expected = await discoverMigrationFiles(rootDir);
  if (!expected.length) throw new Error('DATABASE_MIGRATION_FILES_MISSING');

  const table = await client.query(`select to_regclass('public.schema_migrations')::text as relation`);
  if (!table.rows[0]?.relation) {
    return {
      ready: false,
      expected,
      applied: [],
      pending: expected,
      unexpected: [],
      reason: 'SCHEMA_MIGRATIONS_TABLE_MISSING',
    };
  }

  const { rows } = await client.query('select filename from public.schema_migrations order by filename');
  const applied = rows.map((row) => String(row.filename));
  const appliedSet = new Set(applied);
  const expectedSet = new Set(expected);
  const pending = expected.filter((name) => !appliedSet.has(name));
  const unexpected = applied.filter((name) => !expectedSet.has(name));

  return {
    ready: pending.length === 0,
    expected,
    applied,
    pending,
    unexpected,
    reason: pending.length === 0 ? 'READY' : 'PENDING_MIGRATIONS',
  };
}

export function printMigrationReadiness(status, { prefix = 'DATABASE-MIGRATION' } = {}) {
  console.log(`${prefix} expected=${status.expected.length} applied=${status.applied.length} pending=${status.pending.length}`);
  if (status.unexpected.length) {
    console.warn(`${prefix} unexpected-records=${status.unexpected.join(',')}`);
  }
  if (status.pending.length) {
    console.error(`${prefix}-DRIFT pending migrations:`);
    for (const filename of status.pending) console.error(`- ${filename}`);
  }
}

export function assertMigrationReady(status) {
  if (!status.ready) {
    const error = new Error(`DATABASE_MIGRATION_DRIFT:${status.reason}:${status.pending.join(',')}`);
    error.code = 'DATABASE_MIGRATION_DRIFT';
    error.pending = status.pending;
    throw error;
  }
}
