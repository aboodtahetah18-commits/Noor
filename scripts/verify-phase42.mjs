import fs from 'node:fs';
const read=(p)=>fs.readFileSync(new URL(`../${p}`, import.meta.url),'utf8');
const pkg=JSON.parse(read('package.json'));
const page=read('src/app/(public)/login/page.tsx');
const css=read('src/app/globals.css');
const form=read('src/app/(public)/login/bootstrap-owner-form.tsx');
const checks=[
 ['Phase 42+ version',/^0\.(4[3-9]|[5-9][0-9])\./.test(pkg.version)],
 ['P42 visual shell retained',css.includes('auth-page-v42') && css.includes('@keyframes auth-shine')],
 ['owner bootstrap UI retained',form.includes('إنشاء حساب المالك')],
 ['current version visible',page.includes(`v${pkg.version}`)],
];
for(const [n,ok] of checks){ if(!ok){ console.error(`FAIL: ${n}`); process.exit(1);} }
console.log(`Phase 42 compatibility verification: PASS (${checks.length} checks)`);
