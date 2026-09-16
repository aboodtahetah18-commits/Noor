import fs from 'node:fs';

const read=(path)=>fs.readFileSync(path,'utf8');
const requireText=(text,needle,label)=>{if(!text.includes(needle)){console.error(`AUTHORIZATION-BOOTSTRAP-TEMPLATE-CONTRACT-FAIL ${label}`);process.exit(1)}};
const forbidText=(text,needle,label)=>{if(text.includes(needle)){console.error(`AUTHORIZATION-BOOTSTRAP-TEMPLATE-CONTRACT-FAIL ${label}`);process.exit(1)}};

const bootstrapMigration=read('database/migrations/20260917_072_authorization_initial_admin_bootstrap.sql');
const sodMigration=read('database/migrations/20260917_073_authorization_provisioning_three_actor_sod.sql');
const bootstrapScript=read('scripts/bootstrap-initial-authorization-admin.mjs');
const templates=read('src/governance/authorization-role-templates.ts');
const atomicRepository=read('src/repositories/authorization-provisioning-atomic-repository.ts');
const legacyRepository=read('src/repositories/authorization-provisioning-repository.ts');
const navRepository=read('src/repositories/authorization-navigation-repository.ts');
const protectedLayout=read('src/app/(protected)/layout.tsx');
const desktopNav=read('src/app/(protected)/desktop-top-nav.tsx');
const templateService=read('src/features/governance/services/request-authorization-role-template.ts');

requireText(bootstrapMigration,"INITIAL_ADMIN_V1",'bootstrap must be singleton-keyed');
requireText(bootstrapMigration,"requester_ref <> approver_ref",'bootstrap must require independent operator references');
requireText(bootstrapMigration,"authorization administrator already exists; use governed provisioning",'bootstrap must refuse when an admin already exists');
requireText(bootstrapMigration,"prevent_authorization_bootstrap_mutation",'bootstrap record must be immutable');
requireText(bootstrapScript,"ALLOW_AUTHORIZATION_BOOTSTRAP === 'true'",'operator script must require explicit enable flag');
requireText(bootstrapScript,'AUTHORIZATION_BOOTSTRAP_TARGET_USER_ID','operator script must target an explicit user');

forbidText(templates,"action: 'ADMINISTER'",'operating templates must never grant ADMINISTER');
requireText(templates,"scopeMode: 'BANK_REQUIRED'",'bank templates must support mandatory scope');
requireText(templates,"scopeMode: 'COMMITTEE_REQUIRED'",'committee templates must support mandatory scope');
requireText(templateService,"action: 'ADMINISTER'",'template provisioning caller must itself be authorized');
requireText(templateService,'authorizationProvisioningRepository.createRequest','templates must create governed requests only');

requireText(sodMigration,'PROVISIONING_APPLIER_MUST_DIFFER_FROM_REQUESTER','database must separate requester and applier');
requireText(sodMigration,'PROVISIONING_APPLIER_MUST_DIFFER_FROM_APPROVER','database must separate approver and applier');
requireText(atomicRepository,'apply_authorization_provisioning_with_sod','runtime apply must use three-actor database gate');
forbidText(legacyRepository,'async applyApprovedRequest(','legacy non-atomic apply method must stay removed');

requireText(navRepository,"g.action='ADMINISTER'",'navigation visibility must require an ADMINISTER grant');
requireText(protectedLayout,'hasAuthorizationAdminNavigationAccess','protected layout must derive authorization navigation visibility server-side');
requireText(desktopNav,'showAuthorizationAdmin','desktop navigation must hide authorization routes by default');

console.log('AUTHORIZATION-BOOTSTRAP-TEMPLATE-CONTRACT-PASS');
