import { createHash, randomUUID } from 'node:crypto';
import process from 'node:process';
import { neon } from '@neondatabase/serverless';

const databaseUrl=(process.env.DATABASE_URL||process.env.DATABASEURL||'').trim();
const userId=(process.env.AUTHORIZATION_BOOTSTRAP_USER_ID||'').trim();
const token=(process.env.AUTHORIZATION_BOOTSTRAP_TOKEN||'').trim();
const reason=(process.env.AUTHORIZATION_BOOTSTRAP_REASON||'').trim();
const confirm=(process.env.AUTHORIZATION_BOOTSTRAP_CONFIRM||'').trim();

if(!databaseUrl) throw new Error('AUTHORIZATION_BOOTSTRAP_DATABASE_REQUIRED');
if(!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error('AUTHORIZATION_BOOTSTRAP_USER_ID_REQUIRED');
if(token.length<32) throw new Error('AUTHORIZATION_BOOTSTRAP_TOKEN_TOO_SHORT');
if(reason.length<20) throw new Error('AUTHORIZATION_BOOTSTRAP_REASON_REQUIRED');
if(confirm!=='INITIAL_ADMINISTER_V1') throw new Error('AUTHORIZATION_BOOTSTRAP_EXPLICIT_CONFIRMATION_REQUIRED');

const sql=neon(databaseUrl);
const bootstrapId=randomUUID();
const assignmentId=randomUUID();
const grantId=randomUUID();
const fingerprint=createHash('sha256').update(token).digest('hex').slice(0,24);

const existing=await sql`select id::text from public.authorization_bootstrap_events where singleton_key='INITIAL_ADMINISTER_V1' limit 1`;
if(existing[0]) throw new Error('AUTHORIZATION_BOOTSTRAP_ALREADY_COMPLETED');

const profile=await sql`select id::text from public.profiles where id=${userId}::uuid limit 1`;
if(!profile[0]) throw new Error('AUTHORIZATION_BOOTSTRAP_PROFILE_NOT_FOUND');

const activeAdmin=await sql`
  select 1
  from public.authorization_role_assignments a
  join public.authorization_grants g on g.role=a.role and g.action='ADMINISTER' and g.object_type='AUDIT_EVENT' and g.is_active=true
  where a.status='ACTIVE' and a.starts_at<=now() and (a.ends_at is null or a.ends_at>now())
  limit 1
`;
if(activeAdmin[0]) throw new Error('AUTHORIZATION_BOOTSTRAP_ACTIVE_ADMIN_ALREADY_EXISTS');

await sql.transaction([
  sql`select pg_advisory_xact_lock(hashtext('namaa:authorization:bootstrap:v1'))`,
  sql`insert into public.authorization_bootstrap_events
      (id,singleton_key,bootstrap_user_id,role_assignment_id,administer_grant_id,token_fingerprint,operator_reason)
      values (${bootstrapId}::uuid,'INITIAL_ADMINISTER_V1',${userId}::uuid,${assignmentId}::uuid,${grantId}::uuid,${fingerprint},${reason})`,
  sql`insert into public.authorization_role_assignments
      (id,user_id,role,status,starts_at,created_by)
      values (${assignmentId}::uuid,${userId}::uuid,'CENTRAL_BOARD_MEMBER','ACTIVE',now(),${userId}::uuid)`,
  sql`insert into public.authorization_grants
      (id,role,action,object_type,policy_version,is_active)
      values (${grantId}::uuid,'CENTRAL_BOARD_MEMBER','ADMINISTER','AUDIT_EVENT','RBAC_ABAC_v1.0',true)`,
  sql`insert into public.authorization_admin_events
      (id,actor_user_id,event_type,target_user_id,object_type,object_id,reason,context_json)
      values (${randomUUID()}::uuid,${userId}::uuid,'AUTHORIZATION_BOOTSTRAPPED',${userId}::uuid,'AUDIT_EVENT',${bootstrapId},${reason},${JSON.stringify({mode:'OPERATOR_ONLY',singleton:'INITIAL_ADMINISTER_V1',tokenFingerprint:fingerprint})}::jsonb)`
]);

console.log(`AUTHORIZATION-BOOTSTRAP-PASS user=${userId} event=${bootstrapId} fingerprint=${fingerprint}`);
