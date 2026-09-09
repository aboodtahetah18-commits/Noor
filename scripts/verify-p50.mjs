import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const exists=(p)=>fs.existsSync(path.join(root,p));
const pass=(m)=>console.log(`PASS ${m}`);
const fail=(m)=>{console.error(`P50-FAIL ${m}`);process.exitCode=1;};
const atLeast=(version,major,minor,patch)=>{const [a=0,b=0,c=0]=version.split('.').map(Number);if(a!==major)return a>major;if(b!==minor)return b>minor;return c>=patch;};
const pkg=JSON.parse(read('package.json'));
if(atLeast(pkg.version,0,50,0)) pass(`P50 version — ${pkg.version}`); else fail(`version ${pkg.version}`);

const requiredPages=[
  'dashboard','transactions','expenses','income','accounts','obligations','savings','emergency','goals','advisor','alerts','bank-statements','bank-operations','budget','reports','settings','more'
];
for(const r of requiredPages){
  const p=`src/app/(protected)/${r}/page.tsx`;
  if (exists(p)) pass(`critical page /${r}`);
  else fail(`missing critical page /${r}`);
}

const mutationAreas=[
  'accounts','advisor','alerts','bank-operations','bank-statements','budget-categories','budget','cycles','emergency','expenses','goals','income','internal-funding','obligations','onboarding','savings','settings','transactions'
];
for(const r of mutationAreas){
  const candidates=[`src/app/(protected)/${r}/actions.ts`, `src/app/(protected)/${r}/new/actions.ts`];
  if (candidates.some(exists)) pass(`server action surface ${r}`);
  else fail(`missing server action surface ${r}`);
}

for(const p of [
  'src/app/(public)/login/page.tsx',
  'src/app/(protected)/layout.tsx',
  'src/app/(protected)/loading.tsx',
  'src/app/(protected)/error.tsx',
  'src/app/(protected)/mobile-bottom-nav.tsx',
  'src/components/overlays/action-dialog.tsx',
  'src/app/api/health/route.ts',
  'src/app/api/ready/route.ts',
  'src/app/api/auth/[...all]/route.ts'
]) {
  if (exists(p)) pass(`runtime surface ${p}`);
  else fail(`missing runtime surface ${p}`);
}

const protectedLayout=read('src/app/(protected)/layout.tsx');
if (protectedLayout.includes('requireAuthenticatedUser')) pass('protected layout authentication guard');
else fail('protected layout auth guard missing');

const nav=read('src/app/(protected)/mobile-bottom-nav.tsx');
for (const r of ['/dashboard','/transactions','/advisor','/more']) {
  if (nav.includes(`'${r}'`)) pass(`mobile nav ${r}`);
  else fail(`mobile nav missing ${r}`);
}
// CR-002: the governed mobile bottom navigation has five destinations and intentionally
// does not contain an Add/Quick-Add item. A primary financial entry is a full-page flow.
const dashboard=read('src/app/(protected)/dashboard/page.tsx');
const mobileAddPage='src/app/(protected)/expenses/page.tsx';
const hasMobileAddEntrypoint = exists(mobileAddPage) && (dashboard.includes('href="/expenses"') || dashboard.includes("href='/expenses'"));
if (hasMobileAddEntrypoint) pass('mobile add entrypoint');
else fail('mobile add entrypoint missing');

const dialog=read('src/components/overlays/action-dialog.tsx');
for (const [label,ok] of [['native dialog element',dialog.includes('<dialog')],['aria modal',dialog.includes('aria-modal')],['escape/cancel handling',dialog.includes('onCancel')]]) {
  if (ok) pass(`dialog contract ${label}`);
  else fail(`dialog contract missing ${label}`);
}

const migrations=fs.readdirSync(path.join(root,'database/migrations')).filter(f=>f.endsWith('.sql'));
if (migrations.length === 66) pass('migration inventory — 66');
else fail(`migration inventory expected 66 got ${migrations.length}`);

const srcFiles=[];
function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(ts|tsx)$/.test(e.name))srcFiles.push(p)}}
walk(path.join(root,'src'));
const supabase=srcFiles.filter(p=>read(path.relative(root,p)).toLowerCase().includes('supabase'));
if (supabase.length === 0) pass('no Supabase runtime references');
else fail(`Supabase runtime references: ${supabase.map(p=>path.relative(root,p)).join(', ')}`);

const placeholders=[];
for(const p of srcFiles){const s=fs.readFileSync(p,'utf8');if(/href\s*=\s*["']#(?![A-Za-z0-9_-])/.test(s)||/javascript:\s*/i.test(s))placeholders.push(path.relative(root,p));}
if (placeholders.length === 0) pass('no placeholder links');
else fail(`placeholder links: ${placeholders.join(', ')}`);

if(process.exitCode) process.exit(process.exitCode);
console.log(`P50 full-system acceptance contract: PASS (${requiredPages.length} critical pages, ${mutationAreas.length} mutation surfaces, ${migrations.length} migrations)`);
