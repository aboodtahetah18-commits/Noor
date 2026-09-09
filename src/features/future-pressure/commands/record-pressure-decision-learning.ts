import { Money } from '@/financial-engine/money';
import { rawSql } from '@/infrastructure/db/client';

function money(value: unknown): Money {
  return Money.parse(value == null || value === '' ? '0' : String(value));
}

type PackageLearningRow = {
  status?: string;
  outcomeStatus?: string;
  outcomeClass?: string;
  targetCycleIndex?: number;
  targetWindowStart?: string | null;
  targetWindowEnd?: string | null;
  committedBefore?: string;
  actualCommittedAfter?: string;
  tripBefore?: string;
  actualTripAfter?: string;
  shiftedTrip?: string;
};

type PackageLearningItemRow = {
  id: string;
  scenarioKind: string;
  amount?: string | null;
  snapshot?: Record<string, unknown> | null;
};

/**
 * Records explainable learning observations after a package outcome is evaluated.
 * Attribution is deliberately CO_OCCURRENCE: a composite package cannot prove
 * that any single action caused the package outcome.
 */
export async function recordPressureDecisionLearning(userId: string, packageId: string) {
  const packages = await rawSql`
    select id,status,outcome_status as "outcomeStatus",outcome_class as "outcomeClass",target_cycle_index as "targetCycleIndex",
      target_window_start::text as "targetWindowStart",target_window_end::text as "targetWindowEnd",
      committed_deficit_before::text as "committedBefore",actual_committed_deficit_after::text as "actualCommittedAfter",
      trip_gap_before::text as "tripBefore",actual_trip_gap_after::text as "actualTripAfter",actual_shifted_trip_gap::text as "shiftedTrip"
    from public.financial_pressure_decision_packages where id=${packageId}::uuid and user_id=${userId}::uuid limit 1`;
  const pkg = packages[0] as PackageLearningRow | undefined;
  if (!pkg || pkg.status !== 'COMPLETED' || pkg.outcomeStatus !== 'EVALUATED' || !pkg.outcomeClass) return { recorded: 0 };

  const items = await rawSql`
    select id,scenario_kind as "scenarioKind",amount::text,scenario_snapshot as "snapshot"
    from public.financial_pressure_decision_package_items
    where package_id=${packageId}::uuid and user_id=${userId}::uuid and status='COMPLETED' order by created_at,id`;

  const observedCommittedRelief = money(pkg.committedBefore).subtract(money(pkg.actualCommittedAfter)).max(Money.zero());
  const observedTripRelief = money(pkg.tripBefore).subtract(money(pkg.actualTripAfter)).max(Money.zero());
  const shiftedTrip = money(pkg.shiftedTrip);
  let recorded = 0;

  for (const item of items as PackageLearningItemRow[]) {
    const snap = item.snapshot ?? {};
    const expectedCommittedRelief = money(snap.committedDeficitRelief);
    const expectedTripRelief = money(snap.tripGapReliefAtCurrentDeadline);
    const context = JSON.stringify({
      attribution: 'CO_OCCURRENCE',
      explanation: 'هذا النوع ظهر داخل حزمة مركبة؛ النتيجة لا تثبت أنه السبب المنفرد.',
      packageSize: items.length,
      timingShiftOnly: Boolean(snap.timingShiftOnly),
      affectedGoalId: snap.affectedGoalId ?? null,
      affectedEventId: snap.affectedEventId ?? null,
      expected: { committedRelief: expectedCommittedRelief.toString(), tripGapRelief: expectedTripRelief.toString() },
      observedPackage: {
        committedRelief: observedCommittedRelief.toString(),
        tripGapRelief: observedTripRelief.toString(),
        shiftedTripGap: shiftedTrip.toString(),
      },
    });
    const rows = await rawSql`
      insert into public.financial_pressure_decision_learning_observations(
        user_id,package_id,package_item_id,scenario_kind,package_outcome_class,attribution_mode,expected_item_amount,
        expected_committed_relief,expected_trip_gap_relief,observed_package_committed_relief,observed_package_trip_gap_relief,
        observed_shifted_trip_gap,target_cycle_index,target_window_start,target_window_end,context_snapshot
      ) values(
        ${userId}::uuid,${packageId}::uuid,${item.id}::uuid,${item.scenarioKind},${pkg.outcomeClass},'CO_OCCURRENCE',${money(item.amount).toString()},
        ${expectedCommittedRelief.toString()},${expectedTripRelief.toString()},${observedCommittedRelief.toString()},${observedTripRelief.toString()},${shiftedTrip.toString()},${pkg.targetCycleIndex ?? 0},
        ${pkg.targetWindowStart}::date,${pkg.targetWindowEnd}::date,${context}::jsonb
      ) on conflict(package_id,package_item_id) do nothing returning id`;
    if (rows[0]) recorded++;
  }
  return { recorded };
}
