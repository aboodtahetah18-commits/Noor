import { getRawSql } from '@/infrastructure/db/client';
import { FinancialPlatformError } from '@/features/financial-engine/services/financial-platform-error';

export type CycleRecommendation = {
  id: string;
  type: string;
  status: string;
  priority: number;
  title: string;
  message: string;
  reasonCode: string;
  reasonData: Record<string, unknown>;
  createdAt: string;
  gateStatus: string | null;
  sensitivity: string | null;
  gateReason: string | null;
  readiness: string | null;
  confidenceScore: string | null;
  hardGateCode: string | null;
};

export async function listCycleRecommendations(userId: string, cycleId: string, includeClosed = false): Promise<CycleRecommendation[]> {
  const sql = getRawSql();
  const cycles = await sql`SELECT id FROM public.financial_cycles WHERE id=${cycleId}::uuid AND user_id=${userId}::uuid LIMIT 1`;
  if (cycles.length === 0) throw new FinancialPlatformError('FINANCIAL_CYCLE_NOT_FOUND', 404);

  const rows = includeClosed
    ? await sql`
        SELECT r.*,g.gate_status,g.sensitivity,g.gate_reason,g.readiness_snapshot,g.confidence_snapshot,g.hard_gate_code
        FROM public.recommendations r
        LEFT JOIN public.recommendation_engine_gates g ON g.recommendation_id=r.id AND g.user_id=r.user_id
        WHERE r.user_id=${userId}::uuid AND r.cycle_id=${cycleId}::uuid
        ORDER BY r.priority ASC,r.created_at DESC
      `
    : await sql`
        SELECT r.*,g.gate_status,g.sensitivity,g.gate_reason,g.readiness_snapshot,g.confidence_snapshot,g.hard_gate_code
        FROM public.recommendations r
        LEFT JOIN public.recommendation_engine_gates g ON g.recommendation_id=r.id AND g.user_id=r.user_id
        WHERE r.user_id=${userId}::uuid AND r.cycle_id=${cycleId}::uuid
          AND r.status IN ('NEW','VIEWED','ACCEPTED')
        ORDER BY r.priority ASC,r.created_at DESC
      `;

  return rows.map((row) => ({
    id: String(row.id),
    type: String(row.recommendation_type),
    status: String(row.status),
    priority: Number(row.priority),
    title: String(row.title),
    message: String(row.message),
    reasonCode: String(row.reason_code),
    reasonData: (row.reason_data && typeof row.reason_data === 'object' ? row.reason_data : {}) as Record<string, unknown>,
    createdAt: String(row.created_at),
    gateStatus: row.gate_status == null ? null : String(row.gate_status),
    sensitivity: row.sensitivity == null ? null : String(row.sensitivity),
    gateReason: row.gate_reason == null ? null : String(row.gate_reason),
    readiness: row.readiness_snapshot == null ? null : String(row.readiness_snapshot),
    confidenceScore: row.confidence_snapshot == null ? null : String(row.confidence_snapshot),
    hardGateCode: row.hard_gate_code == null ? null : String(row.hard_gate_code),
  }));
}
