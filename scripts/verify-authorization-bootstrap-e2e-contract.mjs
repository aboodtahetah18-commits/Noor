import fs from 'node:fs';

function read(path){return fs.readFileSync(path,'utf8')}
function requireText(source,text,label){if(!source.includes(text)){console.error(`AUTHORIZATION-BOOTSTRAP-E2E-CONTRACT-FAIL ${label}`);process.exit(1)}}
function forbidText(source,text,label){if(source.includes(text)){console.error(`AUTHORIZATION-BOOTSTRAP-E2E-CONTRACT-FAIL ${label}`);process.exit(1)}}

const bootstrap=read('scripts/bootstrap-authorization-admin.mjs');
const migration=read('database/migrations/20260917_072_authorization_bootstrap_guard.sql');
const repo=read('src/repositories/authorization-provisioning-repository.ts');
const atomic=read('src/repositories/authorization-provisioning-atomic-repository.ts');
const more=read('src/app/(protected)/more/page.tsx');
const templates=read('src/governance/authorization-role-templates.ts');

requireText(bootstrap,"AUTHORIZATION_BOOTSTRAP_CONFIRM",'bootstrap requires explicit operator confirmation');
requireText(bootstrap,"AUTHORIZATION_BOOTSTRAP_TOKEN",'bootstrap requires operator token');
requireText(bootstrap,"AUTHORIZATION_BOOTSTRAP_ACTIVE_ADMIN_ALREADY_EXISTS",'bootstrap refuses when an administrator already exists');
requireText(bootstrap,"pg_advisory_xact_lock",'bootstrap holds a database advisory transaction lock');
requireText(migration,"INITIAL_ADMINISTER_V1",'bootstrap database singleton is permanent');
requireText(migration,"unique",'bootstrap singleton is database-enforced');
forbidText(repo,'applyApprovedRequest(', 'legacy non-atomic apply path must not exist');
requireText(atomic,'apply_authorization_provisioning','production apply must use atomic database function');
requireText(more,"action:'ADMINISTER'",'authorization navigation must be capability-gated');
requireText(more,"authorizationAdmin.decision==='ALLOW'",'authorization navigation must be hidden without explicit allow');
requireText(templates,"role:'ADVISOR', action:'RECOMMEND'",'advisor template remains recommendation-only');
for (const forbidden of ["role:'ADVISOR', action:'APPROVE'","role:'ADVISOR', action:'RELEASE'","role:'ADVISOR', action:'ROLLBACK'","role:'ADVISOR', action:'ADMINISTER'"]) {
  forbidText(templates,forbidden,`forbidden advisor template ${forbidden}`);
}

console.log('AUTHORIZATION-BOOTSTRAP-E2E-CONTRACT-PASS');
