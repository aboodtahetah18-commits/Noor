import { spawnSync } from 'node:child_process';

const steps = [
  ['npm configuration contract','node',['scripts/ensure-npmrc.mjs']],
  ['environment example contract','node',['scripts/ensure-env-example.mjs']],
  ['project execution contract','node',['scripts/verify-project-execution-contract.mjs']],
  ['design system contract','node',['scripts/verify-design-system-contract.mjs']],
  ['NDOS v1.2 frozen identity contract','node',['scripts/verify-ndos-frozen-contract.mjs']],
  ['NDOS final visual authority contract','node',['scripts/verify-ndos-authority-contract.mjs']],
  ['NDOS stage 3 surface contract','node',['scripts/verify-ndos-stage3-surface-contract.mjs']],
  ['NDOS final visual acceptance','node',['scripts/verify-ndos-final-visual-acceptance.mjs']],
  ['approved Namaa brand assets contract','node',['scripts/verify-approved-brand-assets.mjs']],
  ['strict visual identity authority','node',['scripts/verify-visual-identity-authority.mjs']],
  ['interaction capabilities contract','node',['scripts/verify-interaction-capabilities-contract.mjs']],
  ['auth lifecycle contract','node',['scripts/verify-auth-lifecycle-contract.mjs']],
  ['Lucide icon contract','node',['scripts/verify-lucide-icon-contract.mjs']],
  ['UI token compliance','node',['scripts/verify-ui-token-compliance.mjs']],
  ['chat UI integrity contract','node',['scripts/verify-chat-ui-integrity.mjs']],
  ['dependency policy','node',['scripts/verify-dependency-policy.mjs']],
  ['database provider policy','node',['scripts/verify-database-provider-policy.mjs']],
  ['algorithm governance schema contract','node',['scripts/verify-algorithm-governance-schema-contract.mjs']],
  ['financial responsibility roles contract','node',['scripts/verify-financial-responsibility-roles.mjs']],
  ['financial cycle allocation contract','node',['scripts/verify-financial-cycle-allocation.mjs']],
  ['financial cycle negotiation contract','node',['scripts/verify-financial-cycle-negotiation.mjs']],
  ['allocation ratification contract','node',['scripts/verify-allocation-ratification.mjs']],
  ['allocation plan materialization contract','node',['scripts/verify-allocation-plan-materialization.mjs']],
  ['financial plan monitoring contract','node',['scripts/verify-financial-plan-monitoring.mjs']],
  ['financial plan deviation contract','node',['scripts/verify-financial-plan-deviation.mjs']],
  ['financial plan deviation resolution contract','node',['scripts/verify-financial-plan-deviation-resolution.mjs']],
  ['financial cycle closure contract','node',['scripts/verify-financial-cycle-closure.mjs']],
  ['financial cycle carry-forward contract','node',['scripts/verify-financial-cycle-carry-forward.mjs']],
  ['governor pre-meeting brief contract','node',['scripts/verify-governor-pre-meeting-brief.mjs']],
  ['financial meeting opening agenda contract','node',['scripts/verify-financial-meeting-opening-agenda.mjs']],
  ['financial meeting agenda tracking contract','node',['scripts/verify-financial-meeting-agenda-tracking.mjs']],
  ['allocation final proposal contract','node',['scripts/verify-allocation-final-proposal.mjs']],
  ['allocation decision minutes contract','node',['scripts/verify-allocation-decision-minutes.mjs']],
  ['institutional decision registry contract','node',['scripts/verify-institutional-decision-registry.mjs']],
  ['institutional decision followup lifecycle contract','node',['scripts/verify-institutional-decision-followup-lifecycle.mjs']],
  ['authorization RBAC ABAC contract','node',['scripts/verify-authorization-contract.mjs']],
  ['authorization provisioning contract','node',['scripts/verify-authorization-provisioning-contract.mjs']],
  ['authorization admin console contract','node',['scripts/verify-authorization-admin-console-contract.mjs']],
  ['authorization bootstrap E2E contract','node',['scripts/verify-authorization-bootstrap-e2e-contract.mjs']],
  ['authorization operational E2E contract','node',['scripts/verify-authorization-operational-e2e-contract.mjs']],
  ['governance action surface contract','node',['scripts/verify-governance-action-surface.mjs']],
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
