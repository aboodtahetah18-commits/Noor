import fs from 'node:fs';

const fail=[];
const required=['vercel.json','.github/workflows/ci.yml','.github/workflows/database-migrate.yml'];
for (const file of required) if (!fs.existsSync(file)) fail.push(`missing ${file}`);

const config=fs.readFileSync('vercel.json','utf8');
if (!config.includes('"framework": "nextjs"')) fail.push('Vercel framework must be nextjs');
if (!config.includes('npm run vercel:build')) fail.push('Vercel build must use vercel:build');
if (config.includes('deploy:migrate')) fail.push('Database migration must not run inside Vercel build');

const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
if (!pkg.scripts?.['vercel:build']) fail.push('missing package script vercel:build');
if (!pkg.scripts?.['vercel:preflight']) fail.push('missing package script vercel:preflight');

if (fail.length) {
  console.error('VERCEL-DEPLOYMENT-CONTRACT-FAIL');
  for (const item of fail) console.error(`- ${item}`);
  process.exit(1);
}
console.log('VERCEL-DEPLOYMENT-CONTRACT-PASS');
