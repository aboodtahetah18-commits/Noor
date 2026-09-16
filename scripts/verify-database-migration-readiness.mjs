import process from 'node:process';
import { Pool } from '@neondatabase/serverless';
import {
  assertMigrationReady,
  getMigrationReadiness,
  printMigrationReadiness,
} from './lib/database-migration-readiness.mjs';

const appEnv = process.env.APP_ENV;
if (!['staging', 'production'].includes(appEnv || '')) {
  throw new Error('APP_ENV must be staging or production for database migration readiness checks');
}

const databaseUrl = process.env.DATABASE_URL?.trim() || process.env.DATABASEURL?.trim();
if (!databaseUrl) throw new Error('DATABASE_URL or DATABASEURL is required');

const pool = new Pool({ connectionString: databaseUrl });
const client = await pool.connect();
try {
  const status = await getMigrationReadiness(client);
  printMigrationReadiness(status);
  assertMigrationReady(status);
  console.log(`DATABASE-MIGRATION-READINESS-PASS APP_ENV=${appEnv}`);
} finally {
  client.release();
  await pool.end();
}
