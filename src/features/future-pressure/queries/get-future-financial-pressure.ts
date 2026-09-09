import { Money, sumMoney } from '@/financial-engine/money';
import { rawSql } from '@/infrastructure/db/client';

type PressureStatus = 'CLEAR' | 'COMMITTED_DEFICIT' | 'TRIP_FUNDING_GAP';

type ObligationItem = {
  id: string;
  templateId: string;
  name: string;
  amount: string;
  dueDate: string;
  source: 'RECORDED_OCCURRENCE' | 'PROJECTED_RECURRENCE';
};

type RecoveryItem = {
  sourceType: 'EMERGENCY' | 'INVESTMENT';
  caseTitle: string;
  installmentNumber: number;
  principalAmount: string;
  growthAmount: string;
  totalAmount: string;
  dueState: 'OVERDUE' | 'CURRENT' | 'PROJECTED';
};

type GoalContributionItem = {
  goalId: string;
  goalName: string;
  amount: string;
};

type TripDeadlineItem = {
  eventId: string;
  goalId: string;
  goalName: string;
  title: string;
  startsAt: string;
  targetAmount: string;
  reservedAmount: string;
  uncoveredAmount: string;
};

export type FuturePressureCycle = {
  cycleIndex: number;
  label: string;
  windowStart: string;
  windowEnd: string;
  baselineExpectedIncome: string | null;
  obligationAmount: string;
  recoveryPrincipalAmount: string;
  recoveryGrowthAmount: string;
  recoveryAmount: string;
  goalContributionAmount: string;
  committedOutflow: string;
  capacityAfterCommittedOutflow: string | null;
  tripDeadlineTargetAmount: string;
  tripDeadlineReservedAmount: string;
  tripDeadlineUncoveredAmount: string;
  status: PressureStatus;
  obligations: ObligationItem[];
  recoveries: RecoveryItem[];
  goalContributions: GoalContributionItem[];
  trips: TripDeadlineItem[];
};

export type FutureFinancialPressure = {
  activeCycleId: string;
  activeCycleName: string;
  projectionBasis: 'CURRENT_APPROVED_VALUES_CONTINUE';
  baselineExpectedIncome: string | null;
  horizonCycles: number;
  firstCommittedDeficit: { cycleIndex: number; label: string; amount: string } | null;
  firstTripFundingGap: { cycleIndex: number; label: string; amount: string } | null;
  missingTripBudgetCount: number;
  missingTripDateCount: number;
  cycles: FuturePressureCycle[];
};

function iso(date: Date) { return date.toISOString().slice(0, 10); }
function parseDate(value: string) { return new Date(`${value}T00:00:00Z`); }
function addMonthsClamped(value: Date, months: number, anchorDay: number) {
  const first = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + months, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(anchorDay, last)));
}
function recurrenceMonths(value: string) {
  return value === 'MONTHLY' ? 1 : value === 'QUARTERLY' ? 3 : value === 'SEMI_ANNUAL' ? 6 : value === 'ANNUAL' ? 12 : null;
}
function slotForDate(date: string, windows: Array<{ start: string; end: string }>) {
  for (let i = 0; i < windows.length; i++) {
    if (i === 0) {
      const window = windows[i];
      if (!window) continue;
      if (date >= window.start && date <= window.end) return i;
    } else {
      const window = windows[i];
      if (!window) continue;
      if (date > window.start && date <= window.end) return i;
    }
  }
  return -1;
}

/**
 * Unified forward-looking pressure view.
 * Trips are deliberately reported as a separate deadline-funding dimension and are NOT
 * subtracted again from income, because approved goal contributions may already fund them.
 */
export async function getFutureFinancialPressure(userId: string, horizonCycles = 6): Promise<FutureFinancialPressure | null> {
  const boundedHorizon = Math.max(2, Math.min(horizonCycles, 12));
  const cycleRows = await rawSql`
    select c.id,c.name,c.start_date::text as "startDate",c.expected_next_income_date::text as "nextIncomeDate",
      nullif(coalesce(sum(e.expected_amount),0),0)::text as "expectedIncome"
    from public.financial_cycles c
    left join public.expected_incomes e on e.user_id=c.user_id and e.cycle_id=c.id
    where c.user_id=${userId} and c.status='ACTIVE'
    group by c.id,c.name,c.start_date,c.expected_next_income_date
    order by c.start_date desc limit 1`;
  const active = cycleRows[0] as { id: string; name: string; startDate: string; nextIncomeDate: string; expectedIncome: string | null } | undefined;
  if (!active) return null;

  const activeStart = parseDate(active.startDate);
  const firstIncomeDate = parseDate(active.nextIncomeDate);
  const anchorDay = firstIncomeDate.getUTCDate();
  const windows: Array<{ start: string; end: string }> = [];
  let prior = activeStart;
  for (let i = 0; i < boundedHorizon; i++) {
    const end = i === 0 ? firstIncomeDate : addMonthsClamped(firstIncomeDate, i, anchorDay);
    windows.push({ start: iso(prior), end: iso(end) });
    prior = end;
  }
  const lastWindow = windows.at(-1);
  if (!lastWindow) return null;
  const horizonEnd = lastWindow.end;

  const [occurrenceRows, templateRows, commitmentRows, tripRows, recoveryRows] = await Promise.all([
    rawSql`
      select o.id,o.template_id as "templateId",t.name,o.amount::text,o.due_date::text as "dueDate"
      from public.obligation_occurrences o
      join public.obligation_templates t on t.id=o.template_id and t.user_id=o.user_id
      where o.user_id=${userId} and o.status in ('UPCOMING','DUE','OVERDUE')
        and o.due_date>=${active.startDate}::date and o.due_date<=${horizonEnd}::date
      order by o.due_date,o.created_at`,
    rawSql`
      select t.id,t.name,t.default_amount::text as "defaultAmount",t.recurrence,
        max(o.due_date)::text as "latestDueDate"
      from public.obligation_templates t
      left join public.obligation_occurrences o on o.template_id=t.id and o.user_id=t.user_id
      where t.user_id=${userId} and t.is_active=true and t.recurrence<>'ONCE'
      group by t.id,t.name,t.default_amount,t.recurrence`,
    rawSql`
      select gcc.goal_id as "goalId",g.name as "goalName",gcc.approved_amount::text as amount
      from public.goal_cycle_commitments gcc
      join public.financial_goals g on g.id=gcc.goal_id and g.user_id=gcc.user_id
      where gcc.user_id=${userId} and gcc.cycle_id=${active.id}::uuid and gcc.status in ('APPROVED','FUNDED')
      order by g.priority nulls last,g.name`,
    rawSql`
      select e.id as "eventId",e.goal_id as "goalId",g.name as "goalName",e.title,e.starts_at as "startsAt",
        e.planned_amount::text as "plannedAmount",coalesce(r.reserved_amount,0)::text as "reservedAmount"
      from public.goal_events e
      join public.financial_goals g on g.id=e.goal_id and g.user_id=e.user_id
      left join public.goal_event_funding_reservations r on r.goal_event_id=e.id and r.user_id=e.user_id and r.status='ACTIVE'
      where e.user_id=${userId} and e.event_type='TRIP' and e.status in ('PLANNED','ACTIVE')
      order by e.starts_at nulls last,e.created_at`,
    rawSql`
      select rs.installment_number as "installmentNumber",sum(rs.principal_amount)::text as "principalAmount",
        sum(rs.growth_amount)::text as "growthAmount",sum(rs.total_amount)::text as "totalAmount",
        min(rs.due_cycle_id::text) as "dueCycleId",min(dc.start_date)::text as "dueCycleStartDate",
        s.source_type as "sourceType",c.title as "caseTitle",rs.source_id as "sourceId"
      from public.internal_funding_recovery_schedule rs
      join public.internal_funding_sources s on s.id=rs.source_id and s.user_id=rs.user_id
      join public.internal_funding_cases c on c.id=rs.case_id and c.user_id=rs.user_id and c.status='RECOVERY'
      left join public.financial_cycles dc on dc.id=rs.due_cycle_id and dc.user_id=rs.user_id
      where rs.user_id=${userId} and rs.status='PLANNED'
      group by rs.source_id,rs.installment_number,s.source_type,c.title
      order by rs.source_id,rs.installment_number`,
  ]);

  const obligationsBySlot = new Map<number, ObligationItem[]>();
  const existingKeys = new Set<string>();
  for (const row of occurrenceRows as Array<{ id: string; templateId: string; name: string; amount: string; dueDate: string }>) {
    const slot = slotForDate(row.dueDate, windows);
    if (slot < 0) continue;
    existingKeys.add(`${row.templateId}|${row.dueDate}`);
    const list = obligationsBySlot.get(slot) ?? [];
    list.push({ id: String(row.id), templateId: String(row.templateId), name: String(row.name), amount: Money.parse(row.amount).toString(), dueDate: String(row.dueDate), source: 'RECORDED_OCCURRENCE' });
    obligationsBySlot.set(slot, list);
  }

  // Project recurrence only where a concrete occurrence does not already exist.
  for (const row of templateRows as Array<{ id: string; name: string; defaultAmount: string; recurrence: string; latestDueDate: string | null }>) {
    const months = recurrenceMonths(row.recurrence);
    if (!months || !row.latestDueDate) continue;
    let cursor = parseDate(row.latestDueDate);
    const originalDay = cursor.getUTCDate();
    for (let guard = 0; guard < 80; guard++) {
      cursor = addMonthsClamped(cursor, months, originalDay);
      const due = iso(cursor);
      if (due > horizonEnd) break;
      if (due < active.startDate) continue;
      const key = `${row.id}|${due}`;
      if (existingKeys.has(key)) continue;
      const slot = slotForDate(due, windows);
      if (slot < 0) continue;
      existingKeys.add(key);
      const list = obligationsBySlot.get(slot) ?? [];
      list.push({ id: `projected:${row.id}:${due}`, templateId: String(row.id), name: String(row.name), amount: Money.parse(row.defaultAmount).toString(), dueDate: due, source: 'PROJECTED_RECURRENCE' });
      obligationsBySlot.set(slot, list);
    }
  }

  const goalContributions = (commitmentRows as Array<{ goalId: string; goalName: string; amount: string }>).map(row => ({ goalId: String(row.goalId), goalName: String(row.goalName), amount: Money.parse(row.amount).toString() }));
  const baselineGoalContribution = sumMoney(goalContributions.map(row => Money.parse(row.amount)));

  // Recovery installments are sequenced per source exactly as the recovery module does.
  const recoveryBySource = new Map<string, Array<Record<string, unknown>>>();
  for (const row of recoveryRows as Array<Record<string, unknown>>) {
    const key = String(row.sourceId);
    const list = recoveryBySource.get(key) ?? [];
    list.push(row);
    recoveryBySource.set(key, list);
  }
  const recoveriesBySlot = new Map<number, RecoveryItem[]>();
  for (const sourceRows of recoveryBySource.values()) {
    sourceRows.sort((a, b) => Number(a.installmentNumber) - Number(b.installmentNumber));
    sourceRows.forEach((row, index) => {
      if (index >= boundedHorizon) return;
      const dueCycleId = row.dueCycleId ? String(row.dueCycleId) : null;
      const dueStart = row.dueCycleStartDate ? String(row.dueCycleStartDate) : null;
      const isPastAssigned = Boolean(dueCycleId && dueCycleId !== String(active.id) && dueStart && dueStart < active.startDate);
      const dueState: RecoveryItem['dueState'] = isPastAssigned ? 'OVERDUE' : index === 0 ? 'CURRENT' : 'PROJECTED';
      const item: RecoveryItem = {
        sourceType: String(row.sourceType) === 'EMERGENCY' ? 'EMERGENCY' : 'INVESTMENT',
        caseTitle: String(row.caseTitle),
        installmentNumber: Number(row.installmentNumber),
        principalAmount: Money.parse(String(row.principalAmount ?? '0')).toString(),
        growthAmount: Money.parse(String(row.growthAmount ?? '0')).toString(),
        totalAmount: Money.parse(String(row.totalAmount ?? '0')).toString(),
        dueState,
      };
      const list = recoveriesBySlot.get(index) ?? [];
      list.push(item);
      recoveriesBySlot.set(index, list);
    });
  }

  let missingTripBudgetCount = 0;
  let missingTripDateCount = 0;
  const tripsBySlot = new Map<number, TripDeadlineItem[]>();
  for (const row of tripRows as Array<{ eventId: string; goalId: string; goalName: string; title: string; startsAt: Date | string | null; plannedAmount: string | null; reservedAmount: string }>) {
    if (!row.plannedAmount) { missingTripBudgetCount++; continue; }
    if (!row.startsAt) { missingTripDateCount++; continue; }
    const starts = new Date(row.startsAt).toISOString();
    const date = starts.slice(0, 10);
    const slot = slotForDate(date, windows);
    if (slot < 0) continue;
    const targetAmount = Money.parse(row.plannedAmount);
    const reservedAmount = Money.parse(row.reservedAmount ?? '0');
    const uncoveredAmount = targetAmount.subtract(reservedAmount).max(Money.zero());
    const list = tripsBySlot.get(slot) ?? [];
    list.push({ eventId: String(row.eventId), goalId: String(row.goalId), goalName: String(row.goalName), title: String(row.title), startsAt: starts, targetAmount: targetAmount.toString(), reservedAmount: reservedAmount.toString(), uncoveredAmount: uncoveredAmount.toString() });
    tripsBySlot.set(slot, list);
  }

  const baselineExpectedIncome = active.expectedIncome == null ? null : Money.parse(active.expectedIncome);
  const cycles: FuturePressureCycle[] = [];
  let firstCommittedDeficit: FutureFinancialPressure['firstCommittedDeficit'] = null;
  let firstTripFundingGap: FutureFinancialPressure['firstTripFundingGap'] = null;

  for (let index = 0; index < boundedHorizon; index++) {
    const obligations = obligationsBySlot.get(index) ?? [];
    const recoveries = recoveriesBySlot.get(index) ?? [];
    const trips = tripsBySlot.get(index) ?? [];
    const obligationAmount = sumMoney(obligations.map(item => Money.parse(item.amount)));
    const recoveryPrincipalAmount = sumMoney(recoveries.map(item => Money.parse(item.principalAmount)));
    const recoveryGrowthAmount = sumMoney(recoveries.map(item => Money.parse(item.growthAmount)));
    const recoveryAmount = sumMoney(recoveries.map(item => Money.parse(item.totalAmount)));
    const goalContributionAmount = baselineGoalContribution;
    const committedOutflow = obligationAmount.add(recoveryAmount).add(goalContributionAmount);
    const capacityAfterCommittedOutflow = baselineExpectedIncome == null ? null : baselineExpectedIncome.subtract(committedOutflow);
    const tripDeadlineTargetAmount = sumMoney(trips.map(item => Money.parse(item.targetAmount)));
    const tripDeadlineReservedAmount = sumMoney(trips.map(item => Money.parse(item.reservedAmount)));
    const tripDeadlineUncoveredAmount = sumMoney(trips.map(item => Money.parse(item.uncoveredAmount)));
    let status: PressureStatus = 'CLEAR';
    if (capacityAfterCommittedOutflow?.isNegative()) status = 'COMMITTED_DEFICIT';
    else if (tripDeadlineUncoveredAmount.isPositive()) status = 'TRIP_FUNDING_GAP';
    const label = index === 0 ? 'الدورة الحالية' : `الدورة المستقبلية ${index}`;
    if (!firstCommittedDeficit && capacityAfterCommittedOutflow?.isNegative()) firstCommittedDeficit = { cycleIndex: index, label, amount: capacityAfterCommittedOutflow.abs().toString() };
    if (!firstTripFundingGap && tripDeadlineUncoveredAmount.isPositive()) firstTripFundingGap = { cycleIndex: index, label, amount: tripDeadlineUncoveredAmount.toString() };
    cycles.push({
      cycleIndex: index,
      label,
      windowStart: windows[index]?.start ?? active.startDate,
      windowEnd: windows[index]?.end ?? active.nextIncomeDate,
      baselineExpectedIncome: baselineExpectedIncome?.toString() ?? null,
      obligationAmount: obligationAmount.toString(),
      recoveryPrincipalAmount: recoveryPrincipalAmount.toString(),
      recoveryGrowthAmount: recoveryGrowthAmount.toString(),
      recoveryAmount: recoveryAmount.toString(),
      goalContributionAmount: goalContributionAmount.toString(),
      committedOutflow: committedOutflow.toString(),
      capacityAfterCommittedOutflow: capacityAfterCommittedOutflow?.toString() ?? null,
      tripDeadlineTargetAmount: tripDeadlineTargetAmount.toString(),
      tripDeadlineReservedAmount: tripDeadlineReservedAmount.toString(),
      tripDeadlineUncoveredAmount: tripDeadlineUncoveredAmount.toString(),
      status,
      obligations,
      recoveries,
      goalContributions,
      trips,
    });
  }

  return {
    activeCycleId: String(active.id),
    activeCycleName: String(active.name),
    projectionBasis: 'CURRENT_APPROVED_VALUES_CONTINUE',
    baselineExpectedIncome: baselineExpectedIncome?.toString() ?? null,
    horizonCycles: boundedHorizon,
    firstCommittedDeficit,
    firstTripFundingGap,
    missingTripBudgetCount,
    missingTripDateCount,
    cycles,
  };
}
