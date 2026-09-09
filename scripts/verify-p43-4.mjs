import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const pkg=JSON.parse(read('package.json'));
const page=read('src/app/(protected)/onboarding/accounts/page.tsx');
const action=read('src/app/(protected)/onboarding/actions.ts');
const css=read('src/app/globals.css');
const checks=[
 ['version',pkg.version==='0.43.4'],
 ['merged visible account field',page.includes('name="name" list="account-name-options"')&&!page.includes('name="accountType"')],
 ['bank choose or type',page.includes('name="bankName" list="bank-name-options"')&&!page.includes('اسم البنك/الجهة الأخرى')],
 ['no account number input',!page.includes('name="accountNumber"')],
 ['IBAN retained',page.includes('name="iban"')],
 ['account type derived internally',action.includes('deriveAccountType(name)')],
 ['account identifier derived from IBAN',action.includes('iban.slice(6)')],
 ['help disclosure removed',!page.includes('HelpDisclosure')&&!fs.existsSync(path.join(root,'src/components/help/help-disclosure.tsx'))],
 ['help UI styling removed',!css.includes('.help-disclosure')],
 ['saved values feed suggestions',page.includes('accounts.map((a) => a.name)')&&page.includes('accounts.map((a) => a.bankName)')],
];
let failed=0; for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)failed++;}
if(failed)process.exit(1); console.log(`P43.4 verification: PASS (${checks.length}/${checks.length})`);
