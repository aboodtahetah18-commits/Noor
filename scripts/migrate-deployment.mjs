import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const appEnv = process.env.APP_ENV;
const deployContext = process.env.CONTEXT || (process.env.VERCEL_ENV === 'production' ? 'production' : process.env.VERCEL_ENV === 'preview' ? 'deploy-preview' : 'local');
const migrationFlag = process.env.ALLOW_DB_MIGRATIONS === 'true' || process.env.ALLOW_STAGING_MIGRATIONS === 'true';

if (!migrationFlag) {
  console.log(`Database migrations SKIPPED (APP_ENV=${appEnv || 'unset'}, CONTEXT=${deployContext}, explicit opt-in is false)`);
  process.exit(0);
}
if (!['staging','production'].includes(appEnv || '')) throw new Error('APP_ENV must be staging or production before migrations can run');
if (deployContext === 'deploy-preview') throw new Error('Automatic migrations are forbidden in preview deployment context');

const databaseUrl = process.env.DATABASE_URL?.trim() || process.env.DATABASEURL?.trim();
if (!databaseUrl) throw new Error('DATABASE_URL or DATABASEURL is required');

const migrationsDir = path.resolve('database/migrations');
const files = (await fs.readdir(migrationsDir)).filter((name)=>/^\d{8}_\d{3}_.+\.sql$/.test(name)).sort();
if (!files.length) throw new Error('No migrations found');

const { Pool } = await import('@neondatabase/serverless');
const pool = new Pool({ connectionString: databaseUrl });
const client = await pool.connect();
try {
  await client.query(`CREATE TABLE IF NOT EXISTS public.schema_migrations (filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  const { rows } = await client.query('SELECT filename FROM public.schema_migrations');
  const applied = new Set(rows.map((row)=>row.filename));
  for (const filename of files) {
    if (applied.has(filename)) { console.log(`SKIP ${filename}`); continue; }
    const rawSql = await fs.readFile(path.join(migrationsDir, filename),'utf8');
    const sql = rawSql.replace(/^\s*begin;\s*/i,'').replace(/\s*commit;\s*$/i,'');
    console.log(`APPLY ${filename}`);
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO public.schema_migrations(filename) VALUES ($1)',[filename]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`FAILED ${filename}`);
      throw error;
    }
  }
  console.log(`Migration run complete. Files discovered: ${files.length}`);
} finally {
  client.release();
  await pool.end();
}
