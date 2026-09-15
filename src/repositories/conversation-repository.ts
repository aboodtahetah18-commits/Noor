import { rawSql } from '@/infrastructure/db/client';

export async function listConversationThreads(userId: string) {
  return rawSql`
    SELECT
      t.id, t.cycle_id, t.thread_kind, t.title, t.status, t.context,
      t.created_at, t.updated_at, t.closed_at,
      a.agent_code, a.display_name AS primary_agent_name
    FROM conversation_threads t
    LEFT JOIN namaa_agents a ON a.id = t.primary_agent_id
    WHERE t.user_id = ${userId}
      AND t.status <> 'ARCHIVED'
    ORDER BY t.updated_at DESC
  `;
}

export async function listConversationMessages(userId: string, threadId: string) {
  return rawSql`
    SELECT
      m.id, m.thread_id, m.sender_type, m.message_type, m.body,
      m.structured_payload, m.created_at,
      a.agent_code, a.display_name AS agent_name
    FROM conversation_messages m
    JOIN conversation_threads t ON t.id = m.thread_id
    LEFT JOIN namaa_agents a ON a.id = m.agent_id
    WHERE t.id = ${threadId}
      AND t.user_id = ${userId}
      AND m.user_id = ${userId}
    ORDER BY m.created_at ASC
  `;
}

export async function createGovernorThread(userId: string, cycleId?: string | null) {
  const agents = await rawSql`
    SELECT id
    FROM namaa_agents
    WHERE agent_code = 'governor' AND active = true
    LIMIT 1
  `;
  const governorId = agents[0]?.id;
  if (!governorId) throw new Error('Governor agent is not configured');

  const rows = await rawSql`
    INSERT INTO conversation_threads
      (user_id, cycle_id, thread_kind, title, status, primary_agent_id, context)
    VALUES
      (${userId}, ${cycleId ?? null}, 'GENERAL', 'المحافظ', 'OPEN', ${governorId}, '{}'::jsonb)
    RETURNING *
  `;
  return rows[0];
}

export async function addUserMessage(userId: string, threadId: string, body: string) {
  const rows = await rawSql`
    INSERT INTO conversation_messages
      (thread_id, user_id, sender_type, message_type, body, structured_payload)
    SELECT
      t.id, t.user_id, 'USER', 'TEXT', ${body}, '{}'::jsonb
    FROM conversation_threads t
    WHERE t.id = ${threadId}
      AND t.user_id = ${userId}
      AND t.status = 'OPEN'
    RETURNING *
  `;
  if (!rows[0]) throw new Error('Conversation not found or closed');

  await rawSql`
    UPDATE conversation_threads
    SET updated_at = now()
    WHERE id = ${threadId} AND user_id = ${userId}
  `;
  return rows[0];
}
