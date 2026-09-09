import { rawSql } from '@/infrastructure/db/client';
import type { RecommendationCandidate, RecommendationRecord } from '@/features/recommendations/types/recommendation';
import type { RecommendationEvent, RecommendationStatus } from '@/domain/types';
import { transition } from '@/state-machines';

function mapRow(row: Record<string, unknown>): RecommendationRecord {
  return {
    id: String(row.id), cycleId: row.cycle_id ? String(row.cycle_id) : null,
    type: String(row.recommendation_type) as RecommendationRecord['type'],
    status: String(row.status) as RecommendationStatus,
    priority: Number(row.priority), title: String(row.title), message: String(row.message),
    reasonCode: String(row.reason_code) as RecommendationRecord['reasonCode'],
    reasonData: (row.reason_data ?? {}) as Record<string, unknown>,
    deduplicationKey: row.deduplication_key ? String(row.deduplication_key) : null,
    relatedCategoryId: row.related_category_id ? String(row.related_category_id) : null,
    relatedGoalId: row.related_goal_id ? String(row.related_goal_id) : null,
    relatedObligationOccurrenceId: row.related_obligation_occurrence_id ? String(row.related_obligation_occurrence_id) : null,
    createdAt: String(row.created_at),
  };
}

const timestampColumn: Partial<Record<RecommendationEvent, string>> = {
  VIEW_RECOMMENDATION: 'viewed_at', ACCEPT_RECOMMENDATION: 'accepted_at', DISMISS_RECOMMENDATION: 'dismissed_at',
  EXPIRE_RECOMMENDATION: 'expired_at', RESOLVE_RECOMMENDATION: 'resolved_at',
};

export class RecommendationRepository {
  async existingKeys(userId: string, cycleId: string): Promise<Map<string, RecommendationStatus>> {
    const rows = await rawSql`select deduplication_key,status from public.recommendations where user_id=${userId} and cycle_id=${cycleId}::uuid and deduplication_key is not null`;
    return new Map(rows.map((r: unknown) => { const row=r as Record<string,unknown>; return [String(row.deduplication_key), String(row.status) as RecommendationStatus]; }));
  }

  async insertIfAbsent(userId: string, c: RecommendationCandidate): Promise<boolean> {
    return (await this.insertManyIfAbsent(userId, [c])) > 0;
  }

  async insertManyIfAbsent(userId: string, candidates: RecommendationCandidate[]): Promise<number> {
    if (candidates.length === 0) return 0;
    // One set-based insert replaces one INSERT/NOT EXISTS query per recommendation candidate.
    const payload = JSON.stringify(candidates.map((c) => ({
      cycle_id: c.cycleId, recommendation_type: c.type, priority: c.priority, title: c.title, message: c.message,
      reason_code: c.reasonCode, reason_data: c.reasonData, deduplication_key: c.deduplicationKey,
      related_category_id: c.relatedCategoryId ?? null, related_goal_id: c.relatedGoalId ?? null,
      related_obligation_occurrence_id: c.relatedObligationOccurrenceId ?? null,
    })));
    const rows = await rawSql`with input as (
        select * from jsonb_to_recordset(${payload}::jsonb) as x(
          cycle_id uuid,recommendation_type text,priority int,title text,message text,reason_code text,reason_data jsonb,
          deduplication_key text,related_category_id uuid,related_goal_id uuid,related_obligation_occurrence_id uuid
        )
      )
      insert into public.recommendations(user_id,cycle_id,recommendation_type,status,priority,title,message,reason_code,reason_data,deduplication_key,related_category_id,related_goal_id,related_obligation_occurrence_id)
      select ${userId},i.cycle_id,i.recommendation_type,'NEW',i.priority,i.title,i.message,i.reason_code,i.reason_data,i.deduplication_key,i.related_category_id,i.related_goal_id,i.related_obligation_occurrence_id
      from input i
      on conflict do nothing
      returning id`;
    return rows.length;
  }

  async resolveInactiveOpen(userId: string, cycleId: string, activeKeys: string[]): Promise<number> {
    const rows = await rawSql`update public.recommendations r set status='RESOLVED',resolved_at=now()
      where r.user_id=${userId} and r.cycle_id=${cycleId}::uuid and r.status in ('NEW','VIEWED','ACCEPTED')
      and r.reason_code in ('OBLIGATION_OVERDUE','OBLIGATION_UPCOMING','GOAL_UNREALISTIC','SURPLUS_AVAILABLE','OVER_BUDGET','DEFICIT_RISK','SAFE_TO_SPEND_ZERO')
      and not (r.deduplication_key = any(${activeKeys}::text[])) returning id`;
    return rows.length;
  }


  async listFeed(userId: string, input: { status?: RecommendationStatus; type?: RecommendationRecord['type']; priority?: number; page: number; pageSize: number }): Promise<{ rows: RecommendationRecord[]; total: number }> {
    const offset = (input.page - 1) * input.pageSize;
    const status = input.status ?? null;
    const type = input.type ?? null;
    const priority = input.priority ?? null;
    const countRows = await rawSql`select count(*)::int total from public.recommendations r where r.user_id=${userId}
      and (${status}::text is null or r.status=${status})
      and (${type}::text is null or r.recommendation_type=${type})
      and (${priority}::int is null or r.priority=${priority})`;
    const rows = await rawSql`select * from public.recommendations r where r.user_id=${userId}
      and (${status}::text is null or r.status=${status})
      and (${type}::text is null or r.recommendation_type=${type})
      and (${priority}::int is null or r.priority=${priority})
      order by case r.status when 'NEW' then 0 when 'VIEWED' then 1 when 'ACCEPTED' then 2 when 'DISMISSED' then 3 when 'RESOLVED' then 4 else 5 end, r.priority asc, r.created_at desc
      limit ${input.pageSize} offset ${offset}`;
    return { rows: rows.map((r: unknown) => mapRow(r as Record<string,unknown>)), total: Number((countRows[0] as Record<string,unknown> | undefined)?.total ?? 0) };
  }

  async getById(userId: string, recommendationId: string): Promise<{ recommendation: RecommendationRecord; relatedLabel: string | null } | null> {
    const rows = await rawSql`select r.*, coalesce(bc.name,g.name,ot.name,fc.name) related_label
      from public.recommendations r
      left join public.budget_categories bc on bc.id=r.related_category_id and bc.user_id=r.user_id
      left join public.financial_goals g on g.id=r.related_goal_id and g.user_id=r.user_id
      left join public.obligation_occurrences oo on oo.id=r.related_obligation_occurrence_id and oo.user_id=r.user_id
      left join public.obligation_templates ot on ot.id=oo.template_id and ot.user_id=oo.user_id
      left join public.financial_cycles fc on fc.id=r.cycle_id and fc.user_id=r.user_id
      where r.id=${recommendationId}::uuid and r.user_id=${userId} limit 1`;
    const row = rows[0] as Record<string,unknown> | undefined;
    return row ? { recommendation: mapRow(row), relatedLabel: row.related_label ? String(row.related_label) : null } : null;
  }

  async list(userId: string, cycleId: string): Promise<RecommendationRecord[]> {
    const rows = await rawSql`select * from public.recommendations where user_id=${userId} and cycle_id=${cycleId}::uuid order by priority asc,created_at desc`;
    return rows.map((r: unknown) => mapRow(r as Record<string,unknown>));
  }

  async transition(userId: string, recommendationId: string, event: RecommendationEvent): Promise<RecommendationRecord> {
    const rows = await rawSql`select * from public.recommendations where id=${recommendationId}::uuid and user_id=${userId} limit 1`;
    const row = rows[0] as Record<string, unknown> | undefined;
    if (!row) throw new Error('RECOMMENDATION_NOT_FOUND');

    const current = String(row.status) as RecommendationStatus;
    const result = transition({
      entityType: 'RECOMMENDATION',
      entityId: recommendationId,
      currentState: current,
      event,
      actorUserId: userId,
    });
    const next = result.currentState;
    const col = timestampColumn[event];
    if (!col) throw new Error('RECOMMENDATION_EVENT_TIMESTAMP_NOT_DEFINED');

    // `col` comes exclusively from timestampColumn above, never from user input.
    const updateQuery = rawSql.unsafe(
      `update public.recommendations set status=$1, ${col}=now() where id=$2::uuid and user_id=$3 and status=$4 returning *`,
      [next, recommendationId, userId, current],
    );
    const logQuery = rawSql`insert into public.state_transition_logs(user_id,entity_type,entity_id,from_state,to_state,event)
      select ${userId},'RECOMMENDATION',${recommendationId}::uuid,${current},${next},${event}
      where exists(select 1 from public.recommendations where id=${recommendationId}::uuid and user_id=${userId} and status=${next})
      returning id`;
    const tx = await rawSql.transaction([updateQuery, logQuery]);
    const updated = tx[0]?.[0] as Record<string, unknown> | undefined;
    if (!updated) throw new Error('RECOMMENDATION_TRANSITION_CONFLICT');
    return mapRow(updated);
  }}
export const recommendationRepository = new RecommendationRepository();
