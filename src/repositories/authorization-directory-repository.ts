import { rawSql } from '@/infrastructure/db/client';

export interface AuthorizationDirectoryUser {
  id: string;
  displayName: string;
}

export async function listAuthorizationDirectoryUsers(): Promise<AuthorizationDirectoryUser[]> {
  const rows = await rawSql`
    select id::text, coalesce(nullif(trim(display_name),''), id::text) as display_name
    from public.profiles
    order by display_name asc nulls last
    limit 500
  `;
  return rows.map((row) => ({ id: String(row.id), displayName: String(row.display_name) }));
}
