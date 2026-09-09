import { randomUUID } from 'node:crypto';
import { rawSql, type SqlQuery } from '@/infrastructure/db/client';
import { Money } from '@/financial-engine/money';
import { transition } from '@/state-machines';
import type { GoalStatus } from '@/domain/types/goals';
import type { CreateGoalInput, GoalContributionInput } from '@/features/goals/schemas/goal';
import type { GoalAnalysis, GoalContributionResult, GoalListItem } from '@/features/goals/types/goal';

type GoalCapacityContext = { startDate: string; nextIncomeDate: string; capacity: string } | null;
type GoalRow = Record<string, unknown>;

function pct(current: string, target: string) {
  const c = Money.parse(current).minorUnits;
  const t = Money.parse(target).minorUnits;
  if (t <= 0n) return '0.00';
  const v = (c * 10000n) / t;
  return (Number(v > 10000n ? 10000n : v) / 100).toFixed(2);
}

function remaining(current: string, target: string) {
  const r = Money.parse(target).subtract(Money.parse(current));
  return r.isNegative() ? '0.00' : r.toString();
}

function analyzeWithContext(
  targetAmount: string,
  currentBalance: string,
  targetDate: string | undefined,
  ctx: GoalCapacityContext,
): GoalAnalysis {
  const rem = remaining(currentBalance, targetAmount);
  const remainingMoney = Money.parse(rem);
  if (!targetDate || remainingMoney.isZero()) {
    return {
      remainingAmount: rem,
      remainingCycles: remainingMoney.isZero() ? 0 : null,
      requiredContribution: remainingMoney.isZero() ? '0.00' : null,
      availableFinancialCapacity: null,
      feasibilityStatus: 'CAPACITY_UNAVAILABLE',
    };
  }
  if (!ctx) {
    return {
      remainingAmount: rem,
      remainingCycles: null,
      requiredContribution: null,
      availableFinancialCapacity: null,
      feasibilityStatus: 'CAPACITY_UNAVAILABLE',
    };
  }
  const start = new Date(`${ctx.startDate}T00:00:00Z`);
  const next = new Date(`${ctx.nextIncomeDate}T00:00:00Z`);
  const target = new Date(`${targetDate}T00:00:00Z`);
  const cadence = Math.max(1, Math.round((next.getTime() - start.getTime()) / 86_400_000));
  const days = Math.max(0, Math.ceil((target.getTime() - Date.now()) / 86_400_000));
  const cycles = Math.max(1, Math.ceil(days / cadence));
  const required = Money.fromMinorUnits((remainingMoney.minorUnits + BigInt(cycles) - 1n) / BigInt(cycles)).toString();
  const capacity = Money.parse(ctx.capacity);
  return {
    remainingAmount: rem,
    remainingCycles: cycles,
    requiredContribution: required,
    availableFinancialCapacity: capacity.toString(),
    feasibilityStatus: Money.parse(required).compare(capacity) > 0 ? 'FINANCIALLY_UNREALISTIC' : 'ACTIVE_COMPATIBLE',
  };
}

function mapGoal(row: GoalRow, ctx: GoalCapacityContext): GoalListItem {
  const targetAmount = String(row.target_amount);
  const currentBalance = String(row.current_balance);
  const targetDate = row.target_date ? String(row.target_date) : undefined;
  return {
    id: String(row.id),
    name: String(row.name),
    status: String(row.status) as GoalStatus,
    targetAmount,
    currentBalance,
    progressPercent: pct(currentBalance, targetAmount),
    startDate: String(row.start_date),
    targetDate: targetDate ?? null,
    priority: row.priority === null ? null : Number(row.priority),
    achievedAt: row.achieved_at ? String(row.achieved_at) : null,
    cancelledAt: row.cancelled_at ? String(row.cancelled_at) : null,
    ...analyzeWithContext(targetAmount, currentBalance, targetDate, ctx),
  };
}

export class GoalRepository {
  async capacityContext(userId: string): Promise<GoalCapacityContext> {
    const rows = await rawSql`select c.start_date::text,c.expected_next_income_date::text,
      coalesce(sum(ba.planned_amount) filter(where ba.allocation_type='GOAL'),0)::text goal_capacity
      from public.financial_cycles c
      left join public.financial_plans p on p.cycle_id=c.id and p.user_id=c.user_id and p.status in ('ACTIVE_PLAN','REVISED')
      left join public.plan_versions pv on pv.plan_id=p.id and pv.is_current=true
      left join public.budget_allocations ba on ba.plan_version_id=pv.id
      where c.user_id=${userId} and c.status='ACTIVE' group by c.id limit 1`;
    if (!rows[0]) return null;
    const row = rows[0] as GoalRow;
    return { startDate: String(row.start_date), nextIncomeDate: String(row.expected_next_income_date), capacity: String(row.goal_capacity) };
  }

  async analyze(userId: string, targetAmount: string, currentBalance: string, targetDate?: string): Promise<GoalAnalysis> {
    return analyzeWithContext(targetAmount, currentBalance, targetDate, await this.capacityContext(userId));
  }

  async create(userId: string, input: CreateGoalInput) {
    const existing = await rawSql`select resource_id from public.idempotency_records where user_id=${userId} and idempotency_key=${input.idempotencyKey} and operation_type='CREATE_GOAL' and status='COMPLETED' limit 1`;
    if (existing[0]) return String((existing[0] as GoalRow).resource_id);
    const id = randomUUID();
    const result = await rawSql.transaction([
      rawSql`insert into public.financial_goals(id,user_id,name,target_amount,opening_balance,target_date,priority,status,start_date) values(${id},${userId},${input.name},${input.targetAmount},${input.openingBalance ?? '0.00'},${input.targetDate ?? null},${input.priority ?? null},'DRAFT',${input.startDate}) returning id`,
      rawSql`insert into public.idempotency_records(id,user_id,idempotency_key,operation_type,resource_type,resource_id,status,completed_at) values(gen_random_uuid(),${userId},${input.idempotencyKey},'CREATE_GOAL','FINANCIAL_GOAL',${id},'COMPLETED',now()) on conflict(user_id,idempotency_key) do nothing returning id`,
    ]);
    if ((result[0] as unknown[]).length !== 1) throw new Error('GOAL_CREATE_FAILED');
    return id;
  }

  private async goalRows(userId: string, goalId?: string) {
    const goalFilter = goalId ?? null;
    return rawSql`select g.id,g.name,g.status,g.target_amount::text,g.opening_balance::text,g.start_date::text,g.target_date::text,g.priority,g.achieved_at::text,g.cancelled_at::text,
      (g.opening_balance+coalesce(sum(t.amount) filter(where t.transaction_type='GOAL_CONTRIBUTION' and t.status='POSTED'),0))::text current_balance
      from public.financial_goals g
      left join public.transactions t on t.goal_id=g.id and t.user_id=g.user_id
      where g.user_id=${userId} and (${goalFilter}::uuid is null or g.id=${goalFilter}::uuid)
      group by g.id
      order by case g.status when 'ACTIVE' then 1 when 'FINANCIALLY_UNREALISTIC' then 2 when 'DRAFT' then 3 when 'PAUSED' then 4 when 'ACHIEVED' then 5 else 6 end,g.priority nulls last,g.created_at desc`;
  }

  async list(userId: string): Promise<GoalListItem[]> {
    // One capacity query per list, not one query per goal.
    const [rows, ctx] = await Promise.all([this.goalRows(userId), this.capacityContext(userId)]);
    return (rows as GoalRow[]).map((row) => mapGoal(row, ctx));
  }

  async get(userId: string, id: string): Promise<GoalListItem | null> {
    // Direct lookup avoids loading/analyzing the user's entire goal history.
    const [rows, ctx] = await Promise.all([this.goalRows(userId, id), this.capacityContext(userId)]);
    const row = rows[0] as GoalRow | undefined;
    return row ? mapGoal(row, ctx) : null;
  }

  async applyEvent(userId: string, id: string, event: 'ACTIVATE_GOAL'|'PAUSE_GOAL'|'RESUME_GOAL'|'CANCEL_GOAL', reason?: string) {
    const rows = await rawSql`select status from public.financial_goals where id=${id}::uuid and user_id=${userId} limit 1`;
    if (!rows[0]) throw new Error('GOAL_NOT_FOUND');
    const current = String((rows[0] as GoalRow).status) as GoalStatus;
    const first = transition({ entityType: 'GOAL', entityId: id, currentState: current, event, actorUserId: userId, reason });
    let final = first.currentState as GoalStatus;
    let second: null | ReturnType<typeof transition<'GOAL'>> = null;
    if (event === 'ACTIVATE_GOAL' || event === 'RESUME_GOAL') {
      const goal = await this.get(userId, id);
      if (!goal) throw new Error('GOAL_NOT_FOUND');
      if (goal.feasibilityStatus === 'FINANCIALLY_UNREALISTIC') {
        second = transition({ entityType: 'GOAL', entityId: id, currentState: 'ACTIVE', event: 'MARK_FINANCIALLY_UNREALISTIC', actorUserId: userId, reason: 'Required contribution exceeds currently known aggregate goal capacity.' });
        final = 'FINANCIALLY_UNREALISTIC';
      }
    }
    const update = final === 'CANCELLED'
      ? rawSql`update public.financial_goals set status=${final},cancelled_at=now(),updated_at=now() where id=${id}::uuid and user_id=${userId} and status=${current} returning id`
      : rawSql`update public.financial_goals set status=${final},updated_at=now() where id=${id}::uuid and user_id=${userId} and status=${current} returning id`;
    const statements: SqlQuery[] = [
      rawSql`select id from public.financial_goals where id=${id}::uuid and user_id=${userId} and status=${current} for update`,
      update,
      rawSql`insert into public.state_transition_logs(id,user_id,entity_type,entity_id,from_state,to_state,event,reason) values(gen_random_uuid(),${userId},'GOAL',${id},${current},${first.currentState},${event},${reason ?? null}) returning id`,
    ];
    if (second) statements.push(rawSql`insert into public.state_transition_logs(id,user_id,entity_type,entity_id,from_state,to_state,event,reason) values(gen_random_uuid(),${userId},'GOAL',${id},'ACTIVE','FINANCIALLY_UNREALISTIC','MARK_FINANCIALLY_UNREALISTIC','Required contribution exceeds currently known aggregate goal capacity.') returning id`);
    const result = await rawSql.transaction(statements);
    if ((result[1] as unknown[]).length !== 1) throw new Error('GOAL_STATE_CONFLICT');
    return final;
  }

  async contribute(userId: string, input: GoalContributionInput): Promise<GoalContributionResult> {
    const old = await rawSql`select id,goal_id,amount::text from public.transactions where user_id=${userId} and idempotency_key=${input.idempotencyKey} and transaction_type='GOAL_CONTRIBUTION' limit 1`;
    if (old[0]) {
      const goal = await this.get(userId, input.goalId);
      if (!goal) throw new Error('GOAL_NOT_FOUND');
      return { transactionId: String((old[0] as GoalRow).id), goalId: goal.id, amount: String((old[0] as GoalRow).amount), currentBalance: goal.currentBalance, remainingAmount: goal.remainingAmount, progressPercent: goal.progressPercent, status: goal.status, cashLedgerEffect: 'SOURCE_ACCOUNT_DEBIT' };
    }
    const goal = await this.get(userId, input.goalId);
    if (!goal) throw new Error('GOAL_NOT_FOUND');
    if (!['ACTIVE','FINANCIALLY_UNREALISTIC'].includes(goal.status)) throw new Error('GOAL_NOT_CONTRIBUTABLE');
    const transactionId = randomUUID();
    const now = new Date();
    await rawSql.transaction([
      rawSql`select id from public.financial_goals where id=${input.goalId}::uuid and user_id=${userId} for update`,
      rawSql`insert into public.transactions(id,user_id,cycle_id,account_id,transaction_type,status,amount,transaction_date,goal_id,idempotency_key,posted_at,transaction_direction) select ${transactionId},${userId},c.id,${input.accountId},'GOAL_CONTRIBUTION','POSTED',${input.amount},${input.transactionDate},${input.goalId},${input.idempotencyKey},${now},'OUT' from public.financial_cycles c where c.user_id=${userId} and c.status='ACTIVE' and exists(select 1 from public.accounts a where a.id=${input.accountId}::uuid and a.user_id=${userId} and a.is_active=true) returning id`,
    ]);
    let updated = await this.get(userId, input.goalId);
    if (!updated) throw new Error('GOAL_NOT_FOUND');
    if (Money.parse(updated.currentBalance).compare(Money.parse(updated.targetAmount)) >= 0 && ['ACTIVE','FINANCIALLY_UNREALISTIC'].includes(updated.status)) {
      const current = updated.status;
      const state = transition({ entityType: 'GOAL', entityId: updated.id, currentState: current, event: 'ACHIEVE_GOAL', actorUserId: userId });
      await rawSql.transaction([
        rawSql`update public.financial_goals set status='ACHIEVED',achieved_at=now(),updated_at=now() where id=${updated.id}::uuid and user_id=${userId} and status=${current} returning id`,
        rawSql`insert into public.state_transition_logs(id,user_id,entity_type,entity_id,from_state,to_state,event) values(gen_random_uuid(),${userId},'GOAL',${updated.id},${current},${state.currentState},'ACHIEVE_GOAL') returning id`,
      ]);
      updated = await this.get(userId, input.goalId);
    }
    if (!updated) throw new Error('GOAL_NOT_FOUND');
    return { transactionId, goalId: updated.id, amount: input.amount, currentBalance: updated.currentBalance, remainingAmount: updated.remainingAmount, progressPercent: updated.progressPercent, status: updated.status, cashLedgerEffect: 'SOURCE_ACCOUNT_DEBIT' };
  }
}

export const goalRepository = new GoalRepository();
