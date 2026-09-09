import fs from 'node:fs';
const checks=[
 ['advisor command center','src/app/(protected)/advisor/page.tsx','مركز التوصيات والقرار'],
 ['advisor exact totals','src/app/(protected)/advisor/page.tsx','newSummary.total'],
 ['alerts attention center','src/app/(protected)/alerts/page.tsx','ما الذي يحتاج تدخلًا الآن؟'],
 ['decision audit','src/app/(protected)/decision-log/page.tsx','سجل القرارات والأثر المالي'],
 ['future pressure radar','src/app/(protected)/reports/future-pressure/page.tsx','رادار الضغط المالي القادم'],
 ['cycle report p47 shell','src/features/reports/components/cycle-report-view.tsx','p47-analysis-page'],
 ['responsive analysis css','src/app/globals.css','P47.7 + P47.8 — Analysis, advisor, alerts and decision center'],
 ['version','package.json','0.47.8'],
];
for(const [name,file,needle] of checks){const s=fs.readFileSync(file,'utf8');if(!s.includes(needle)){console.error('FAIL',name);process.exit(1)}console.log('PASS',name)}
console.log('P47.7/P47.8 structural verification: PASS');
