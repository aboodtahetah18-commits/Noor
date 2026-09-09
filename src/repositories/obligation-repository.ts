import { randomUUID } from 'node:crypto';
import { rawSql } from '@/infrastructure/db/client';
import type { ObligationRecurrence, ObligationStatus } from '@/domain/types';
import type {
  CreateObligationTemplateInput,
  ListObligationsInput,
  PayObligationInput,
} from '@/features/obligations/schemas/obligation';
import type {
  CreateObligationTemplateResult,
  ObligationListItem,
  ObligationStatusSyncResult,
  PayObligationResult,
} from '@/features/obligations/types/obligation';
import { Money } from '@/financial-engine/money';

function mapOccurrence(row: Record<string, unknown>): ObligationListItem {
  return {
    id: String(row.id),
    templateId: String(row.template_id),
    cycleId: row.cycle_id ? String(row.cycle_id) : null,
    name: String(row.name),
    amount: String(row.amount),
    dueDate: String(row.due_date),
    status: String(row.status) as ObligationStatus,
    recurrence: String(row.recurrence) as ObligationRecurrence,
    priority: row.priority == null ? null : Number(row.priority),
    expectedAccountId: row.expected_account_id ? String(row.expected_account_id) : null,
    expectedAccountName: row.expected_account_name ? String(row.expected_account_name) : null,
    isReserved: Boolean(row.is_reserved),
    paidTransactionId: row.paid_transaction_id ? String(row.paid_transaction_id) : null,
    paidAt: row.paid_at ? String(row.paid_at) : null,
  };
}

async function loadOccurrence(userId: string, occurrenceId: string): Promise<ObligationListItem | null> {
  const rows = await rawSql`select o.id,o.template_id,o.cycle_id,o.amount::text,o.due_date::text,o.status,o.is_reserved,
      o.paid_transaction_id,o.paid_at::text,t.name,t.recurrence,t.priority,t.expected_account_id,a.name expected_account_name
    from public.obligation_occurrences o
    join public.obligation_templates t on t.id=o.template_id and t.user_id=o.user_id
    left join public.accounts a on a.id=t.expected_account_id and a.user_id=t.user_id
    where o.id=${occurrenceId}::uuid and o.user_id=${userId}
    limit 1`;
  return rows[0] ? mapOccurrence(rows[0] as Record<string, unknown>) : null;
}

function nextDueDateSql(recurrence: ObligationRecurrence, dueDate: string): string | null {
  if (recurrence === 'ONCE') return null;
  const date = new Date(`${dueDate}T12:00:00Z`);
  const months = recurrence === 'MONTHLY' ? 1 : recurrence === 'QUARTERLY' ? 3 : recurrence === 'SEMI_ANNUAL' ? 6 : 12;
  const originalDay = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(originalDay, lastDay));
  return date.toISOString().slice(0, 10);
}

export class ObligationRepository {
  async createTemplate(userId: string, input: CreateObligationTemplateInput): Promise<CreateObligationTemplateResult> {
    const existing = await rawSql`select response_payload from public.idempotency_records
      where user_id=${userId} and idempotency_key=${input.idempotencyKey} and operation_type='CREATE_OBLIGATION_TEMPLATE' and status='COMPLETED' limit 1`;
    if (existing[0]?.response_payload) return existing[0].response_payload as CreateObligationTemplateResult;

    const templateId = randomUUID();
    const occurrenceId = randomUUID();
    const cycleRows = await rawSql`select id,start_date::text,expected_next_income_date::text from public.financial_cycles
      where user_id=${userId} and status='ACTIVE' order by activated_at desc nulls last limit 1`;
    const activeCycle = cycleRows[0] as Record<string, unknown> | undefined;
    const nextIncomeDate = activeCycle ? String(activeCycle.expected_next_income_date) : null;
    const cycleStartDate = activeCycle ? String(activeCycle.start_date) : null;
    const cycleId = activeCycle && cycleStartDate && nextIncomeDate && input.firstDueDate >= cycleStartDate && input.firstDueDate <= nextIncomeDate ? String(activeCycle.id) : null;
    const reserved = Boolean(nextIncomeDate && input.firstDueDate <= nextIncomeDate);

    const response: CreateObligationTemplateResult = {
      templateId,
      occurrence: {
        id: occurrenceId,
        templateId,
        cycleId,
        name: input.name,
        amount: Money.parse(input.defaultAmount).toString(),
        dueDate: input.firstDueDate,
        status: 'UPCOMING',
        recurrence: input.recurrence,
        priority: input.priority ?? null,
        expectedAccountId: input.expectedAccountId ?? null,
        expectedAccountName: null,
        isReserved: reserved,
        paidTransactionId: null,
        paidAt: null,
      },
    };

    const result = await rawSql.transaction([
      rawSql`insert into public.idempotency_records(id,user_id,idempotency_key,operation_type,resource_type,resource_id,response_payload,status,created_at,completed_at)
        values(gen_random_uuid(),${userId},${input.idempotencyKey},'CREATE_OBLIGATION_TEMPLATE','OBLIGATION_TEMPLATE',${templateId}::uuid,${JSON.stringify(response)}::jsonb,'COMPLETED',now(),now())
        on conflict(user_id,idempotency_key) do nothing returning id`,
      rawSql`insert into public.obligation_templates(id,user_id,name,default_amount,recurrence,priority,expected_account_id)
        select ${templateId},${userId},${input.name},${input.defaultAmount},${input.recurrence},${input.priority ?? null},${input.expectedAccountId ?? null}::uuid
        where exists(select 1 from public.profiles p where p.id=${userId}::uuid)
          and exists(select 1 from public.idempotency_records ir where ir.user_id=${userId} and ir.idempotency_key=${input.idempotencyKey} and ir.operation_type='CREATE_OBLIGATION_TEMPLATE' and ir.resource_id=${templateId}::uuid)
          and (${input.expectedAccountId ?? null}::uuid is null or exists(select 1 from public.accounts a where a.id=${input.expectedAccountId ?? null}::uuid and a.user_id=${userId} and a.is_active=true))
        returning id`,
      rawSql`insert into public.obligation_occurrences(id,user_id,template_id,cycle_id,due_date,amount,status,is_reserved)
        select ${occurrenceId},${userId},${templateId},${cycleId}::uuid,${input.firstDueDate},${input.defaultAmount},'UPCOMING',${reserved}
        where exists(select 1 from public.idempotency_records ir where ir.user_id=${userId} and ir.idempotency_key=${input.idempotencyKey} and ir.operation_type='CREATE_OBLIGATION_TEMPLATE' and ir.resource_id=${templateId}::uuid)
        returning id`,
    ]);
    if (!(result[0] as unknown[])[0] || !(result[1] as unknown[])[0] || !(result[2] as unknown[])[0]) {
      const retry = await rawSql`select response_payload from public.idempotency_records
        where user_id=${userId} and idempotency_key=${input.idempotencyKey} and operation_type='CREATE_OBLIGATION_TEMPLATE' and status='COMPLETED' limit 1`;
      if (retry[0]?.response_payload) return retry[0].response_payload as CreateObligationTemplateResult;
      throw new Error('OBLIGATION_TEMPLATE_PRECONDITION_FAILED');
    }
    return response;
  }

  async list(userId: string, filters: ListObligationsInput = {}): Promise<ObligationListItem[]> {
    const rows = await rawSql`select o.id,o.template_id,o.cycle_id,o.amount::text,o.due_date::text,o.status,o.is_reserved,
        o.paid_transaction_id,o.paid_at::text,t.name,t.recurrence,t.priority,t.expected_account_id,a.name expected_account_name
      from public.obligation_occurrences o
      join public.obligation_templates t on t.id=o.template_id and t.user_id=o.user_id
      left join public.accounts a on a.id=t.expected_account_id and a.user_id=t.user_id
      where o.user_id=${userId}
        and (${filters.status ?? null}::text is null or o.status=${filters.status ?? null})
        and (${filters.cycleId ?? null}::uuid is null or o.cycle_id=${filters.cycleId ?? null}::uuid)
      order by case o.status when 'OVERDUE' then 1 when 'DUE' then 2 when 'UPCOMING' then 3 when 'PAID' then 4 else 5 end,
        o.due_date asc,o.created_at asc`;
    return rows.map((row: unknown) => mapOccurrence(row as Record<string, unknown>));
  }

  async get(userId: string, occurrenceId: string): Promise<ObligationListItem | null> {
    return loadOccurrence(userId, occurrenceId);
  }

  async pay(userId: string, input: PayObligationInput): Promise<PayObligationResult> {
    const existing = await rawSql`select t.id,t.obligation_occurrence_id,t.amount::text,t.account_id
      from public.transactions t where t.user_id=${userId} and t.idempotency_key=${input.idempotencyKey} and t.transaction_type='OBLIGATION_PAYMENT' and t.status='POSTED' limit 1`;
    if (existing[0]) {
      if (String(existing[0].obligation_occurrence_id) !== input.obligationOccurrenceId || Money.parse(String(existing[0].amount)).toString() !== Money.parse(input.amount).toString()) throw new Error('IDEMPOTENCY_KEY_REUSED');
      return this.paymentResult(userId, input.obligationOccurrenceId, String(existing[0].id), String(existing[0].account_id));
    }

    const occurrenceRows = await rawSql`select o.id,o.amount::text,o.status,o.due_date::text,o.template_id,o.cycle_id,t.recurrence,t.default_amount::text,t.name
      from public.obligation_occurrences o join public.obligation_templates t on t.id=o.template_id and t.user_id=o.user_id
      where o.id=${input.obligationOccurrenceId}::uuid and o.user_id=${userId} limit 1`;
    const occurrence = occurrenceRows[0] as Record<string, unknown> | undefined;
    if (!occurrence) throw new Error('OBLIGATION_NOT_FOUND');
    if (!['UPCOMING','DUE','OVERDUE'].includes(String(occurrence.status))) throw new Error('INVALID_STATE_TRANSITION');
    if (Money.parse(String(occurrence.amount)).compare(Money.parse(input.amount)) !== 0) throw new Error('OBLIGATION_PAYMENT_AMOUNT_MISMATCH');

    const transactionId = randomUUID();
    const recurrence = String(occurrence.recurrence) as ObligationRecurrence;
    const nextDueDate = nextDueDateSql(recurrence, String(occurrence.due_date));
    const nextOccurrenceId = nextDueDate ? randomUUID() : null;
    const fromStatus = String(occurrence.status);

    const tx = await rawSql.transaction([
      rawSql`select id from public.obligation_occurrences where id=${input.obligationOccurrenceId}::uuid and user_id=${userId} for update`,
      rawSql`insert into public.transactions(id,user_id,cycle_id,account_id,transaction_type,status,amount,transaction_date,description,obligation_occurrence_id,idempotency_key)
        select ${transactionId},${userId},c.id,${input.accountId},'OBLIGATION_PAYMENT','PENDING',${input.amount},${input.transactionDate},'سداد التزام: '||t.name,o.id,${input.idempotencyKey}
        from public.obligation_occurrences o
        join public.obligation_templates t on t.id=o.template_id and t.user_id=o.user_id
        join lateral (select fc.id from public.financial_cycles fc where fc.user_id=${userId} and fc.status='ACTIVE' order by fc.activated_at desc nulls last limit 1) c on true
        where o.id=${input.obligationOccurrenceId}::uuid and o.user_id=${userId} and o.status in ('UPCOMING','DUE','OVERDUE')
          and exists(select 1 from public.accounts a where a.id=${input.accountId}::uuid and a.user_id=${userId} and a.is_active=true)
        on conflict(user_id,idempotency_key) do nothing returning id`,
      rawSql`update public.transactions set status='POSTED',posted_at=now(),updated_at=now() where id=${transactionId} and user_id=${userId} and status='PENDING' returning id`,
      rawSql`update public.obligation_occurrences set status='PAID',is_reserved=false,paid_transaction_id=${transactionId},paid_at=now(),updated_at=now()
        where id=${input.obligationOccurrenceId}::uuid and user_id=${userId} and status in ('UPCOMING','DUE','OVERDUE')
          and exists(select 1 from public.transactions p where p.id=${transactionId}::uuid and p.user_id=${userId} and p.status='POSTED') returning id`,
      nextOccurrenceId ? rawSql`insert into public.obligation_occurrences(id,user_id,template_id,cycle_id,due_date,amount,status,is_reserved)
        select ${nextOccurrenceId},${userId},o.template_id,
          (select c.id from public.financial_cycles c where c.user_id=${userId} and c.status='ACTIVE' and ${nextDueDate}::date between c.start_date and c.expected_next_income_date order by c.activated_at desc nulls last limit 1),
          ${nextDueDate},t.default_amount,'UPCOMING',
          exists(select 1 from public.financial_cycles c where c.user_id=${userId} and c.status='ACTIVE' and ${nextDueDate}::date <= c.expected_next_income_date)
        from public.obligation_occurrences o join public.obligation_templates t on t.id=o.template_id and t.user_id=o.user_id
        where o.id=${input.obligationOccurrenceId}::uuid and o.user_id=${userId} and t.is_active=true and t.recurrence<>'ONCE'
          and not exists(select 1 from public.obligation_occurrences x where x.user_id=${userId} and x.template_id=o.template_id and x.due_date=${nextDueDate}::date)
        returning id` : rawSql`select null::uuid as id where false`,
      rawSql`insert into public.state_transition_logs(id,user_id,entity_type,entity_id,from_state,to_state,event,created_at)
        select gen_random_uuid(),${userId},'OBLIGATION',${input.obligationOccurrenceId}::uuid,${fromStatus},'PAID','PAY_OBLIGATION',now()
        where exists(select 1 from public.obligation_occurrences o where o.id=${input.obligationOccurrenceId}::uuid and o.user_id=${userId} and o.status='PAID') returning id`,
    ]);
    if (!(tx[1] as unknown[])[0] || !(tx[2] as unknown[])[0] || !(tx[3] as unknown[])[0]) {
      const retry = await rawSql`select id,obligation_occurrence_id,amount::text,account_id from public.transactions
        where user_id=${userId} and idempotency_key=${input.idempotencyKey} and transaction_type='OBLIGATION_PAYMENT' and status='POSTED' limit 1`;
      if (retry[0]) {
        if (String(retry[0].obligation_occurrence_id) !== input.obligationOccurrenceId || Money.parse(String(retry[0].amount)).toString() !== Money.parse(input.amount).toString()) throw new Error('IDEMPOTENCY_KEY_REUSED');
        return this.paymentResult(userId, input.obligationOccurrenceId, String(retry[0].id), String(retry[0].account_id));
      }
      throw new Error('OBLIGATION_PAYMENT_PRECONDITION_FAILED');
    }
    return this.paymentResult(userId, input.obligationOccurrenceId, transactionId, input.accountId);
  }

  private async paymentResult(userId: string, occurrenceId: string, transactionId: string, accountId: string): Promise<PayObligationResult> {
    const [occurrence, balanceRows, reservedRows, nextRows] = await Promise.all([
      loadOccurrence(userId, occurrenceId),
      rawSql`select balance::text from public.account_balances_v where user_id=${userId} and account_id=${accountId}::uuid limit 1`,
      rawSql`select coalesce(sum(amount) filter(where is_reserved=true and status in ('UPCOMING','DUE','OVERDUE')),0)::text reserved
        from public.obligation_occurrences where user_id=${userId}`,
      rawSql`select o.id,o.template_id,o.cycle_id,o.amount::text,o.due_date::text,o.status,o.is_reserved,o.paid_transaction_id,o.paid_at::text,
          t.name,t.recurrence,t.priority,t.expected_account_id,a.name expected_account_name
        from public.obligation_occurrences paid
        join public.obligation_occurrences o on o.template_id=paid.template_id and o.user_id=paid.user_id and o.due_date>paid.due_date
        join public.obligation_templates t on t.id=o.template_id and t.user_id=o.user_id
        left join public.accounts a on a.id=t.expected_account_id and a.user_id=t.user_id
        where paid.id=${occurrenceId}::uuid and paid.user_id=${userId}
        order by o.due_date asc limit 1`,
    ]);
    if (!occurrence) throw new Error('OBLIGATION_NOT_FOUND');
    return {
      occurrenceId,
      transactionId,
      status: 'PAID',
      amount: occurrence.amount,
      accountId,
      accountBalanceAfter: balanceRows[0] ? String(balanceRows[0].balance) : '0.00',
      reservationReleased: true,
      nextOccurrence: nextRows[0] ? mapOccurrence(nextRows[0] as Record<string, unknown>) : null,
      reservedUnpaidAfter: String(reservedRows[0]?.reserved ?? '0.00'),
      safeToSpendStatus: 'BUFFER_POLICY_REQUIRED',
      safeToSpendBlockingIssue: 'BUFFER_POLICY_REQUIRED',
    };
  }

  async cancel(userId: string, occurrenceId: string, reason: string): Promise<ObligationListItem> {
    const before = await loadOccurrence(userId, occurrenceId);
    if (!before) throw new Error('OBLIGATION_NOT_FOUND');
    if (before.status !== 'UPCOMING') throw new Error('INVALID_STATE_TRANSITION');
    const result = await rawSql.transaction([
      rawSql`update public.obligation_occurrences set status='CANCELLED',is_reserved=false,cancelled_at=now(),updated_at=now()
        where id=${occurrenceId}::uuid and user_id=${userId} and status='UPCOMING' returning id`,
      rawSql`insert into public.state_transition_logs(id,user_id,entity_type,entity_id,from_state,to_state,event,reason,created_at)
        select gen_random_uuid(),${userId},'OBLIGATION',${occurrenceId}::uuid,'UPCOMING','CANCELLED','CANCEL_OBLIGATION',${reason},now()
        where exists(select 1 from public.obligation_occurrences o where o.id=${occurrenceId}::uuid and o.user_id=${userId} and o.status='CANCELLED') returning id`,
    ]);
    if (!(result[0] as unknown[])[0]) throw new Error('INVALID_STATE_TRANSITION');
    const fresh = await loadOccurrence(userId, occurrenceId);
    if (!fresh) throw new Error('OBLIGATION_NOT_FOUND');
    return fresh;
  }

  async syncStatuses(userId?: string): Promise<ObligationStatusSyncResult> {
    const userClause = userId ?? null;
    const result = await rawSql.transaction([
      rawSql`with changed as (
          update public.obligation_occurrences o set status='DUE',updated_at=now()
          where o.status='UPCOMING' and o.due_date<=(now() at time zone coalesce((select p.timezone from public.profiles p where p.id=o.user_id),'Asia/Riyadh'))::date
            and (${userClause}::uuid is null or o.user_id=${userClause}::uuid)
          returning o.id,o.user_id
        ) insert into public.state_transition_logs(id,user_id,entity_type,entity_id,from_state,to_state,event,created_at)
          select gen_random_uuid(),user_id,'OBLIGATION',id,'UPCOMING','DUE','MARK_DUE',now() from changed returning id`,
      rawSql`with targets as (
          select o.id,o.user_id,o.status as from_state from public.obligation_occurrences o
          where o.status='DUE' and o.due_date<(now() at time zone coalesce((select p.timezone from public.profiles p where p.id=o.user_id),'Asia/Riyadh'))::date
            and (${userClause}::uuid is null or o.user_id=${userClause}::uuid)
          for update
        ), changed as (
          update public.obligation_occurrences o set status='OVERDUE',updated_at=now()
          from targets t where o.id=t.id returning o.id,o.user_id,t.from_state
        ) insert into public.state_transition_logs(id,user_id,entity_type,entity_id,from_state,to_state,event,created_at)
          select gen_random_uuid(),user_id,'OBLIGATION',id,from_state,'OVERDUE','MARK_OVERDUE',now() from changed returning id`,
      rawSql`with active_cycles as (
          select distinct on(user_id) user_id,id,expected_next_income_date from public.financial_cycles
          where status='ACTIVE' order by user_id,activated_at desc nulls last
        ), changed as (
          update public.obligation_occurrences o set is_reserved=case
            when o.status in ('PAID','CANCELLED') then false
            when o.status='OVERDUE' then true
            when c.id is not null and o.due_date<=c.expected_next_income_date then true
            else false end,
            cycle_id=case when o.cycle_id is null and c.id is not null and o.due_date<=c.expected_next_income_date then c.id else o.cycle_id end,
            updated_at=now()
          from active_cycles c
          where o.user_id=c.user_id and (${userClause}::uuid is null or o.user_id=${userClause}::uuid)
            and (o.is_reserved is distinct from case
              when o.status in ('PAID','CANCELLED') then false
              when o.status='OVERDUE' then true
              when o.due_date<=c.expected_next_income_date then true else false end
              or (o.cycle_id is null and o.due_date<=c.expected_next_income_date))
          returning o.id
        ) select count(*)::int count from changed`,
    ]);
    return {
      markedDue: (result[0] as unknown[]).length,
      markedOverdue: (result[1] as unknown[]).length,
      reservationsUpdated: Number((result[2] as Array<Record<string, unknown>>)[0]?.count ?? 0),
    };
  }
}

export const obligationRepository = new ObligationRepository();
