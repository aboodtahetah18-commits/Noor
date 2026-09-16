import fs from 'node:fs';

const migration=fs.readFileSync('database/migrations/20260916_071_authorization_provisioning_atomic_apply.sql','utf8');
const service=fs.readFileSync('src/features/governance/services/authorization-provisioning-service.ts','utf8');
const page=fs.readFileSync('src/app/(protected)/governance/authorization/page.tsx','utf8');
const actions=fs.readFileSync('src/app/(protected)/governance/authorization/actions.ts','utf8');

const checks=[
  [migration.includes('apply_authorization_provisioning'), 'database atomic apply function missing'],
  [migration.includes('for update'), 'provisioning request row lock missing'],
  [migration.includes("status='APPLIED'") || migration.includes("status = 'APPLIED'"), 'atomic apply status transition missing'],
  [migration.includes("'PROVISIONING_APPLIED'"), 'atomic apply audit event missing'],
  [service.includes('authorizationProvisioningAtomicRepository.applyApprovedRequest'), 'service does not use atomic apply boundary'],
  [!service.includes('authorizationProvisioningRepository.applyApprovedRequest'), 'legacy non-atomic apply is still wired to production service'],
  [page.includes("action:'ADMINISTER'") || page.includes("action: 'ADMINISTER'"), 'admin console is not gated by ADMINISTER'],
  [page.includes('getAuthorizationAdminSnapshot'), 'admin console lacks authoritative operational snapshot'],
  [actions.includes('requireAuthenticatedMutationUser'), 'admin console mutations are not authenticated server actions'],
  [actions.includes('approveAuthorizationProvisioning') && actions.includes('applyAuthorizationProvisioning'), 'governed approval/apply actions missing'],
];

const failed=checks.filter(([ok])=>!ok).map(([,message])=>message);
if(failed.length){
  console.error('AUTHORIZATION-ADMIN-CONSOLE-CONTRACT-FAIL');
  for(const message of failed) console.error(`- ${message}`);
  process.exit(1);
}
console.log('AUTHORIZATION-ADMIN-CONSOLE-CONTRACT-PASS');
