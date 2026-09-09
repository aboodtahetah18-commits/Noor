import fs from 'node:fs';
const checks=[
 ['package manager','package.json','npm@11.19.0'],
 ['quality gate','package.json','production-quality-gate.mjs'],
 ['dependency gate','package.json','verify:dependencies'],
 ['npm policy','.npmrc','engine-strict=true'],
 ['netlify order','netlify.toml','npm run deploy:preflight && npm run quality:gate && npm run deploy:migrate'],
 ['ci npm','.github/workflows/ci.yml','npm install -g npm@11.19.0'],
 ['ci quality','.github/workflows/ci.yml','npm run quality:gate'],
];
for(const [name,file,needle] of checks){const s=fs.readFileSync(file,'utf8');if(!s.includes(needle)){console.error('FAIL',name);process.exit(1)}console.log('PASS',name)}
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
if(!/^0\.48\.(?:[4-9]|[1-9]\d)$/.test(pkg.version)){console.error('FAIL version');process.exit(1)}
console.log('PASS version');
const netlify=fs.readFileSync('netlify.toml','utf8');
if(netlify.indexOf('quality:gate')>netlify.indexOf('deploy:migrate')){console.error('FAIL migration must run after quality gate');process.exit(1)}
console.log('P48.3/P48.4 structural verification: PASS');
