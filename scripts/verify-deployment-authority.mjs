import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const vercel=JSON.parse(fs.readFileSync('vercel.json','utf8'));
const errors=[];

function tracked(path){
  try {
    return execFileSync('git',['ls-files','--',path],{encoding:'utf8'}).trim().length>0;
  } catch {
    return false;
  }
}

function trackedFiles(pattern){
  try {
    return execFileSync('git',['ls-files','--',pattern],{encoding:'utf8'})
      .split('\n')
      .map(value=>value.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

const build=String(pkg.scripts?.['vercel:build']??'');
const legacyScriptNames=Object.keys(pkg.scripts??{}).filter(name=>name.startsWith('namaa:final-ui:'));
const legacyBuildFiles=[
  'scripts/materialize-namaa-final-ui.sh',
  'scripts/preserve-noor-financial-backend.sh',
  'scripts/postdeploy-smoke-p0.4.30.mjs',
  '.github/workflows/namaa-final-ui-p0.4.30.yml',
];

const forbiddenRuntimeIdentityFiles=[
  'public/brand/mustaqbali-app-icon.png',
  'public/brand/mustaqbali-brand-symbol.png',
  'public/brand/mustaqbali-financial-journey.png',
  'public/brand/mustaqbali-logo-white-compact.png',
  'public/brand/mustaqbali-logo-white.png',
  'public/brand/mustaqbali-logo.png',
  'public/brand/namaa-logo.webp',
  'src/design-system/ndos-v1.1.css',
  'src/app/(protected)/onboarding/accounts/page.tsx',
  'src/app/(protected)/onboarding/income/page.tsx',
  'src/app/(protected)/onboarding/obligations/page.tsx',
  'src/app/(protected)/onboarding/controls/page.tsx',
  'src/app/(protected)/onboarding/plan/page.tsx',
  'src/app/(protected)/onboarding/actions.ts',
  'src/features/onboarding/components/onboarding-step-nav.tsx',
  'src/features/onboarding/components/manual-plan-builder.tsx',
];
const legacyPatchFiles=trackedFiles('scripts/patch-namaa-*');
const legacySmokeCommands=Object.keys(pkg.scripts??{}).filter(name=>name.includes('p0.4.30'));

if(build.includes('namaa:final-ui:materialize')) errors.push('Vercel build must not materialize the legacy Namaa P0.4.30 artifact.');
if(build.includes('apps/namaa-final-ui') && !build.includes('rmSync')) errors.push('Vercel build must not build the generated legacy apps/namaa-final-ui runtime.');
if(vercel.outputDirectory!=='.next') errors.push(`Vercel outputDirectory must be .next, got ${vercel.outputDirectory}`);
const isApprovedPreview=
  process.env.VERCEL_ENV==='preview' &&
  process.env.VERCEL_GIT_COMMIT_REF==='deploy/vercel-preview-20260920';
const isApprovedProductionRelease=
  (process.env.VERCEL_ENV==='production' && process.env.VERCEL_GIT_COMMIT_REF==='main') ||
  (process.env.GITHUB_ACTIONS==='true' && process.env.GITHUB_REF_NAME==='main');
if(vercel.git?.deploymentEnabled!==false && !isApprovedPreview && !isApprovedProductionRelease){
  errors.push('Vercel Git auto-deployments must stay disabled except for an explicitly approved preview or production release.');
}
if(!build.includes('npm run build')) errors.push('Vercel build must compile the repository root Next.js application.');
if(legacyScriptNames.length) errors.push(`Legacy generated UI commands remain in package.json: ${legacyScriptNames.join(', ')}`);
if(legacySmokeCommands.length) errors.push(`Legacy P0.4.30 commands remain in package.json: ${legacySmokeCommands.join(', ')}`);
for(const file of legacyBuildFiles){
  if(tracked(file)) errors.push(`Legacy production materialization file must be removed from source control: ${file}`);
}
for(const file of forbiddenRuntimeIdentityFiles){
  if(tracked(file)) errors.push(`Forbidden legacy UI/identity artifact is tracked: ${file}`);
}
const rootLayout=fs.readFileSync('src/app/layout.tsx','utf8');
if(rootLayout.includes('ndos-v1.1')) errors.push('Root layout must never import NDOS v1.1.');
if(!rootLayout.includes('ndos-v1.2.css')) errors.push('Root layout must load NDOS v1.2 FINAL.');
if(legacyPatchFiles.length) errors.push(`Legacy generated UI patch files remain tracked: ${legacyPatchFiles.join(', ')}`);
if(tracked('apps/namaa-final-ui')) errors.push('Generated legacy apps/namaa-final-ui directory must not be tracked in the production source tree.');

if(errors.length){
  console.error('DEPLOYMENT-AUTHORITY-FAIL');
  for(const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('DEPLOYMENT-AUTHORITY-PASS root src/app is the only production UI authority.');
