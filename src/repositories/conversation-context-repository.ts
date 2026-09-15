import { rawSql } from '@/infrastructure/db/client';

export async function getConversationContext(userId: string) {
  const cycleRows = await rawSql`
    SELECT *
    FROM financial_cycles
    WHERE user_id = ${userId}
      AND status IN ('ACTIVE','CLOSING')
    ORDER BY start_date DESC
    LIMIT 1
  `;
  const cycle = cycleRows[0] ?? null;

  const accounts = await rawSql`
    SELECT a.id, a.name, a.account_type, a.currency, b.*
    FROM accounts a
    LEFT JOIN account_balances_v b ON b.account_id = a.id
    WHERE a.user_id = ${userId}
    ORDER BY a.created_at
  `;

  const recommendations = cycle
    ? await rawSql`
        SELECT *
        FROM recommendations
        WHERE user_id = ${userId}
          AND cycle_id = ${cycle.id}
        ORDER BY created_at DESC
        LIMIT 30
      `
    : [];

  const executionTasks = await rawSql`
    SELECT *
    FROM execution_tasks
    WHERE user_id = ${userId}
      AND status NOT IN ('CLOSED','CANCELLED')
    ORDER BY due_at NULLS LAST, created_at DESC
    LIMIT 50
  `;

  return { cycle, accounts, recommendations, executionTasks };
}
