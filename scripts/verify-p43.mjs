import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const pkg=JSON.parse(read('package.json'));
const actions=read('src/app/(protected)/onboarding/actions.ts');
const plan=read('src/app/(protected)/onboarding/plan/page.tsx');
const resolver=read('src/features/onboarding/queries/resolve-onboarding-route.ts');
const mobile=read('src/app/(protected)/mobile-bottom-nav.tsx');
const desktop=read('src/app/(protected)/desktop-top-nav.tsx');
const tablet=read('src/app/(protected)/tablet-top-nav.tsx');
const checks=[
 ['version 0.43.2',pkg.version==='0.43.2'],
 ['resume resolver exists',resolver.includes('resolveOnboardingRoute')],
 ['plan created inside onboarding',actions.includes('createOnboardingPlanAction')&&plan.includes('createOnboardingPlanAction')],
 ['plan approved inside onboarding',actions.includes('approveOnboardingPlanAction')&&plan.includes('approveOnboardingPlanAction')],
 ['draft cycle used directly',plan.includes('status.cycleId')],
 ['completion remains guarded by ACTIVE_PLAN',read('src/features/onboarding/commands/finalize-onboarding.ts').includes("planStatus!=='ACTIVE_PLAN'")],
 ['mobile nav hidden',mobile.includes("pathname.startsWith('/onboarding')")],
 ['desktop nav hidden',desktop.includes("pathname.startsWith('/onboarding')")],
 ['tablet nav hidden',tablet.includes("pathname.startsWith('/onboarding')")],
];
let failed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} - ${name}`);if(!ok)failed++;}
if(failed)process.exit(1);console.log(`P43 operational verification: PASS (${checks.length} checks)`);
