import { readFileSync } from 'node:fs';

const checks=[
  ['src/app/(protected)/layout.tsx',/FinancialFormIntelligence/,'global financial form intelligence'],
  ['src/app/(protected)/budget/new/page.tsx',/data-financial-calc="sum"/,'budget create auto total'],
  ['src/app/(protected)/budget/revise/page.tsx',/data-financial-calc="sum"/,'budget revise auto total'],
  ['src/app/(protected)/goals/new/page.tsx',/data-financial-calc="goal-new"/,'goal remaining calculation'],
  ['src/app/(protected)/goals/\[id\]/contribute/page.tsx',/data-financial-calc="remaining"/,'goal contribution remaining'],
  ['src/app/(protected)/savings/page.tsx',/data-financial-calc="remaining"/,'savings remaining'],
  ['src/app/(protected)/emergency/page.tsx',/data-financial-calc="remaining"/,'emergency remaining'],
  ['src/app/(protected)/transfers/new/page.tsx',/data-financial-calc="source-balance"/,'transfer source balance'],
  ['src/app/(protected)/income/page.tsx',/data-financial-calc="expected-difference"/,'income expected difference'],
  ['src/components/conversations/extended-profile-sheet.tsx',/monthlyRecurringTotal/,'budget behavior formula'],
  ['src/components/conversations/extended-profile-sheet.tsx',/maintenanceForecast/,'maintenance forecast formula'],
  ['src/components/conversations/extended-profile-sheet.tsx',/vehicleOptions/,'linked vehicle options'],
  ['src/app/globals.css',/SYSTEM-WIDE FINANCIAL FORM AUTHORITY/,'global modal authority'],
];

const failures=[];
for(const [path,pattern,label] of checks){
  let source='';
  try{source=readFileSync(path,'utf8')}catch{failures.push(`${label}: missing ${path}`);continue}
  if(!pattern.test(source)) failures.push(`${label}: contract missing in ${path}`);
}
if(failures.length){
  console.error('FINANCIAL-FORM-INTELLIGENCE-FAIL');
  for(const failure of failures) console.error(' - '+failure);
  process.exit(1);
}
console.log('FINANCIAL-FORM-INTELLIGENCE-PASS');
