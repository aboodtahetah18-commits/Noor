import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!/^0\.(41\.[7-9]|4[2-9]\.|[5-9][0-9]\.)/.test(pkg.version)) failures.push(`package version ${pkg.version} is older than Phase 41 baseline`);
for (const s of ['staging:preflight','staging:migrate','staging:secret']) {
  if (!pkg.scripts?.[s]) failures.push(`missing script ${s}`);
}
const netlify = fs.readFileSync(path.join(root, 'netlify.toml'),'utf8');
if (/PREVIEW_MODE\s*=\s*"true"/.test(netlify)) failures.push('PREVIEW_MODE=true remains in netlify.toml');
if (/to\s*=\s*"\/preview"/.test(netlify)) failures.push('root redirect to /preview remains');
const migrations = fs.readdirSync(path.join(root,'database/migrations')).filter(x=>x.endsWith('.sql')).sort();
if (migrations.length < 27) failures.push(`expected at least 27 SQL migrations, found ${migrations.length}`);
if (!fs.existsSync(path.join(root,'scripts/migrate-staging.mjs'))) failures.push('migration runner missing');
if (!fs.existsSync(path.join(root,'STAGING_DEPLOYMENT.md'))) failures.push('staging deployment guide missing');
if (!fs.existsSync(path.join(root,'src/features/auth/queries/get-owner-bootstrap-status.ts'))) failures.push('owner bootstrap status query missing');
if (!fs.existsSync(path.join(root,'src/app/(public)/login/bootstrap-owner-form.tsx'))) failures.push('owner bootstrap form missing');
const legacyMigrationMode = netlify.includes('npm run staging:migrate') && netlify.includes('ALLOW_STAGING_MIGRATIONS = \"true\"');
const contextualMigrationMode = netlify.includes('npm run deploy:migrate') && netlify.includes('[context.production.environment]') && netlify.includes('[context.deploy-preview.environment]') && /\[context\.deploy-preview\.environment\][\s\S]*?ALLOW_DB_MIGRATIONS = \"false\"/.test(netlify);
if (!legacyMigrationMode && !contextualMigrationMode) failures.push('deployment migration policy missing or unsafe');
if (failures.length) {
  console.error('Phase 41 verification FAILED');
  failures.forEach(x=>console.error('-',x));
  process.exit(1);
}
console.log('Phase 41 structural verification: PASS');
console.log(`Migrations discovered: ${migrations.length}`);
console.log('Operational Netlify mode: PASS');
