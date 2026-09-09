import { randomUUID } from 'node:crypto';
import { rawSql } from '@/infrastructure/db/client';
import type { RecordIncomeInput } from '@/features/income/schemas/income';
import type { IncomeKind } from '@/domain/types';
import { Money } from '@/financial-engine/money';
import type { IncomeTransactionView, IncomeVariance } from '@/features/income/types/income';

function txView(row: Record<string, unknown>, input: RecordIncomeInput): IncomeTransactionView {
  return {
    id: String(row.id), cycleId: String(row.cycle_id), accountId: String(row.account_id),
    amount: String(row.amount), transactionDate: String(row.transaction_date), sourceName: String(row.income_source_name ?? input.sourceName),
    incomeKind: String(row.income_kind ?? input.incomeKind) as IncomeKind, expectedIncomeId: row.expected_income_id ? String(row.expected_income_id) : null,
    status: 'POSTED', isPartial: Boolean(row.income_is_partial), postedAt: String(row.posted_at),
  };
}

export class IncomeRepository {
  async record(userId: string, input: RecordIncomeInput): Promise<IncomeTransactionView> {
    const existing = await rawSql`select id,cycle_id,account_id,amount::text,transaction_date::text,expected_income_id,income_source_name,income_kind,income_is_partial,posted_at::text
      from public.transactions where user_id=${userId} and idempotency_key=${input.idempotencyKey} limit 1`;
    if (existing[0]) return txView(existing[0] as Record<string, unknown>, input);

    const id = randomUUID();
    const result = await rawSql.transaction([
      rawSql`insert into public.transactions(id,user_id,cycle_id,account_id,transaction_type,status,amount,transaction_date,description,expected_income_id,income_source_name,income_kind,income_is_partial,idempotency_key)
        select ${id},${userId},${input.cycleId},${input.accountId},'INCOME','PENDING',${input.amount},${input.transactionDate},${input.description ?? null},${input.expectedIncomeId ?? null},${input.sourceName},${input.incomeKind},${input.isPartial ?? false},${input.idempotencyKey}
        where exists(select 1 from public.financial_cycles c where c.id=${input.cycleId} and c.user_id=${userId} and c.status='ACTIVE')
          and exists(select 1 from public.accounts a where a.id=${input.accountId} and a.user_id=${userId} and a.is_active=true)
          and (${input.expectedIncomeId ?? null}::uuid is null or exists(select 1 from public.expected_incomes e where e.id=${input.expectedIncomeId ?? null} and e.user_id=${userId} and e.cycle_id=${input.cycleId}))
        returning id`,
      rawSql`update public.transactions set status='POSTED',posted_at=now(),updated_at=now()
        where id=${id} and user_id=${userId} and status='PENDING'
        returning id,cycle_id,account_id,amount::text,transaction_date::text,expected_income_id,income_source_name,income_kind,income_is_partial,posted_at::text`,
    ]);
    const rows = result[1] as unknown[];
    if (!rows[0]) throw new Error('INCOME_PRECONDITION_FAILED');
    return txView(rows[0] as Record<string, unknown>, input);
  }

  async getById(userId: string, transactionId: string): Promise<IncomeTransactionView | null> {
    const rows = await rawSql`select id,cycle_id,account_id,amount::text,transaction_date::text,expected_income_id,income_source_name,income_kind,income_is_partial,posted_at::text
      from public.transactions where id=${transactionId} and user_id=${userId} and transaction_type='INCOME' and status='POSTED' limit 1`;
    if (!rows[0]) return null;
    const row = rows[0] as Record<string, unknown>;
    return txView(row, {
      cycleId: String(row.cycle_id), accountId: String(row.account_id), amount: String(row.amount),
      transactionDate: String(row.transaction_date), sourceName: String(row.income_source_name),
      incomeKind: String(row.income_kind) as IncomeKind, expectedIncomeId: row.expected_income_id ? String(row.expected_income_id) : undefined,
      isPartial: Boolean(row.income_is_partial), idempotencyKey: 'persisted'
    });
  }

  async getVariance(userId: string, cycleId: string, expectedIncomeId?: string): Promise<IncomeVariance> {
    if (!expectedIncomeId) {
      return { status: 'UNLINKED', expectedAmount: null, actualLinkedAmount: '0.00', difference: '0.00', requiresPlanReview: false, surplusIsFlexible: false };
    }
    const rows = await rawSql`select e.expected_amount::text as expected_amount,
      coalesce(sum(t.amount) filter(where t.status='POSTED' and t.transaction_type='INCOME'),0)::text as actual_amount
      from public.expected_incomes e left join public.transactions t on t.expected_income_id=e.id and t.user_id=e.user_id
      where e.id=${expectedIncomeId} and e.user_id=${userId} and e.cycle_id=${cycleId}
      group by e.expected_amount`;
    if (!rows[0]) throw new Error('EXPECTED_INCOME_NOT_FOUND');
    const expected = Money.parse(String(rows[0].expected_amount));
    const actual = Money.parse(String(rows[0].actual_amount));
    const comparison = actual.compare(expected);
    const difference = comparison < 0 ? expected.subtract(actual) : actual.subtract(expected);
    const status = comparison < 0 ? 'BELOW_EXPECTED' : comparison > 0 ? 'ABOVE_EXPECTED' : 'MATCHED';
    return { status, expectedAmount: expected.toString(), actualLinkedAmount: actual.toString(), difference: difference.toString(), requiresPlanReview: comparison < 0, surplusIsFlexible: false };
  }

  async getAccountBalance(userId: string, accountId: string): Promise<string> {
    const rows = await rawSql`select balance::text from public.account_balances_v where user_id=${userId} and account_id=${accountId} limit 1`;
    return rows[0] ? String(rows[0].balance) : '0.00';
  }
}
export const incomeRepository = new IncomeRepository();
