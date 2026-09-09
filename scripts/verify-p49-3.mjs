import fs from 'node:fs';
import path from 'node:path';
const atLeast=(v,a,b,c)=>{const x=v.split('.').map(Number);return x[0]>a||(x[0]===a&&(x[1]>b||(x[1]===b&&x[2]>=c)));};

const root=process.cwd();
const failures=[];
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const pass=(name,ok,detail='')=>{console.log(`${ok?'PASS':'FAIL'} ${name}${detail?` — ${detail}`:''}`);if(!ok)failures.push(name)};
const routeFile=(route)=>path.join(root,'src/app/(protected)',route==='/'?'':route,'page.tsx');

const pkg=JSON.parse(read('package.json'));
pass('P49.3 version',atLeast(pkg.version,0,49,3),pkg.version);
const nav=read('src/app/(protected)/mobile-bottom-nav.tsx');
for(const route of ['/dashboard','/transactions','/budget','/advisor','/more']) pass(`CR-002 mobile destination ${route}`,nav.includes(`href: '${route}'`));
pass('legacy mobile quick add absent',!nav.includes('role="dialog"')&&!nav.includes('mobile-quick-add'));
pass('full-page expense entry route',fs.existsSync(routeFile('expenses'))&&read('src/app/(protected)/dashboard/page.tsx').includes('href="/expenses"'));
pass('mobile more route',nav.includes("href: '/more'") && fs.existsSync(routeFile('more')));
const more=read('src/app/(protected)/more/page.tsx');
const moreRoutes=['/obligations','/savings','/emergency','/goals','/accounts','/reports','/alerts','/decision-log','/workspace','/budget-categories','/merchants','/internal-funding','/settings'];
for(const route of moreRoutes) pass(`more exposes ${route}`,more.includes(`'${route}'`) && fs.existsSync(routeFile(route.slice(1))));
pass('protected loading state',fs.existsSync(path.join(root,'src/app/(protected)/loading.tsx')));
pass('protected recoverable error state',fs.existsSync(path.join(root,'src/app/(protected)/error.tsx')) && read('src/app/(protected)/error.tsx').includes('إعادة المحاولة'));
const css=read('src/app/globals.css');
pass('CR-002 mobile navigation styling',css.includes('.mobile-bottom-nav')||css.includes('.mustaqbali-mobile-bottom-nav'));
pass('more hub styling',css.includes('.more-hub-grid'));
if(failures.length){console.error(`P49.3 verification FAILED (${failures.length})`);process.exit(1)}
console.log(`P49.3 functional UI completion: PASS (${5+moreRoutes.length} governed navigation routes checked)`);
