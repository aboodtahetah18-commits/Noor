import fs from 'node:fs';

const fail=[];
const required=['vercel.json','.github/workflows/ci.yml','.github/workflows/database-migrate.yml'];
for (const file of required) if (!fs.existsSync(file)) fail.push(`missing ${file}`);

const configText=fs.readFileSync('vercel.json','utf8');
const config=JSON.parse(configText);
if (config.framework !== 'nextjs') fail.push('Vercel framework must be nextjs');
if (!configText.includes('npm run vercel:build')) fail.push('Vercel build must use vercel:build');
if (configText.includes('deploy:migrate')) fail.push('Database migration must not run inside Vercel build');

const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
if (!pkg.scripts?.['vercel:build']) fail.push('missing package script vercel:build');
if (!pkg.scripts?.['vercel:preflight']) fail.push('missing package script vercel:preflight');

const preflight=fs.readFileSync('scripts/vercel-preflight.mjs','utf8');
if (!preflight.includes("env === 'preview' && !betterAuthSecret")) fail.push('preview UI-only mode must be explicitly scoped to Vercel preview without auth secret');
if (!preflight.includes("env === 'production'")) fail.push('production environment must remain explicitly guarded');
if (!preflight.includes('BETTER_AUTH_SECRET is required for Vercel Production runtime')) fail.push('production BETTER_AUTH_SECRET fail-closed guard is required');
if (!preflight.includes('RESEND_API_KEY is required in production')) fail.push('production email delivery key guard is required');
if (!preflight.includes('AUTH_EMAIL_FROM is required in production')) fail.push('production auth sender guard is required');

const loginPage=fs.readFileSync('src/app/(public)/login/page.tsx','utf8');
const loginForm=fs.readFileSync('src/app/(public)/login/login-form.tsx','utf8');
if (!loginPage.includes("process.env.VERCEL_ENV === 'preview'")) fail.push('login page must detect preview-only mode server-side');
if (!loginPage.includes("!process.env.BETTER_AUTH_SECRET?.trim()")) fail.push('login preview-only mode must require missing auth secret');
if (!loginPage.includes('previewOnly={uiPreviewOnly}')) fail.push('login form must receive preview-only state');
if (!loginForm.includes("هذه معاينة للواجهة فقط")) fail.push('preview-only login must remain non-operational with explicit feedback');

if (fail.length) {
  console.error('VERCEL-DEPLOYMENT-CONTRACT-FAIL');
  for (const item of fail) console.error(`- ${item}`);
  process.exit(1);
}
console.log('VERCEL-DEPLOYMENT-CONTRACT-PASS production remains fail-closed while secretless Vercel previews are UI-only');

