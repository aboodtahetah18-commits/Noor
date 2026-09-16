import fs from 'node:fs';

function read(path){return fs.readFileSync(path,'utf8');}
function requireText(source,needle,label){if(!source.includes(needle)){console.error(`AUTHORIZATION-PROVISIONING-CONTRACT-FAIL ${label}`);process.exit(1)}}
function requirePattern(source,pattern,label){if(!pattern.test(source)){console.error(`AUTHORIZATION-PROVISIONING-CONTRACT-FAIL ${label}`);process.exit(1)}}

const migration=read('database/migrations/20260916_070_authorization_provisioning.sql');
const policy=read('src/governance/authorization-provisioning-policy.ts');
const runtime=read('src/repositories/authorization-repository.ts');
const service=read('src/features/governance/services/authorization-provisioning-service.ts');

for(const table of ['authorization_provisioning_requests','authorization_break_glass_sessions','authorization_admin_events']){
  requireText(migration,table,`missing ${table}`);
}
requireText(migration,"approved_by <> requested_by",'independent approval DB constraint missing');
requireText(migration,"interval '60 minutes'",'break-glass 60 minute DB cap missing');
requireText(migration,'prevent_authorization_admin_events_mutation','immutable admin audit missing');
requireText(migration,'authorization_role_assignment_request_uq','role assignment provisioning idempotency missing');
requireText(migration,'authorization_grant_request_uq','grant provisioning idempotency missing');
requireText(migration,'authorization_delegation_request_uq','delegation provisioning idempotency missing');

for(const action of ['APPROVE','REJECT','RELEASE','ROLLBACK','ADMINISTER','EXECUTE_REQUEST','ASSIGN','CLOSE']){
  requireText(policy,`'${action}'`,`policy must forbid break-glass ${action}`);
  requireText(runtime,`'${action}'`,`runtime must forbid break-glass ${action}`);
}
requirePattern(runtime,/grantId\s*:\s*`breakglass:/,'runtime break-glass trace id missing');
requirePattern(runtime,/actors\.some\s*\(\s*\(actor\)\s*=>\s*actor\.role\s*===\s*role\s*\)/,'break-glass active-role binding missing');
requireText(service,"action: 'ADMINISTER'",'provisioning service ADMINISTER gate missing');
requireText(service,'approveAuthorizationProvisioning','approval service missing');
requireText(service,'applyAuthorizationProvisioning','apply service missing');
requireText(service,'revokeBreakGlassAccess','break-glass revoke service missing');

console.log('AUTHORIZATION-PROVISIONING-CONTRACT-PASS');
