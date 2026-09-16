import fs from 'node:fs';

const files = {
  schema: 'src/infrastructure/db/authorization-schema.ts',
  policy: 'src/governance/authorization-policy.ts',
  repository: 'src/repositories/authorization-repository.ts',
  migration: 'database/migrations/20260916_069_authorization_rbac_abac.sql',
};

for (const [name, path] of Object.entries(files)) {
  if (!fs.existsSync(path)) throw new Error(`AUTHORIZATION_CONTRACT_MISSING_${name.toUpperCase()}:${path}`);
}

const schema = fs.readFileSync(files.schema, 'utf8');
const policy = fs.readFileSync(files.policy, 'utf8');
const repository = fs.readFileSync(files.repository, 'utf8');
const migration = fs.readFileSync(files.migration, 'utf8');

const tables = [
  'authorization_role_assignments',
  'authorization_grants',
  'authorization_delegations',
  'authorization_events',
];
for (const table of tables) {
  if (!schema.includes(`'${table}'`)) throw new Error(`AUTHORIZATION_DRIZZLE_TABLE_MISSING:${table}`);
  if (!migration.includes(`public.${table}`)) throw new Error(`AUTHORIZATION_MIGRATION_TABLE_MISSING:${table}`);
}

for (const role of ['USER','CENTRAL_BOARD_MEMBER','CENTRAL_BANK_MANAGER','BANK_MANAGER','COMMITTEE_CHAIR','COMMITTEE_MEMBER','ADVISOR','AUDITOR','SYSTEM_SERVICE']) {
  if (!policy.includes(`'${role}'`)) throw new Error(`AUTHORIZATION_POLICY_ROLE_MISSING:${role}`);
  if (!migration.includes(`'${role}'`)) throw new Error(`AUTHORIZATION_MIGRATION_ROLE_MISSING:${role}`);
}

for (const action of ['READ','RECOMMEND','REVIEW','APPROVE','REJECT','VERIFY_EVIDENCE','RELEASE','ROLLBACK','EXPORT']) {
  if (!policy.includes(`'${action}'`)) throw new Error(`AUTHORIZATION_POLICY_ACTION_MISSING:${action}`);
  if (!migration.includes(`'${action}'`)) throw new Error(`AUTHORIZATION_MIGRATION_ACTION_MISSING:${action}`);
}

if (!policy.includes('NO_EXPLICIT_GRANT_MATCHED')) throw new Error('AUTHORIZATION_DENY_DEFAULT_MISSING');
if (!policy.includes('SOD_PROPOSAL_CREATOR_CANNOT_APPROVE')) throw new Error('AUTHORIZATION_SOD_PROPOSAL_GUARD_MISSING');
if (!policy.includes('ADVISOR_CANNOT_EXERCISE_GOVERNANCE_APPROVAL')) throw new Error('AUTHORIZATION_ADVISOR_APPROVAL_GUARD_MISSING');
if (!migration.includes('prevent_authorization_events_mutation')) throw new Error('AUTHORIZATION_APPEND_ONLY_AUDIT_GUARD_MISSING');
if (!repository.includes('insert into public.authorization_events')) throw new Error('AUTHORIZATION_AUDIT_WRITE_MISSING');
if (!repository.includes("status='ACTIVE'")) throw new Error('AUTHORIZATION_ACTIVE_ASSIGNMENT_OR_DELEGATION_GUARD_MISSING');
if (!migration.includes('No implicit grants are seeded here')) throw new Error('AUTHORIZATION_NO_IMPLICIT_GRANTS_CONTRACT_MISSING');

console.log('AUTHORIZATION-CONTRACT-PASS');
