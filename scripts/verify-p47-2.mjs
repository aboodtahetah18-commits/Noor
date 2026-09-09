import fs from 'node:fs';
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const atLeast=(v,a,b,c)=>{const [x=0,y=0,z=0]=String(v).split('.').map(Number);return x>a||(x===a&&(y>b||(y===b&&z>=c)))};
const checks=[
 ['desktop sidebar','src/app/(protected)/desktop-top-nav.tsx','p47-desktop-sidebar'],
 ['sidebar groups','src/app/(protected)/desktop-top-nav.tsx','التحليل والقرار'],
 ['mobile topbar','src/app/(protected)/mobile-top-bar.tsx','p47-mobile-topbar'],
 ['layout mobile topbar','src/app/(protected)/layout.tsx','<MobileTopBar />'],
 ['financial hero','src/app/(protected)/dashboard/page.tsx','p47-financial-hero'],
 ['next action','src/app/(protected)/dashboard/page.tsx','ما الذي يحتاج قرارك الآن؟'],
 ['safe spend hierarchy','src/app/(protected)/dashboard/page.tsx','المتاح الآمن للصرف'],
 ['liquidity distinction','src/app/(protected)/dashboard/page.tsx','رصيد فعلي، وليس المبلغ الآمن للصرف'],
 ['p47 styles','src/app/globals.css','P47.1 + P47.2'],
];
for(const [name,file,needle] of checks){const s=fs.readFileSync(file,'utf8');if(!s.includes(needle)){console.error('FAIL',name);process.exit(1)}console.log('PASS',name)}
if(!atLeast(pkg.version,0,47,2)){console.error('FAIL release version');process.exit(1)}console.log('PASS release version — '+pkg.version);
console.log('P47.1/P47.2 structural verification: PASS');
