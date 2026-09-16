import fs from 'node:fs';

const read=(path)=>fs.readFileSync(path,'utf8');
const assert=(condition,message)=>{ if(!condition){ console.error(`AUTHORIZATION-OPERATIONAL-E2E-CONTRACT-FAIL ${message}`); process.exit(1); } };

const migration=read('database/migrations/20260917_072_authorization_provisioning_three_actor_sod.sql');
const templateService=read('src/features/governance/services/authorization-template-provisioning-service.ts');
const templatePage=read('src/app/(protected)/governance/authorization/templates/page.tsx');
const templateAction=read('src/app/(protected)/governance/authorization/templates/actions.ts');
const operationalTest=read('src/governance/authorization-operational-e2e.test.ts');

assert(migration.includes('PROVISIONING_REQUESTER_APPROVER_SOD_VIOLATION'),'requester/approver DB SoD missing');
assert(migration.includes('PROVISIONING_REQUESTER_APPLIER_SOD_VIOLATION'),'requester/applier DB SoD missing');
assert(migration.includes('PROVISIONING_APPROVER_APPLIER_SOD_VIOLATION'),'approver/applier DB SoD missing');
assert(templateService.includes('requestAuthorizationProvisioning'),'template service must create governed provisioning request');
assert(!templateService.includes('insert into public.authorization_grants'),'template service must not write grants directly');
assert(templatePage.includes("action:'ADMINISTER'"),'template page must require ADMINISTER authorization');
assert(templateAction.includes('requireAuthenticatedMutationUser'),'template action must authenticate mutation actor');
assert(operationalTest.includes('SOD_PROPOSAL_CREATOR_CANNOT_APPROVE'),'proposal SoD scenario missing');
assert(operationalTest.includes('SOD_HIGH_MATERIALITY_RELEASE_CREATOR_CANNOT_BE_APPROVER'),'release SoD scenario missing');
assert(operationalTest.includes('BREAK_GLASS_ACTION_FORBIDDEN:RELEASE'),'break glass execution boundary missing');

console.log('AUTHORIZATION-OPERATIONAL-E2E-CONTRACT-PASS');
