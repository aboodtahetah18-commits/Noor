import fs from 'node:fs';

const fail=[];
const required=['vercel.json','.github/workflows/ci.yml','.github/workflows/database-migrate.yml'];
for (const file of required) if (!fs.existsSync(file)) fail.push(`missing ${file}`);

const configText=fs.readFileSync('vercel.json','utf8');
const config=JSON.parse(configText);
if (config.framework !== 'nextjs') fail.push('Vercel framework must be nextjs');
const approvedProductionRelease=
  (process.env.VERCEL_ENV==='production' && process.env.VERCEL_GIT_COMMIT_REF==='main') ||
  (process.env.GITHUB_ACTIONS==='true' && process.env.GITHUB_REF_NAME==='main');
const deploymentEnabled=config.git?.deploymentEnabled;
const mainOnlyGitDeployment=
  deploymentEnabled!==null &&
  typeof deploymentEnabled==='object' &&
  deploymentEnabled['*']===false &&
  deploymentEnabled.main===true &&
  Object.entries(deploymentEnabled).every(([ref,enabled])=>
    (ref==='main'&&enabled===true)||(ref==='*'&&enabled===false)
  );
if (deploymentEnabled !== false && !mainOnlyGitDeployment && !approvedProductionRelease) {
  fail.push('Automatic Vercel Git deployments must remain disabled outside an explicit main production release.');
}
if (!configText.includes('npm run vercel:build')) fail.push('Vercel build must use vercel:build');
if (configText.includes('deploy:migrate')) fail.push('Database migration must not run inside Vercel build');

const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
if (!pkg.scripts?.['vercel:build']) fail.push('missing package script vercel:build');
if (!pkg.scripts?.['vercel:preflight']) fail.push('missing package script vercel:preflight');

if (fail.length) {
  console.error('VERCEL-DEPLOYMENT-CONTRACT-FAIL');
  for (const item of fail) console.error(`- ${item}`);
  process.exit(1);
}
console.log('VERCEL-DEPLOYMENT-CONTRACT-PASS Git deployment is disabled by default and permitted only for an explicit main production release.');

