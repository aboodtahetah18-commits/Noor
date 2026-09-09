import { readFileSync } from 'node:fs';
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const page=readFileSync('src/app/(protected)/transactions/page.tsx','utf8');
const css=readFileSync('src/app/globals.css','utf8');
const icons=readFileSync('src/components/ui/action-icon.tsx','utf8');
const gate=readFileSync('scripts/production-quality-gate.mjs','utf8');
const atLeast=(v,maj,min,patch)=>{const [a,b,c]=v.split('.').map(Number);return a>maj||(a===maj&&(b>min||(b===min&&c>=patch)));};
const checks=[
 ['version',atLeast(pkg.version,0,49,12)],
 ['quality gate wiring',gate.includes('verify-p49-12.mjs')],
 ['ledger compact main row',page.includes('p4912-ledger-main')&&page.includes('p4912-ledger-title')],
 ['bank action removed from focused ledger',!page.includes('BankMessageDialogTrigger')&&!page.includes('name="bankMessage"')],
 ['operations action removed from focused ledger',!page.includes('href="/bank-operations"')&&!page.includes('name="operations"')],
 ['help removed from ledger header',!page.includes('HelpDisclosure')&&!page.includes('title-with-help')],
 ['actions not in legacy page actions block',!page.includes('<div className="p47-page-actions"><Link className="p47-primary-action" href="/bank-operations#add-message"')],
 ['status retained compactly',page.includes('p4912-ledger-status')&&page.includes('عملية مطابقة')],
 ['mobile compact sizing',css.includes('@media(max-width:767px)')&&css.includes('.p4912-ledger-heading{padding:var(--ux-space-3) var(--ux-space-4)!important')],
 ['dedicated icons',icons.includes("bankMessage:")&&icons.includes("operations:")]
];
console.log('=== P49.12 mobile ledger compact header ===');
let failed=0; for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}
if(failed)process.exit(1);
console.log('P49.12 mobile ledger compact header: PASS');
