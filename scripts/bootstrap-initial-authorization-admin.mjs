import { neon } from '@neondatabase/serverless';

const enabled = process.env.ALLOW_AUTHORIZATION_BOOTSTRAP === 'true';
const databaseUrl = process.env.DATABASE_URL?.trim() || process.env.DATABASEURL?.trim();
const targetUserId = process.env.AUTHORIZATION_BOOTSTRAP_TARGET_USER_ID?.trim();
const requesterRef = process.env.AUTHORIZATION_BOOTSTRAP_REQUESTER_REF?.trim();
const approverRef = process.env.AUTHORIZATION_BOOTSTRAP_APPROVER_REF?.trim();
const rationale = process.env.AUTHORIZATION_BOOTSTRAP_RATIONALE?.trim();

const fail = (message) => { console.error(`AUTHORIZATION-BOOTSTRAP-FAIL ${message}`); process.exit(1); };

if (!enabled) fail('ALLOW_AUTHORIZATION_BOOTSTRAP must equal true');
if (!databaseUrl) fail('DATABASE_URL is required');
if (!targetUserId) fail('AUTHORIZATION_BOOTSTRAP_TARGET_USER_ID is required');
if (!requesterRef || requesterRef.length < 3) fail('AUTHORIZATION_BOOTSTRAP_REQUESTER_REF is required');
if (!approverRef || approverRef.length < 3) fail('AUTHORIZATION_BOOTSTRAP_APPROVER_REF is required');
if (requesterRef === approverRef) fail('requester and approver references must be different');
if (!rationale || rationale.length < 30) fail('AUTHORIZATION_BOOTSTRAP_RATIONALE must contain at least 30 characters');

const sql = neon(databaseUrl);
try {
  const rows = await sql`
    select assignment_id::text, grant_id::text
    from public.bootstrap_initial_authorization_admin(
      ${targetUserId}::uuid,
      ${requesterRef},
      ${approverRef},
      ${rationale}
    )
  `;
  const row = rows[0];
  if (!row) fail('bootstrap function returned no record');
  console.log(`AUTHORIZATION-BOOTSTRAP-PASS target=${targetUserId} assignment=${row.assignment_id} grant=${row.grant_id}`);
  console.log('Bootstrap is now permanently closed. All later changes must use governed provisioning.');
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
