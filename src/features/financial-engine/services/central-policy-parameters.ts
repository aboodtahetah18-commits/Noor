import { getRawSql } from '@/infrastructure/db/client';

export type CentralPolicyParameterId = 'SET-RC-001' | 'SET-RC-002';

export async function getCentralPolicyNumericParameter(
  parameterId: CentralPolicyParameterId,
) {
  const sql = getRawSql();
  const rows = await sql`
    select numeric_value,min_value,max_value,registry_status,registry_file_id,registry_sheet,synced_at
    from public.central_policy_parameters
    where parameter_id=${parameterId}
    limit 1
  `;
  const row = rows[0];
  if (!row || row.numeric_value == null) {
    throw new Error(`CENTRAL_POLICY_PARAMETER_MISSING:${parameterId}`);
  }
  if (String(row.registry_status) !== 'معتمد') {
    throw new Error(`CENTRAL_POLICY_PARAMETER_NOT_APPROVED:${parameterId}`);
  }
  return {
    value: Number(row.numeric_value),
    min: row.min_value == null ? null : Number(row.min_value),
    max: row.max_value == null ? null : Number(row.max_value),
    registry_file_id: String(row.registry_file_id),
    registry_sheet: String(row.registry_sheet),
    synced_at: String(row.synced_at),
  };
}
