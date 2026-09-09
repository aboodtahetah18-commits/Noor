import fs from 'node:fs';
const read=(p)=>fs.readFileSync(new URL(`../${p}`, import.meta.url),'utf8');
const pkg=JSON.parse(read('package.json'));
const workspace=read('src/app/(protected)/workspace/page.tsx');
const nav=read('src/app/(protected)/navigation.ts');
const mobile=read('src/app/(protected)/mobile-bottom-nav.tsx');
const dashboard=read('src/app/(protected)/dashboard/page.tsx');
const settings=read('src/app/(protected)/settings/page.tsx');
const checks=[
 ['version',pkg.version==='0.45.13'],
 ['workspace route',workspace.includes('كل أدواتك المالية في مكان واحد')],
 ['bank ops visible',workspace.includes('/bank-operations') && dashboard.includes('/bank-operations')],
 ['merchant visible',workspace.includes('/merchants') && dashboard.includes('/merchants')],
 ['optimizer visible',workspace.includes('/budget/optimizer') && dashboard.includes('/budget/optimizer')],
 ['funding visible',workspace.includes('/internal-funding') && dashboard.includes('/internal-funding')],
 ['learning visible',workspace.includes('/reports/learning') && dashboard.includes('/reports/learning')],
 ['decision log visible',workspace.includes('/decision-log') && dashboard.includes('/decision-log')],
 ['desktop center nav',nav.includes("href: '/workspace'")],
 ['mobile bank daily',mobile.includes("href: '/bank-operations'")],
 ['mobile more center',mobile.includes("href: '/workspace'")],
 ['settings integration',settings.includes('/internal-funding') && settings.includes('/reports/learning') && settings.includes('/decision-log')],
];
for(const [name,ok] of checks){if(!ok){console.error(`FAIL: ${name}`);process.exit(1);}}
console.log(`P45.13 UI integration audit verification: PASS (${checks.length} checks)`);
