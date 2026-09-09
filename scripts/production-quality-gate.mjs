import { spawnSync } from 'node:child_process';

const steps = [
  ['npm configuration contract','node',['scripts/ensure-npmrc.mjs']],
  ['environment example contract','node',['scripts/ensure-env-example.mjs']],
  ['project execution contract','node',['scripts/verify-project-execution-contract.mjs']],
  ['design system contract','node',['scripts/verify-design-system-contract.mjs']],
  ['interaction capabilities contract','node',['scripts/verify-interaction-capabilities-contract.mjs']],
  ['Lucide icon contract','node',['scripts/verify-lucide-icon-contract.mjs']],
  ['UI token compliance','node',['scripts/verify-ui-token-compliance.mjs']],
  ['dependency policy','node',['scripts/verify-dependency-policy.mjs']],
  ['database provider policy','node',['scripts/verify-database-provider-policy.mjs']],
  ['route integrity','node',['scripts/verify-route-integrity.mjs']],
  ['runtime surface','node',['scripts/verify-runtime-surface.mjs']],
  ['Vercel deployment contract','node',['scripts/verify-vercel-deployment-contract.mjs']],
  ['lint','npm',['run','lint']],
  ['typecheck','npm',['run','typecheck']],
  ['tests','npm',['run','test']],
  ['production build','npm',['run','build']],
];
for (const [label,cmd,args] of steps) {
  console.log(`\n=== QUALITY GATE: ${label} ===`);
  const result=spawnSync(cmd,args,{stdio:'inherit',shell:process.platform==='win32'});
  if(result.error){console.error(`QUALITY-GATE-FAIL ${label}: ${result.error.message}`);process.exit(1)}
  if(result.status!==0){console.error(`QUALITY-GATE-FAIL ${label} exit=${result.status}`);process.exit(result.status??1)}
  console.log(`QUALITY-GATE-PASS ${label}`);
}
console.log('\nPRODUCTION-QUALITY-GATE-PASS');
