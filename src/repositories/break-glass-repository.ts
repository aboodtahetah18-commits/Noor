import { randomUUID } from 'node:crypto';
import { rawSql } from '@/infrastructure/db/client';

export class BreakGlassRepository {
  async revoke(sessionId: string, actorUserId: string, reason: string): Promise<void> {
    const rationale = reason.trim();
    if (rationale.length < 20) throw new Error('BREAK_GLASS_REVOCATION_REASON_REQUIRED');
    const rows = await rawSql`
      update public.authorization_break_glass_sessions
      set status='REVOKED', revoked_by=${actorUserId}::uuid, revoked_at=now()
      where id=${sessionId}::uuid and status='ACTIVE'
      returning actor_user_id::text, provisioning_request_id::text
    `;
    const row = rows[0];
    if (!row) throw new Error('BREAK_GLASS_SESSION_NOT_ACTIVE');
    await rawSql`
      insert into public.authorization_admin_events
        (id,actor_user_id,event_type,provisioning_request_id,target_user_id,object_type,object_id,reason,context_json)
      values (
        ${randomUUID()}::uuid, ${actorUserId}::uuid, 'BREAK_GLASS_REVOKED', ${String(row.provisioning_request_id)}::uuid,
        ${String(row.actor_user_id)}::uuid, 'BREAK_GLASS_SESSION', ${sessionId}, ${rationale}, '{}'::jsonb
      )
    `;
  }

  async close(sessionId: string, actorUserId: string, reason: string): Promise<void> {
    const rationale = reason.trim();
    if (rationale.length < 20) throw new Error('BREAK_GLASS_CLOSE_REASON_REQUIRED');
    const rows = await rawSql`
      update public.authorization_break_glass_sessions
      set status='CLOSED', closed_at=now()
      where id=${sessionId}::uuid and status='ACTIVE'
      returning actor_user_id::text, provisioning_request_id::text
    `;
    const row = rows[0];
    if (!row) throw new Error('BREAK_GLASS_SESSION_NOT_ACTIVE');
    await rawSql`
      insert into public.authorization_admin_events
        (id,actor_user_id,event_type,provisioning_request_id,target_user_id,object_type,object_id,reason,context_json)
      values (
        ${randomUUID()}::uuid, ${actorUserId}::uuid, 'BREAK_GLASS_CLOSED', ${String(row.provisioning_request_id)}::uuid,
        ${String(row.actor_user_id)}::uuid, 'BREAK_GLASS_SESSION', ${sessionId}, ${rationale}, '{}'::jsonb
      )
    `;
  }

  async expireElapsed(actorUserId: string): Promise<number> {
    const rows = await rawSql`
      update public.authorization_break_glass_sessions
      set status='EXPIRED'
      where status='ACTIVE' and expires_at<=now()
      returning id::text, actor_user_id::text, provisioning_request_id::text
    `;
    for (const row of rows) {
      await rawSql`
        insert into public.authorization_admin_events
          (id,actor_user_id,event_type,provisioning_request_id,target_user_id,object_type,object_id,reason,context_json)
        values (
          ${randomUUID()}::uuid, ${actorUserId}::uuid, 'BREAK_GLASS_EXPIRED', ${String(row.provisioning_request_id)}::uuid,
          ${String(row.actor_user_id)}::uuid, 'BREAK_GLASS_SESSION', ${String(row.id)},
          'Break-glass access expired at its governed deadline.', '{}'::jsonb
        )
      `;
    }
    return rows.length;
  }
}

export const breakGlassRepository = new BreakGlassRepository();
