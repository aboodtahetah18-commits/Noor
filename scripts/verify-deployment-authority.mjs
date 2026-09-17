import fs from 'node:fs';

const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const vercel=JSON.parse(fs.readFileSync('vercel.json','utf8'));
const errors=[];

const build=String(pkg.scripts?.['vercel:build']??'');
if(build.includes('namaa:final-ui:materialize')) errors.push('Vercel build must not materialize the legacy Namaa P0.4.30 artifact.');
if(build.includes('apps/namaa-final-ui')) errors.push('Vercel build must not build the generated legacy apps/namaa-final-ui runtime.');
if(vercel.outputDirectory!==' .next'.trim()) errors.push(`Vercel outputDirectory must be .next, got ${vercel.outputDirectory}`);
if(!build.includes('next build') && !build.includes('npm run build')) errors.push('Vercel build must compile the repository root Next.js application.');

if(errors.length){
  console.error('DEPLOYMENT-AUTHORITY-FAIL');
  for(const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('DEPLOYMENT-AUTHORITY-PASS root src/app is the only production UI authority.');
