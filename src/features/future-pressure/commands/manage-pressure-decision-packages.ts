import { Money, sumMoney } from '@/financial-engine/money';
import { rawSql } from '@/infrastructure/db/client';
import { getPressureDecisionScenarios, type PressureDecisionScenario } from '../queries/get-pressure-decision-scenarios';
import { getFutureFinancialPressure } from '../queries/get-future-financial-pressure';

function money(value: unknown): Money {
  return Money.parse(value == null || value === '' ? '0' : String(value));
}

function calculateComposite(selected: PressureDecisionScenario[], targetTrips: Array<{ eventId: string; uncoveredAmount: string }>) {
  const committedBefore = selected.reduce((max, scenario) => money(scenario.committedDeficitBefore).max(max), Money.zero());
  const tripGapBefore = sumMoney(targetTrips.map(trip => money(trip.uncoveredAmount).max(Money.zero())));
  const committedRelief = sumMoney(selected.map(scenario => money(scenario.committedDeficitRelief))).min(committedBefore);
  const remainingByEvent = new Map(targetTrips.map(trip => [trip.eventId, money(trip.uncoveredAmount).max(Money.zero())]));

  for (const scenario of selected.filter(item => item.kind === 'RESERVE_UNASSIGNED_GOAL_FUNDS')) {
    if (!scenario.affectedEventId) continue;
    const before = remainingByEvent.get(scenario.affectedEventId) ?? Money.zero();
    remainingByEvent.set(scenario.affectedEventId, before.subtract(money(scenario.amount)).max(Money.zero()));
  }

  let timingShiftAmount = Money.zero();
  for (const scenario of selected.filter(item => item.kind === 'DEFER_TRIP_ONE_CYCLE')) {
    if (!scenario.affectedEventId) continue;
    const before = remainingByEvent.get(scenario.affectedEventId) ?? Money.zero();
    timingShiftAmount = timingShiftAmount.add(before);
    remainingByEvent.set(scenario.affectedEventId, Money.zero());
  }

  let remainingTripGap = sumMoney([...remainingByEvent.values()]);
  const flexibleRelief = sumMoney(selected
    .filter(item => item.kind === 'REDIRECT_CURRENT_FLEXIBLE_HEADROOM')
    .map(item => money(item.amount)));
  remainingTripGap = remainingTripGap.subtract(flexibleRelief).max(Money.zero());

  const committedAfter = committedBefore.subtract(committedRelief).max(Money.zero());
  return {
    committedBefore: committedBefore.toString(),
    committedAfter: committedAfter.toString(),
    tripGapBefore: tripGapBefore.toString(),
    tripGapAfter: remainingTripGap.toString(),
    timingShiftAmount: timingShiftAmount.toString(),
    isFullResolution: committedAfter.isZero() && remainingTripGap.isZero(),
  };
}

function validateCombination(selected: PressureDecisionScenario[]) {
  if (selected.length < 2) throw new Error('اختر إجراءين على الأقل لبناء سيناريو مركب.');
  const ids = new Set<string>();
  for (const s of selected) {
    if (ids.has(s.id)) throw new Error('يوجد إجراء مكرر داخل الحزمة.');
    ids.add(s.id);
  }
  const byEvent = new Map<string, Set<string>>();
  for (const s of selected) {
    if (!s.affectedEventId) continue;
    const kinds = byEvent.get(s.affectedEventId) ?? new Set<string>();
    kinds.add(s.kind);
    byEvent.set(s.affectedEventId, kinds);
  }
  for (const kinds of byEvent.values()) {
    if (kinds.has('RESERVE_UNASSIGNED_GOAL_FUNDS') && kinds.has('DEFER_TRIP_ONE_CYCLE')) {
      throw new Error('لا تجمع حجز تمويل رحلة وتأجيل الرحلة نفسها في حزمة واحدة؛ اختر أحد المسارين حتى لا تحجز مالًا لموعد قررت نقله.');
    }
  }
}


async function captureVerificationBaseline(userId: string, scenario: PressureDecisionScenario, decision: Awaited<ReturnType<typeof getPressureDecisionScenarios>>) {
  const baseline: Record<string, unknown> = {};
  if (!decision) return baseline;
  if (scenario.kind === 'RESERVE_UNASSIGNED_GOAL_FUNDS' && scenario.affectedEventId) {
    const rows = await rawSql`select coalesce(r.reserved_amount,0)::text as amount from public.goal_events e left join public.goal_event_funding_reservations r on r.goal_event_id=e.id and r.user_id=e.user_id and r.status='ACTIVE' where e.id=${scenario.affectedEventId}::uuid and e.user_id=${userId}::uuid limit 1`;
    const row = rows[0] as { amount?: string } | undefined;
    baseline.reservedAmount = money(row?.amount).toString();
  }
  if (scenario.kind === 'DEFER_TRIP_ONE_CYCLE' && scenario.affectedEventId) {
    const rows = await rawSql`select starts_at as "startsAt" from public.goal_events where id=${scenario.affectedEventId}::uuid and user_id=${userId}::uuid limit 1`;
    const row = rows[0] as { startsAt?: Date | string | null } | undefined;
    baseline.startsAt = row?.startsAt ? new Date(row.startsAt).toISOString() : null;
  }
  if (scenario.kind === 'REDUCE_GOAL_CONTRIBUTION_ONE_CYCLE' && scenario.affectedGoalId) {
    const cycle = decision.forecast.cycles.find(c => c.cycleIndex === scenario.targetCycleIndex);
    baseline.goalContribution = cycle?.goalContributions.find(g => g.goalId === scenario.affectedGoalId)?.amount ?? '0.00';
  }
  if (scenario.kind === 'REDIRECT_CURRENT_FLEXIBLE_HEADROOM') {
    const rows = await rawSql`select pv.id as "versionId",coalesce(sum(ba.planned_amount) filter(where ba.allocation_type='FLEXIBLE'),0)::text as "flexiblePlanned" from public.financial_cycles c join public.financial_plans p on p.cycle_id=c.id and p.user_id=c.user_id and p.status='ACTIVE_PLAN' join public.plan_versions pv on pv.plan_id=p.id and pv.is_current=true left join public.budget_allocations ba on ba.plan_version_id=pv.id and ba.user_id=c.user_id where c.user_id=${userId}::uuid and c.status='ACTIVE' group by pv.id limit 1`;
    const row = rows[0] as { versionId?: string | null; flexiblePlanned?: string } | undefined;
    baseline.planVersionId = row?.versionId ? String(row.versionId) : null;
    baseline.flexiblePlanned = money(row?.flexiblePlanned).toString();
  }
  return baseline;
}

export async function createCompositePressureDecisionPackage(userId: string, scenarioIds: string[]) {
  const decision = await getPressureDecisionScenarios(userId, 6);
  if (!decision?.targetCycleLabel || decision.targetCycleIndex === null) throw new Error('لا يوجد ضغط حالي صالح لبناء حزمة قرار.');
  const wanted = new Set(scenarioIds.filter(Boolean));
  const selected = decision.scenarios.filter(s => wanted.has(s.id));
  if (selected.length !== wanted.size) throw new Error('بعض السيناريوهات لم تعد متاحة. حدّث الصفحة وأعد الاختيار.');
  validateCombination(selected);
  const target = decision.forecast.cycles.find(c => c.cycleIndex === decision.targetCycleIndex);
  if (!target) throw new Error('تعذر تحديد دورة الضغط الحالية.');
  const summary = calculateComposite(selected, target.trips);
  const snapshot = JSON.stringify(selected);

  const inserted = await rawSql`
    insert into public.financial_pressure_decision_packages(
      user_id,target_cycle_index,target_cycle_label,target_window_start,target_window_end,status,committed_deficit_before,committed_deficit_after,
      trip_gap_before,trip_gap_after,timing_shift_amount,is_full_resolution,scenario_snapshot
    ) values(
      ${userId}::uuid,${decision.targetCycleIndex},${decision.targetCycleLabel},${target.windowStart}::date,${target.windowEnd}::date,'DRAFT',
      ${summary.committedBefore},${summary.committedAfter},${summary.tripGapBefore},${summary.tripGapAfter},
      ${summary.timingShiftAmount},${summary.isFullResolution},${snapshot}::jsonb
    ) returning id`;
  const packageId = String(inserted[0]?.id ?? '');
  if (!packageId) throw new Error('تعذر إنشاء حزمة القرار.');

  for (const s of selected) {
    const verificationBaseline = await captureVerificationBaseline(userId, s, decision);
    const itemSnapshot = JSON.stringify({ ...s, verificationBaseline });
    await rawSql`
      insert into public.financial_pressure_decision_package_items(
        package_id,user_id,scenario_id,scenario_kind,title,amount,affected_goal_id,affected_event_id,execution_path,status,scenario_snapshot
      ) values(
        ${packageId}::uuid,${userId}::uuid,${s.id},${s.kind},${s.title},${s.amount},
        ${s.affectedGoalId}::uuid,${s.affectedEventId}::uuid,${s.approvalPath},'PENDING',${itemSnapshot}::jsonb
      )`;
  }
  await rawSql`insert into public.financial_pressure_decision_package_events(package_id,user_id,event_type,metadata) values(${packageId}::uuid,${userId}::uuid,'CREATED',${JSON.stringify({ scenarioIds: selected.map(s => s.id), summary })}::jsonb)`;
  return { packageId, summary };
}

export async function approveCompositePressureDecisionPackage(userId: string, packageId: string) {
  const rows = await rawSql`
    select id,status,target_cycle_index as "targetCycleIndex",scenario_snapshot as "scenarioSnapshot"
    from public.financial_pressure_decision_packages
    where id=${packageId}::uuid and user_id=${userId}::uuid limit 1`;
  const pkg = rows[0] as { id: string; status: string; targetCycleIndex: number; scenarioSnapshot: PressureDecisionScenario[] } | undefined;
  if (!pkg) throw new Error('حزمة القرار غير موجودة.');
  if (pkg.status !== 'DRAFT') throw new Error('يمكن اعتماد الحزم المسودة فقط.');

  const current = await getPressureDecisionScenarios(userId, 6);
  if (!current || current.targetCycleIndex !== Number(pkg.targetCycleIndex)) throw new Error('تغير موضع الضغط المالي منذ إنشاء الحزمة. أنشئ حزمة جديدة قبل الاعتماد.');
  const currentById = new Map(current.scenarios.map(s => [s.id, s]));
  const saved = Array.isArray(pkg.scenarioSnapshot) ? pkg.scenarioSnapshot : [];
  for (const s of saved) {
    const now = currentById.get(s.id);
    if (!now || now.amount !== s.amount || now.committedDeficitBefore !== s.committedDeficitBefore || now.tripGapBefore !== s.tripGapBefore) {
      throw new Error('تغيرت بيانات أحد إجراءات الحزمة منذ إنشائها. أعد بناء الحزمة بالقيم الحالية.');
    }
  }

  await rawSql`
    update public.financial_pressure_decision_packages
    set status='APPROVED',approved_at=now(),updated_at=now()
    where id=${packageId}::uuid and user_id=${userId}::uuid and status='DRAFT'`;
  await rawSql`
    update public.financial_pressure_decision_package_items
    set status='READY'
    where package_id=${packageId}::uuid and user_id=${userId}::uuid and status='PENDING'`;
  await rawSql`insert into public.financial_pressure_decision_package_events(package_id,user_id,event_type,metadata) values(${packageId}::uuid,${userId}::uuid,'APPROVED','{}'::jsonb)`;
  return { packageId };
}

export async function cancelCompositePressureDecisionPackage(userId: string, packageId: string) {
  const rows = await rawSql`
    update public.financial_pressure_decision_packages
    set status='CANCELLED',cancelled_at=now(),updated_at=now()
    where id=${packageId}::uuid and user_id=${userId}::uuid and status in ('DRAFT','APPROVED')
    returning id`;
  if (!rows[0]) throw new Error('تعذر إلغاء الحزمة أو أن حالتها لا تسمح بالإلغاء.');
  await rawSql`update public.financial_pressure_decision_package_items set status='CANCELLED' where package_id=${packageId}::uuid and user_id=${userId}::uuid and status in ('PENDING','READY')`;
  await rawSql`insert into public.financial_pressure_decision_package_events(package_id,user_id,event_type,metadata) values(${packageId}::uuid,${userId}::uuid,'CANCELLED','{}'::jsonb)`;
}


type ExecutionCheck = { verified: boolean; evidence: Record<string, unknown> };

type PackageItemVerificationRow = {
  scenarioKind: string;
  affectedEventId?: string | null;
  affectedGoalId?: string | null;
  amount?: string | null;
  scenarioSnapshot?: Record<string, unknown> | null;
};

async function verifyPackageItem(userId: string, item: PackageItemVerificationRow): Promise<ExecutionCheck> {
  const snapshot = item.scenarioSnapshot ?? {};
  const baselineValue = snapshot.verificationBaseline;
  const baseline = baselineValue && typeof baselineValue === 'object' ? baselineValue as Record<string, unknown> : {};
  const amount = money(item.amount ?? snapshot.amount);

  if (item.scenarioKind === 'RESERVE_UNASSIGNED_GOAL_FUNDS' && item.affectedEventId) {
    const rows = await rawSql`select coalesce(r.reserved_amount,0)::text as amount from public.goal_events e left join public.goal_event_funding_reservations r on r.goal_event_id=e.id and r.user_id=e.user_id and r.status='ACTIVE' where e.id=${item.affectedEventId}::uuid and e.user_id=${userId}::uuid limit 1`;
    const row = rows[0] as { amount?: string } | undefined;
    const current = money(row?.amount);
    const before = money(baseline.reservedAmount);
    const required = before.add(amount);
    return { verified: current.compare(required) >= 0, evidence: { beforeReserved: before.toString(), currentReserved: current.toString(), requiredIncrease: amount.toString() } };
  }

  if (item.scenarioKind === 'DEFER_TRIP_ONE_CYCLE' && item.affectedEventId) {
    const rows = await rawSql`select starts_at as "startsAt" from public.goal_events where id=${item.affectedEventId}::uuid and user_id=${userId}::uuid limit 1`;
    const row = rows[0] as { startsAt?: Date | string | null } | undefined;
    const current = row?.startsAt ? new Date(row.startsAt).toISOString() : null;
    const before = baseline.startsAt ? new Date(String(baseline.startsAt)).toISOString() : null;
    return { verified: Boolean(current && before && new Date(current).getTime() > new Date(before).getTime()), evidence: { previousStartsAt: before, currentStartsAt: current } };
  }

  if (item.scenarioKind === 'REDUCE_GOAL_CONTRIBUTION_ONE_CYCLE' && item.affectedGoalId) {
    const currentDecision = await getPressureDecisionScenarios(userId, 6);
    const targetIndex = Number(snapshot.targetCycleIndex ?? 0);
    const current = money(currentDecision?.forecast.cycles.find(c => c.cycleIndex === targetIndex)?.goalContributions.find(g => g.goalId === item.affectedGoalId)?.amount);
    const before = money(baseline.goalContribution);
    const requiredMaximum = before.subtract(amount).max(Money.zero());
    return { verified: current.compare(requiredMaximum) <= 0, evidence: { beforeContribution: before.toString(), currentContribution: current.toString(), requiredReduction: amount.toString(), targetCycleIndex: targetIndex } };
  }

  if (item.scenarioKind === 'REDIRECT_CURRENT_FLEXIBLE_HEADROOM') {
    const rows = await rawSql`select pv.id as "versionId",coalesce(sum(ba.planned_amount) filter(where ba.allocation_type='FLEXIBLE'),0)::text as "flexiblePlanned" from public.financial_cycles c join public.financial_plans p on p.cycle_id=c.id and p.user_id=c.user_id and p.status='ACTIVE_PLAN' join public.plan_versions pv on pv.plan_id=p.id and pv.is_current=true left join public.budget_allocations ba on ba.plan_version_id=pv.id and ba.user_id=c.user_id where c.user_id=${userId}::uuid and c.status='ACTIVE' group by pv.id limit 1`;
    const row = rows[0] as { versionId?: string | null; flexiblePlanned?: string } | undefined;
    const currentVersion = row?.versionId ? String(row.versionId) : null;
    const currentFlexible = money(row?.flexiblePlanned);
    const beforeVersion = baseline.planVersionId ? String(baseline.planVersionId) : null;
    const beforeFlexible = money(baseline.flexiblePlanned);
    const pressure = await getPressureDecisionScenarios(userId, 6);
    const targetIndex = Number(snapshot.targetCycleIndex ?? 0);
    const currentGap = money(pressure?.forecast.cycles.find(c => c.cycleIndex === targetIndex)?.tripDeadlineUncoveredAmount ?? snapshot.tripGapBefore);
    const gapBefore = money(snapshot.tripGapBefore);
    const planChanged = Boolean(currentVersion && beforeVersion && currentVersion !== beforeVersion && currentFlexible.compare(beforeFlexible.subtract(amount).max(Money.zero())) <= 0);
    const fundingApplied = currentGap.compare(gapBefore.subtract(amount).max(Money.zero())) <= 0;
    return { verified: planChanged && fundingApplied, evidence: { beforePlanVersionId: beforeVersion, currentPlanVersionId: currentVersion, beforeFlexiblePlanned: beforeFlexible.toString(), currentFlexiblePlanned: currentFlexible.toString(), gapBefore: gapBefore.toString(), currentTripGap: currentGap.toString(), requiresBothPlanRevisionAndFunding: true } };
  }

  return { verified: false, evidence: { reason: 'UNSUPPORTED_VERIFICATION_KIND' } };
}



type PackageOutcomeClass = 'RESOLVED' | 'REDUCED' | 'SHIFTED' | 'UNCHANGED' | 'WORSENED' | 'MIXED';

function currentCommittedDeficit(cycle: { capacityAfterCommittedOutflow: string | null } | undefined): Money {
  if (!cycle?.capacityAfterCommittedOutflow) return Money.zero();
  const capacity = money(cycle.capacityAfterCommittedOutflow);
  return capacity.isNegative() ? capacity.abs() : Money.zero();
}

function outcomeClass(args: {
  beforeCommitted: Money; beforeTrip: Money; actualCommitted: Money; actualTrip: Money; shiftedTrip: Money;
}): PackageOutcomeClass {
  const { beforeCommitted, beforeTrip, actualCommitted, actualTrip, shiftedTrip } = args;
  const beforeTotal = beforeCommitted.add(beforeTrip);
  const actualAtDeadline = actualCommitted.add(actualTrip);
  if (actualAtDeadline.isZero() && shiftedTrip.isZero()) return 'RESOLVED';
  if (actualAtDeadline.isZero() && shiftedTrip.isPositive()) return 'SHIFTED';
  if (actualAtDeadline.compare(beforeTotal) < 0 && shiftedTrip.isZero()) return 'REDUCED';
  if (actualAtDeadline.compare(beforeTotal) > 0) return 'WORSENED';
  if (actualAtDeadline.compare(beforeTotal) === 0 && shiftedTrip.isZero()) return 'UNCHANGED';
  return 'MIXED';
}

export async function evaluatePressureDecisionPackageOutcome(userId: string, packageId: string) {
  const rows = await rawSql`
    select id,status,target_cycle_index as "targetCycleIndex",target_cycle_label as "targetCycleLabel",
      target_window_start::text as "targetWindowStart",target_window_end::text as "targetWindowEnd",
      committed_deficit_before::text as "committedBefore",committed_deficit_after::text as "expectedCommittedAfter",
      trip_gap_before::text as "tripBefore",trip_gap_after::text as "expectedTripAfter",timing_shift_amount::text as "expectedShifted"
    from public.financial_pressure_decision_packages
    where id=${packageId}::uuid and user_id=${userId}::uuid limit 1`;
  const pkg = rows[0] as { status?: string; targetCycleIndex?: number; targetWindowStart?: string | null; targetWindowEnd?: string | null; committedBefore?: string; expectedCommittedAfter?: string; tripBefore?: string; expectedTripAfter?: string; expectedShifted?: string } | undefined;
  if (!pkg) throw new Error('حزمة القرار غير موجودة.');
  if (String(pkg.status) !== 'COMPLETED') throw new Error('لا يمكن تقييم نتيجة الحزمة قبل اكتمال تنفيذ جميع عناصرها فعليًا.');

  const forecast = await getFutureFinancialPressure(userId, 12);
  if (!forecast) {
    await rawSql`update public.financial_pressure_decision_packages set outcome_status='UNAVAILABLE',outcome_snapshot=${JSON.stringify({reason:'NO_ACTIVE_CYCLE'})}::jsonb,outcome_evaluated_at=now(),updated_at=now() where id=${packageId}::uuid and user_id=${userId}::uuid`;
    return { packageId, outcomeStatus: 'UNAVAILABLE' as const };
  }

  let target = forecast.cycles.find(c => pkg.targetWindowStart && pkg.targetWindowEnd && c.windowStart === String(pkg.targetWindowStart) && c.windowEnd === String(pkg.targetWindowEnd));
  if (!target) target = forecast.cycles.find(c => c.cycleIndex === Number(pkg.targetCycleIndex));
  if (!target) {
    await rawSql`update public.financial_pressure_decision_packages set outcome_status='UNAVAILABLE',outcome_snapshot=${JSON.stringify({reason:'TARGET_WINDOW_OUTSIDE_FORECAST',activeCycleId:forecast.activeCycleId})}::jsonb,outcome_evaluated_at=now(),updated_at=now() where id=${packageId}::uuid and user_id=${userId}::uuid`;
    return { packageId, outcomeStatus: 'UNAVAILABLE' as const };
  }

  const itemRows = await rawSql`select scenario_kind as "scenarioKind",affected_event_id as "affectedEventId" from public.financial_pressure_decision_package_items where package_id=${packageId}::uuid and user_id=${userId}::uuid and status='COMPLETED'`;
  const typedItems = itemRows as Array<{ scenarioKind: string; affectedEventId?: string | null }>;
  const deferredIds = new Set(typedItems.filter(i => i.scenarioKind === 'DEFER_TRIP_ONE_CYCLE' && i.affectedEventId).map(i => String(i.affectedEventId)));
  let shiftedTripGap = Money.zero();
  const shiftedEvidence: Array<Record<string, unknown>> = [];
  for (const cycle of forecast.cycles) {
    if (cycle.cycleIndex <= target.cycleIndex) continue;
    for (const trip of cycle.trips) {
      if (!deferredIds.has(trip.eventId)) continue;
      shiftedTripGap = shiftedTripGap.add(money(trip.uncoveredAmount));
      shiftedEvidence.push({ eventId: trip.eventId, title: trip.title, cycleIndex: cycle.cycleIndex, cycleLabel: cycle.label, uncoveredAmount: trip.uncoveredAmount });
    }
  }

  const actualCommitted = currentCommittedDeficit(target);
  const actualTrip = money(target.tripDeadlineUncoveredAmount);
  const expectedCommitted = money(pkg.expectedCommittedAfter);
  const expectedTrip = money(pkg.expectedTripAfter);
  const beforeCommitted = money(pkg.committedBefore);
  const beforeTrip = money(pkg.tripBefore);
  const cls = outcomeClass({ beforeCommitted, beforeTrip, actualCommitted, actualTrip, shiftedTrip: shiftedTripGap });
  const committedVariance = actualCommitted.subtract(expectedCommitted);
  const tripVariance = actualTrip.subtract(expectedTrip);
  const snapshot = {
    projectionBasis: forecast.projectionBasis,
    evaluatedTargetCycle: { cycleIndex: target.cycleIndex, label: target.label, windowStart: target.windowStart, windowEnd: target.windowEnd },
    expected: { committedDeficitAfter: expectedCommitted.toString(), tripGapAfter: expectedTrip.toString(), shiftedTripGap: money(pkg.expectedShifted).toString() },
    actual: { committedDeficitAfter: actualCommitted.toString(), tripGapAfter: actualTrip.toString(), shiftedTripGap: shiftedTripGap.toString() },
    variance: { committedDeficit: committedVariance.toString(), tripGap: tripVariance.toString() },
    shiftedTrips: shiftedEvidence,
  };

  await rawSql`
    update public.financial_pressure_decision_packages
    set outcome_status='EVALUATED',outcome_class=${cls},actual_committed_deficit_after=${actualCommitted.toString()},actual_trip_gap_after=${actualTrip.toString()},
      actual_shifted_trip_gap=${shiftedTripGap.toString()},committed_outcome_variance=${committedVariance.toString()},trip_gap_outcome_variance=${tripVariance.toString()},
      outcome_snapshot=${JSON.stringify(snapshot)}::jsonb,outcome_evaluated_at=now(),updated_at=now()
    where id=${packageId}::uuid and user_id=${userId}::uuid`;
  await rawSql`insert into public.financial_pressure_decision_package_events(package_id,user_id,event_type,metadata) values(${packageId}::uuid,${userId}::uuid,'OUTCOME_EVALUATED',${JSON.stringify({outcomeClass:cls,...snapshot})}::jsonb)`;
  const {recordPressureDecisionLearning}=await import('@/features/future-pressure/commands/record-pressure-decision-learning');
  await recordPressureDecisionLearning(userId,packageId);
  return { packageId, outcomeStatus: 'EVALUATED' as const, outcomeClass: cls, actualCommittedDeficitAfter: actualCommitted.toString(), actualTripGapAfter: actualTrip.toString(), actualShiftedTripGap: shiftedTripGap.toString(), committedVariance: committedVariance.toString(), tripVariance: tripVariance.toString() };
}

export async function syncPressureDecisionPackageExecution(userId: string, packageId: string) {
  const pkgRows = await rawSql`select id,status from public.financial_pressure_decision_packages where id=${packageId}::uuid and user_id=${userId}::uuid limit 1`;
  const pkg = pkgRows[0] as { status?: string } | undefined;
  if (!pkg || !['APPROVED','IN_PROGRESS'].includes(String(pkg.status))) return { packageId, status: pkg?.status ?? null, verified: 0, total: 0 };
  const items = await rawSql`select id,scenario_kind as "scenarioKind",amount::text,affected_goal_id as "affectedGoalId",affected_event_id as "affectedEventId",status,scenario_snapshot as "scenarioSnapshot",verification_status as "verificationStatus" from public.financial_pressure_decision_package_items where package_id=${packageId}::uuid and user_id=${userId}::uuid and status in ('READY','COMPLETED') order by created_at,id`;
  let verifiedCount = 0;
  for (const raw of items as Array<PackageItemVerificationRow & { id: string; status: string; verificationStatus?: string | null }>) {
    if (raw.status === 'COMPLETED' && raw.verificationStatus === 'VERIFIED') { verifiedCount++; continue; }
    const check = await verifyPackageItem(userId, raw);
    await rawSql`update public.financial_pressure_decision_package_items set verification_status=${check.verified?'VERIFIED':'WAITING'},verification_evidence=${JSON.stringify(check.evidence)}::jsonb,last_checked_at=now(),verified_at=${check.verified?new Date().toISOString():null},status=${check.verified?'COMPLETED':'READY'},completed_at=${check.verified?new Date().toISOString():null} where id=${raw.id}::uuid and user_id=${userId}::uuid`;
    if (check.verified) {
      verifiedCount++;
      if (raw.verificationStatus !== 'VERIFIED') await rawSql`insert into public.financial_pressure_decision_package_events(package_id,user_id,event_type,metadata) values(${packageId}::uuid,${userId}::uuid,'ITEM_VERIFIED',${JSON.stringify({itemId:String(raw.id),scenarioKind:String(raw.scenarioKind),evidence:check.evidence})}::jsonb)`;
    }
  }
  const total = items.length;
  const nextStatus = total > 0 && verifiedCount === total ? 'COMPLETED' : verifiedCount > 0 ? 'IN_PROGRESS' : 'APPROVED';
  if (nextStatus !== pkg.status) {
    await rawSql`update public.financial_pressure_decision_packages set status=${nextStatus},completed_at=${nextStatus==='COMPLETED'?new Date().toISOString():null},updated_at=now() where id=${packageId}::uuid and user_id=${userId}::uuid`;
    await rawSql`insert into public.financial_pressure_decision_package_events(package_id,user_id,event_type,metadata) values(${packageId}::uuid,${userId}::uuid,${nextStatus==='COMPLETED'?'COMPLETED':'STATUS_CHANGED'},${JSON.stringify({from:String(pkg.status),to:nextStatus,verifiedCount,total})}::jsonb)`;
  }
  if (nextStatus === 'COMPLETED') await evaluatePressureDecisionPackageOutcome(userId, packageId);
  return { packageId, status: nextStatus, verified: verifiedCount, total };
}

export async function syncApprovedPressureDecisionPackagesForUser(userId: string) {
  const rows = await rawSql`select id from public.financial_pressure_decision_packages where user_id=${userId}::uuid and status in ('APPROVED','IN_PROGRESS') order by approved_at nulls last,created_at`;
  const results=[];
  for (const row of rows as Array<{ id: string }>) results.push(await syncPressureDecisionPackageExecution(userId, String(row.id)));
  return results;
}
