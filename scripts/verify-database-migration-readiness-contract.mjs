import fs from 'node:fs';
import path from 'node:path';

function read(file){return fs.readFileSync(path.resolve(file),'utf8');}
function requireText(source,text,label){if(!source.includes(text))throw new Error(`DATABASE_MIGRATION_READINESS_CONTRACT:${label}`);}

const helper=read('scripts/lib/database-migration-readiness.mjs');
const verifier=read('scripts/verify-database-migration-readiness.mjs');
const migrate=read('scripts/migrate-deployment.mjs');
const vercel=read('scripts/vercel-preflight.mjs');
const migrationFiles=fs.readdirSync(path.resolve('database/migrations')).filter((name)=>/^\d{8}_\d{3}_.+\.sql$/.test(name)).sort();

requireText(helper,"select to_regclass('public.schema_migrations')",'schema migration registry must be checked read-only');
requireText(helper,'DATABASE_MIGRATION_DRIFT','pending migration drift must fail closed');
requireText(verifier,'assertMigrationReady(status)','standalone verifier must assert readiness');
requireText(migrate,'Verifying readiness instead.','disabled mutation path must verify readiness rather than silently succeed');
requireText(migrate,'DATABASE-MIGRATION-POSTCHECK','migration runner must post-check after applying');
requireText(vercel,"import('./lib/database-migration-readiness.mjs')",'hosted Vercel preflight must use live migration readiness');
requireText(vercel,'assertMigrationReady(status)','hosted Vercel build must fail on drift');

const critical=[
  '20260916_068_algorithm_runtime_binding.sql',
  '20260916_068_governed_learning_runtime.sql',
  '20260916_069_authorization_rbac_abac.sql',
  '20260916_070_authorization_provisioning.sql',
  '20260916_071_authorization_provisioning_atomic_apply.sql',
  '20260917_072_authorization_bootstrap_guard.sql',
  '20260917_072_authorization_provisioning_three_actor_sod.sql',
];
for(const filename of critical){
  if(!migrationFiles.includes(filename)) throw new Error(`DATABASE_MIGRATION_READINESS_CONTRACT:missing critical migration ${filename}`);
}

console.log(`DATABASE-MIGRATION-READINESS-CONTRACT-PASS files=${migrationFiles.length}`);
