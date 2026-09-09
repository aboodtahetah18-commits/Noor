import { rawSql } from '@/infrastructure/db/client';
import type {
  TransactionDetails,
  TransactionHistoryFilters,
  TransactionHistoryItem,
  TransactionHistoryPage,
} from '@/features/transactions/types/transaction-history';
import type { ExpenseNature, PlanningStatus, TransactionStatus, TransactionType } from '@/domain/types';
import { Money } from '@/financial-engine/money';
import { calculatePercentage } from '@/financial-engine/percentage';
import type { TransactionReversalResult } from '@/features/transactions/types/reversal';

function mapRow(row: Record<string, unknown>): TransactionHistoryItem {
  return {
    id: String(row.id),
    cycleId: row.cycle_id ? String(row.cycle_id) : null,
    accountId: row.account_id ? String(row.account_id) : null,
    accountName: row.account_name ? String(row.account_name) : null,
    categoryId: row.category_id ? String(row.category_id) : null,
    categoryName: row.category_name ? String(row.category_name) : null,
    transactionType: String(row.transaction_type) as TransactionType,
    status: String(row.status) as TransactionStatus,
    transactionDirection: row.transaction_direction ? String(row.transaction_direction) as 'IN'|'OUT' : null,
    transferId: row.transfer_id ? String(row.transfer_id) : null,
    relatedTransactionId: row.related_transaction_id ? String(row.related_transaction_id) : null,
    amount: String(row.amount),
    transactionDate: String(row.transaction_date),
    description: row.description ? String(row.description) : null,
    planningStatus: row.planning_status ? String(row.planning_status) as PlanningStatus : null,
    expenseNature: row.expense_nature ? String(row.expense_nature) as ExpenseNature : null,
    incomeSourceName: row.income_source_name ? String(row.income_source_name) : null,
    incomeKind: row.income_kind ? String(row.income_kind) : null,
    postedAt: row.posted_at ? String(row.posted_at) : null,
    createdAt: String(row.created_at),
  };
}

export class TransactionRepository {
  async list(userId: string, filters: TransactionHistoryFilters): Promise<TransactionHistoryPage> {
    const offset = (filters.page - 1) * filters.pageSize;
    const searchPattern = filters.search ? `%${filters.search}%` : null;

    const countRows = await rawSql`select count(*)::int total
      from public.transactions t
      left join public.accounts a on a.id=t.account_id and a.user_id=t.user_id
      left join public.budget_categories bc on bc.id=t.category_id and bc.user_id=t.user_id
      where t.user_id=${userId}
        and not (t.transaction_type in ('TRANSFER','SAVING_TRANSFER','EMERGENCY_CONTRIBUTION','EMERGENCY_WITHDRAWAL') and t.transaction_direction='IN')
        and (${filters.dateFrom ?? null}::date is null or t.transaction_date >= ${filters.dateFrom ?? null}::date)
        and (${filters.dateTo ?? null}::date is null or t.transaction_date <= ${filters.dateTo ?? null}::date)
        and (${filters.transactionType ?? null}::text is null or t.transaction_type=${filters.transactionType ?? null})
        and (${filters.categoryId ?? null}::uuid is null or t.category_id=${filters.categoryId ?? null}::uuid)
        and (${filters.accountId ?? null}::uuid is null or t.account_id=${filters.accountId ?? null}::uuid)
        and (${filters.planningStatus ?? null}::text is null or t.planning_status=${filters.planningStatus ?? null})
        and (${searchPattern}::text is null or coalesce(t.description,'') ilike ${searchPattern}
          or coalesce(t.income_source_name,'') ilike ${searchPattern}
          or coalesce(a.name,'') ilike ${searchPattern}
          or coalesce(bc.name,'') ilike ${searchPattern})`;

    const rows = await rawSql`select
        t.id,t.cycle_id,t.account_id,a.name account_name,t.category_id,bc.name category_name,
        t.transaction_type,t.status,t.transaction_direction,t.transfer_id,t.related_transaction_id,t.amount::text,t.transaction_date::text,t.description,
        t.planning_status,t.expense_nature,t.income_source_name,t.income_kind,
        t.posted_at::text,t.created_at::text
      from public.transactions t
      left join public.accounts a on a.id=t.account_id and a.user_id=t.user_id
      left join public.budget_categories bc on bc.id=t.category_id and bc.user_id=t.user_id
      where t.user_id=${userId}
        and not (t.transaction_type in ('TRANSFER','SAVING_TRANSFER','EMERGENCY_CONTRIBUTION','EMERGENCY_WITHDRAWAL') and t.transaction_direction='IN')
        and (${filters.dateFrom ?? null}::date is null or t.transaction_date >= ${filters.dateFrom ?? null}::date)
        and (${filters.dateTo ?? null}::date is null or t.transaction_date <= ${filters.dateTo ?? null}::date)
        and (${filters.transactionType ?? null}::text is null or t.transaction_type=${filters.transactionType ?? null})
        and (${filters.categoryId ?? null}::uuid is null or t.category_id=${filters.categoryId ?? null}::uuid)
        and (${filters.accountId ?? null}::uuid is null or t.account_id=${filters.accountId ?? null}::uuid)
        and (${filters.planningStatus ?? null}::text is null or t.planning_status=${filters.planningStatus ?? null})
        and (${searchPattern}::text is null or coalesce(t.description,'') ilike ${searchPattern}
          or coalesce(t.income_source_name,'') ilike ${searchPattern}
          or coalesce(a.name,'') ilike ${searchPattern}
          or coalesce(bc.name,'') ilike ${searchPattern})
      order by
        case when ${filters.sort}='DATE_ASC' then t.transaction_date end asc,
        case when ${filters.sort}='AMOUNT_DESC' then t.amount end desc,
        case when ${filters.sort}='AMOUNT_ASC' then t.amount end asc,
        case when ${filters.sort}='DATE_DESC' then t.transaction_date end desc,
        t.created_at desc
      limit ${filters.pageSize} offset ${offset}`;

    const totalItems = Number((countRows[0] as Record<string, unknown> | undefined)?.total ?? 0);
    return {
      items: rows.map((row: unknown) => mapRow(row as Record<string, unknown>)),
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / filters.pageSize)),
      },
    };
  }

  async getById(userId: string, transactionId: string): Promise<TransactionDetails | null> {
    const rows = await rawSql`select
        t.id,t.cycle_id,fc.name cycle_name,t.account_id,a.name account_name,
        t.category_id,bc.name category_name,t.transaction_type,t.status,t.transaction_direction,t.transfer_id,t.related_transaction_id,t.amount::text,
        t.transaction_date::text,t.description,t.planning_status,t.expense_nature,
        t.income_source_name,t.income_kind,t.posted_at::text,t.reversed_at::text,
        t.reversal_reason,t.created_at::text,
        oo.id obligation_id,oo.due_date::text obligation_due_date,oo.status obligation_status,ot.name obligation_name
      from public.transactions t
      left join public.financial_cycles fc on fc.id=t.cycle_id and fc.user_id=t.user_id
      left join public.accounts a on a.id=t.account_id and a.user_id=t.user_id
      left join public.budget_categories bc on bc.id=t.category_id and bc.user_id=t.user_id
      left join public.obligation_occurrences oo on oo.id=t.obligation_occurrence_id and oo.user_id=t.user_id
      left join public.obligation_templates ot on ot.id=oo.template_id and ot.user_id=t.user_id
      where t.id=${transactionId}::uuid and t.user_id=${userId}
      limit 1`;
    if (!rows[0]) return null;
    const row = rows[0] as Record<string, unknown>;
    return {
      ...mapRow(row),
      cycleName: row.cycle_name ? String(row.cycle_name) : null,
      reversedAt: row.reversed_at ? String(row.reversed_at) : null,
      reversalReason: row.reversal_reason ? String(row.reversal_reason) : null,
      obligation: row.obligation_id ? {
        id: String(row.obligation_id),
        name: String(row.obligation_name),
        dueDate: String(row.obligation_due_date),
        status: String(row.obligation_status),
      } : null,
    };
  }
}

export const transactionRepository = new TransactionRepository();

export interface ReversePostedTransactionInput {
  transactionId: string;
  reason: string;
  idempotencyKey: string;
}

const REVERSIBLE_TRANSACTION_TYPES = new Set<TransactionType>(['INCOME', 'EXPENSE']);

function decimalSub(a: string, b: string): string {
  return Money.parse(a).subtract(Money.parse(b)).toString();
}

async function loadReversalResult(
  userId: string,
  idempotencyKey: string,
): Promise<TransactionReversalResult | null> {
  const rows = await rawSql`select response_payload
    from public.idempotency_records
    where user_id=${userId} and idempotency_key=${idempotencyKey}
      and operation_type='REVERSE_TRANSACTION' and status='COMPLETED'
    limit 1`;
  const payload = (rows[0] as Record<string, unknown> | undefined)?.response_payload;
  return payload ? payload as TransactionReversalResult : null;
}

async function calculateReversalImpact(
  userId: string,
  transactionId: string,
): Promise<TransactionReversalResult['financialImpact']> {
  const rows = await rawSql`select t.account_id,t.category_id,t.cycle_id,t.transaction_type,
      coalesce(ab.balance,0)::text account_balance_after,
      coalesce(ba.planned_amount,0)::text category_planned,
      coalesce(ca.actual_amount,0)::text category_actual_after
    from public.transactions t
    left join public.account_balances_v ab on ab.user_id=t.user_id and ab.account_id=t.account_id
    left join public.financial_plans fp on fp.user_id=t.user_id and fp.cycle_id=t.cycle_id
      and fp.status in ('ACTIVE_PLAN','REVISED')
    left join public.budget_allocations ba on ba.user_id=t.user_id
      and ba.plan_version_id=fp.current_version_id and ba.category_id=t.category_id
    left join lateral (
      select coalesce(sum(x.amount),0)::text actual_amount
      from public.transactions x
      where x.user_id=t.user_id and x.cycle_id=t.cycle_id and x.category_id=t.category_id
        and x.transaction_type='EXPENSE' and x.status='POSTED'
    ) ca on true
    where t.id=${transactionId}::uuid and t.user_id=${userId}
    limit 1`;

  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row) throw new Error('TRANSACTION_NOT_FOUND');
  const planned = String(row.category_planned ?? '0.00');
  const actual = String(row.category_actual_after ?? '0.00');
  const hasCategory = Boolean(row.category_id);
  const plannedMoney = Money.parse(planned);
  const actualMoney = Money.parse(actual);
  const utilizationResult = hasCategory && plannedMoney.minorUnits > 0n
    ? calculatePercentage(actualMoney.minorUnits, plannedMoney.minorUnits)
    : null;
  const utilization = utilizationResult?.percent ?? (hasCategory && actualMoney.minorUnits > 0n ? '100.00' : '0.00');

  return {
    accountId: row.account_id ? String(row.account_id) : null,
    accountBalanceAfter: row.account_id ? String(row.account_balance_after ?? '0.00') : null,
    categoryId: row.category_id ? String(row.category_id) : null,
    categoryPlanned: hasCategory ? planned : null,
    categoryActualAfter: hasCategory ? actual : null,
    categoryRemainingAfter: hasCategory ? decimalSub(planned, actual) : null,
    categoryUtilizationPercent: hasCategory ? utilization : null,
    categoryStatusAfter: hasCategory
      ? (actualMoney.compare(plannedMoney) === 1 ? 'OVER_BUDGET' : 'NORMAL')
      : null,
    safeToSpendStatus: 'BUFFER_POLICY_REQUIRED',
    safeToSpendBlockingIssue: 'BUFFER_POLICY_REQUIRED',
  };
}

export async function reversePostedTransaction(
  userId: string,
  input: ReversePostedTransactionInput,
): Promise<TransactionReversalResult> {
  const previous = await loadReversalResult(userId, input.idempotencyKey);
  if (previous && previous.transactionId !== input.transactionId) {
    throw new Error('IDEMPOTENCY_KEY_REUSED');
  }
  if (previous) {
    if (!previous.financialImpact) {
      const financialImpact = await calculateReversalImpact(userId, previous.transactionId);
      return { ...previous, financialImpact };
    }
    return previous;
  }

  const targetRows = await rawSql`select t.id,t.transaction_type,t.status,c.status cycle_status
    from public.transactions t
    left join public.financial_cycles c on c.id=t.cycle_id and c.user_id=t.user_id
    where t.id=${input.transactionId}::uuid and t.user_id=${userId}
    limit 1`;
  const target = targetRows[0] as Record<string, unknown> | undefined;
  if (!target) throw new Error('TRANSACTION_NOT_FOUND');
  if (String(target.status) !== 'POSTED') throw new Error('INVALID_STATE_TRANSITION');
  if (target.cycle_status && ['CLOSING','CLOSED'].includes(String(target.cycle_status))) {
    throw new Error('CYCLE_CLOSED');
  }
  const transactionType = String(target.transaction_type) as TransactionType;
  if (!REVERSIBLE_TRANSACTION_TYPES.has(transactionType)) {
    throw new Error('REVERSAL_HANDLER_REQUIRED');
  }

  const transitionTime = new Date();
  const responseBase = {
    transactionId: input.transactionId,
    transactionType,
    status: 'REVERSED' as const,
    reversedAt: transitionTime.toISOString(),
    reason: input.reason,
    idempotencyKey: input.idempotencyKey,
  };

  const txResult = await rawSql.transaction([
    rawSql`insert into public.idempotency_records(
      id,user_id,idempotency_key,operation_type,resource_type,status,created_at
    ) values(gen_random_uuid(),${userId},${input.idempotencyKey},'REVERSE_TRANSACTION','TRANSACTION','PROCESSING',now())
    on conflict(user_id,idempotency_key) do nothing
    returning id`,
    rawSql`update public.transactions t
      set status='REVERSED',reversed_at=${transitionTime},reversal_reason=${input.reason},updated_at=now()
      where t.id=${input.transactionId}::uuid and t.user_id=${userId} and t.status='POSTED'
        and t.transaction_type in ('INCOME','EXPENSE')
        and not exists(
          select 1 from public.financial_cycles c
          where c.id=t.cycle_id and c.user_id=t.user_id and c.status in ('CLOSING','CLOSED')
        )
      returning t.id,t.transaction_type,t.reversed_at::text`,
    rawSql`insert into public.state_transition_logs(
        id,user_id,entity_type,entity_id,from_state,to_state,event,reason,created_at
      )
      select gen_random_uuid(),${userId},'TRANSACTION',t.id,'POSTED','REVERSED','REVERSE_TRANSACTION',${input.reason},${transitionTime}
      from public.transactions t
      where t.id=${input.transactionId}::uuid and t.user_id=${userId}
        and t.status='REVERSED' and t.reversed_at=${transitionTime}
      returning id`,
    rawSql`update public.idempotency_records ir
      set status='COMPLETED',resource_id=${input.transactionId}::uuid,
          response_payload=${JSON.stringify(responseBase)}::jsonb,completed_at=now()
      where ir.user_id=${userId} and ir.idempotency_key=${input.idempotencyKey}
        and ir.operation_type='REVERSE_TRANSACTION' and ir.status='PROCESSING'
        and exists(
          select 1 from public.transactions t
          where t.id=${input.transactionId}::uuid and t.user_id=${userId}
            and t.status='REVERSED' and t.reversed_at=${transitionTime}
        )
      returning ir.id`,
  ]);

  const reversedRows = txResult[1] as unknown[];
  if (!reversedRows[0]) {
    const concurrent = await loadReversalResult(userId, input.idempotencyKey);
    if (concurrent && concurrent.transactionId !== input.transactionId) {
      throw new Error('IDEMPOTENCY_KEY_REUSED');
    }
    if (concurrent) {
      if (!concurrent.financialImpact) {
        const financialImpact = await calculateReversalImpact(userId, concurrent.transactionId);
        return { ...concurrent, financialImpact };
      }
      return concurrent;
    }
    throw new Error('INVALID_STATE_TRANSITION');
  }

  const financialImpact = await calculateReversalImpact(userId, input.transactionId);
  const response: TransactionReversalResult = { ...responseBase, financialImpact };
  await rawSql`update public.idempotency_records
    set response_payload=${JSON.stringify(response)}::jsonb
    where user_id=${userId} and idempotency_key=${input.idempotencyKey}
      and operation_type='REVERSE_TRANSACTION' and status='COMPLETED'`;
  return response;
}
