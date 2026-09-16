import { rawSql } from '@/infrastructure/db/client';

/** Navigation visibility only. This is not an authorization boundary. */
export async function hasAuthorizationAdminNavigationAccess(userId: string): Promise<boolean> {
  const rows = await rawSql`
    select 1
    from public.authorization_role_assignments a
    join public.authorization_grants g
      on g.role=a.role
     and g.is_active=true
     and g.action='ADMINISTER'
     and g.object_type='AUDIT_EVENT'
     and g.principal_user_id=a.user_id
    where a.user_id=${userId}::uuid
      and a.status='ACTIVE'
      and a.starts_at<=now()
      and (a.ends_at is null or a.ends_at>now())
      and (g.bank_key is null or g.bank_key=a.bank_key)
      and (g.committee_id is null or g.committee_id=a.committee_id)
    limit 1
  `;
  return Boolean(rows[0]);
}
