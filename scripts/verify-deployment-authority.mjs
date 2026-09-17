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
const legacyPatchFiles=trackedFiles('scripts/patch-namaa-*');
const legacySmokeCommands=Object.keys(pkg.scripts??{}).filter(name=>name.includes('p0.4.30'));

if(build.includes('namaa:final-ui:materialize')) errors.push('Vercel build must not materialize the legacy Namaa P0.4.30 artifact.');
if(build.includes('apps/namaa-final-ui') && !build.includes('rmSync')) errors.push('Vercel build must not build the generated legacy apps/namaa-final-ui runtime.');
if(vercel.outputDirectory!=='.next') errors.push(`Vercel outputDirectory must be .next, got ${vercel.outputDirectory}`);
if(!build.includes('npm run build')) errors.push('Vercel build must compile the repository root Next.js application.');
if(legacyScriptNames.length) errors.push(`Legacy generated UI commands remain in package.json: ${legacyScriptNames.join(', ')}`);
if(legacySmokeCommands.length) errors.push(`Legacy P0.4.30 commands remain in package.json: ${legacySmokeCommands.join(', ')}`);
for(const file of legacyBuildFiles){
  if(tracked(file)) errors.push(`Legacy production materialization file must be removed from source control: ${file}`);
}
if(legacyPatchFiles.length) errors.push(`Legacy generated UI patch files remain tracked: ${legacyPatchFiles.join(', ')}`);
if(tracked('apps/namaa-final-ui')) errors.push('Generated legacy apps/namaa-final-ui directory must not be tracked in the production source tree.');

if(errors.length){
  console.error('DEPLOYMENT-AUTHORITY-FAIL');
  for(const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('DEPLOYMENT-AUTHORITY-PASS root src/app is the only production UI authority.');
