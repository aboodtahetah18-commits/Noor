import { rawSql } from '@/infrastructure/db/client';

export type OwnerBootstrapStatus =
  | 'READY_TO_CREATE'
  | 'OWNER_EXISTS'
  | 'DATABASE_NOT_READY';

export async function getOwnerBootstrapStatus(): Promise<OwnerBootstrapStatus> {
  try {
    const rows = await rawSql`
      select count(*)::int as user_count
      from auth."user"
    `;
    const row = rows[0];
    if (!row) return 'DATABASE_NOT_READY';
    return Number(row.user_count ?? 0) === 0 ? 'READY_TO_CREATE' : 'OWNER_EXISTS';
  } catch {
    return 'DATABASE_NOT_READY';
  }
}
