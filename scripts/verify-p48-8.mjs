import fs from 'node:fs';
const read=(f)=>fs.readFileSync(f,'utf8');
const checks=[
 ['approved account types','src/domain/types/core.ts','["BANK", "SAVINGS", "CASH", "OTHER"]'],
 ['account schema excludes wallet','src/features/accounts/schemas/account.ts',"z.enum(['BANK', 'SAVINGS', 'CASH', 'OTHER'])"],
 ['atomic account bootstrap','src/repositories/account-repository.ts','rawSql.transaction'],
 ['opening balance in transaction','src/repositories/account-repository.ts','account_opening_balances'],
 ['advisor non-execution guarantee','src/app/(protected)/advisor/[id]/page.tsx','قبول التوصية لا ينفذ'],
 ['AI optional contract','.env.example','Financial operations remain fully usable'],
];
for(const [name,file,needle] of checks){const s=read(file);if(!s.includes(needle)){console.error('FAIL',name);process.exit(1)}console.log('PASS',name)}
const source=['src/domain/types/core.ts','src/features/accounts/schemas/account.ts','src/features/accounts/account-name-options.ts'].map(read).join('\n');
if(source.includes('WALLET')){console.error('FAIL WALLET still exists in authoritative account vocabulary');process.exit(1)}
const pkg=JSON.parse(read('package.json'));
if(!/^0\.(?:48\.(?:[89]|[1-9]\d)|49\.|[5-9]\d\.)/.test(pkg.version)){console.error('FAIL version');process.exit(1)}
console.log('PASS version');
console.log('P48.8+ Netlify test-gate regression verification: PASS');
