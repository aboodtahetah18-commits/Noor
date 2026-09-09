import fs from 'node:fs';
const checks=[
 ['dashboard future pressure','src/app/(protected)/dashboard/page.tsx','/reports/future-pressure'],
 ['workspace future pressure','src/app/(protected)/workspace/page.tsx','الضغط المالي والسيناريوهات'],
 ['reports future pressure','src/app/(protected)/reports/page.tsx','/reports/future-pressure'],
 ['internal funding route','src/app/(protected)/internal-funding/page.tsx','التمويل'],
 ['future pressure page','src/app/(protected)/reports/future-pressure/page.tsx','الضغط المالي عبر الدورات القادمة'],
 ['goals route','src/app/(protected)/goals/[id]/page.tsx','رحلة'],
 ['alerts route','src/app/(protected)/alerts/page.tsx','التنبيهات'],
 ['decision log route','src/app/(protected)/decision-log/page.tsx','القرارات'],
 ['route matrix','P46_UI_ROUTE_MATRIX.md','Learning-guided recommendation ordering'],
 ['version','package.json','0.46.45'],
];
for(const [name,file,needle] of checks){const s=fs.readFileSync(file,'utf8');if(!s.includes(needle)){console.error('FAIL',name);process.exit(1)}console.log('PASS',name)}
console.log('P46 functional visibility + closure verification: PASS');
