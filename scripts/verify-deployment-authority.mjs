import fs from 'node:fs';

const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const vercel=JSON.parse(fs.readFileSync('vercel.json','utf8'));
const errors=[];

const build=String(pkg.scripts?.['vercel:build']??'');
const legacyScriptNames=Object.keys(pkg.scripts??{}).filter(name=>name.startsWith('namaa:final-ui:'));
const legacyBuildFiles=[
  'scripts/materialize-namaa-final-ui.sh',
  'scripts/preserve-noor-financial-backend.sh',
];

if(build.includes('namaa:final-ui:materialize')) errors.push('Vercel build must not materialize the legacy Namaa P0.4.30 artifact.');
if(build.includes('apps/namaa-final-ui')) errors.push('Vercel build must not build the generated legacy apps/namaa-final-ui runtime.');
if(vercel.outputDirectory!=='.next') errors.push(`Vercel outputDirectory must be .next, got ${vercel.outputDirectory}`);
if(!build.includes('npm run build')) errors.push('Vercel build must compile the repository root Next.js application.');
if(legacyScriptNames.length) errors.push(`Legacy generated UI commands remain in package.json: ${legacyScriptNames.join(', ')}`);
for(const file of legacyBuildFiles){
  if(fs.existsSync(file)) errors.push(`Legacy production materialization file must be removed: ${file}`);
}
if(fs.existsSync('apps/namaa-final-ui')) errors.push('Generated legacy apps/namaa-final-ui directory must not exist in the production source tree.');

if(errors.length){
  console.error('DEPLOYMENT-AUTHORITY-FAIL');
  for(const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('DEPLOYMENT-AUTHORITY-PASS root src/app is the only production UI authority.');
