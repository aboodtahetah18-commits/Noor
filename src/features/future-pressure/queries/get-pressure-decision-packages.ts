import { rawSql } from '@/infrastructure/db/client';

export type PressureDecisionPackageItem = {
  id: string; scenarioId: string; scenarioKind: string; title: string; amount: string;
  affectedGoalId: string | null; affectedEventId: string | null; executionPath: string; status: string;
  verificationStatus: string; verificationEvidence: Record<string, unknown>; lastCheckedAt: string | null; verifiedAt: string | null;
};
export type PressureDecisionPackage = {
  id: string; targetCycleIndex: number; targetCycleLabel: string; status: string;
  committedDeficitBefore: string; committedDeficitAfter: string; tripGapBefore: string; tripGapAfter: string;
  timingShiftAmount: string; isFullResolution: boolean; createdAt: string; approvedAt: string | null; completedAt: string | null;
  targetWindowStart: string | null; targetWindowEnd: string | null; outcomeStatus: string; outcomeClass: string | null;
  actualCommittedDeficitAfter: string | null; actualTripGapAfter: string | null; actualShiftedTripGap: string | null;
  committedOutcomeVariance: string | null; tripGapOutcomeVariance: string | null; outcomeSnapshot: Record<string, unknown>; outcomeEvaluatedAt: string | null;
  items: PressureDecisionPackageItem[];
};

type PackageRow = Record<string, unknown>;
type PackageItemRow = Record<string, unknown>;

export async function getPressureDecisionPackages(userId: string, limit = 8): Promise<PressureDecisionPackage[]> {
  const rows = await rawSql`
    select p.id,p.target_cycle_index as "targetCycleIndex",p.target_cycle_label as "targetCycleLabel",p.status,
      p.committed_deficit_before::text as "committedDeficitBefore",p.committed_deficit_after::text as "committedDeficitAfter",
      p.trip_gap_before::text as "tripGapBefore",p.trip_gap_after::text as "tripGapAfter",p.timing_shift_amount::text as "timingShiftAmount",
      p.is_full_resolution as "isFullResolution",p.created_at as "createdAt",p.approved_at as "approvedAt",p.completed_at as "completedAt",
      p.target_window_start::text as "targetWindowStart",p.target_window_end::text as "targetWindowEnd",p.outcome_status as "outcomeStatus",p.outcome_class as "outcomeClass",
      p.actual_committed_deficit_after::text as "actualCommittedDeficitAfter",p.actual_trip_gap_after::text as "actualTripGapAfter",
      p.actual_shifted_trip_gap::text as "actualShiftedTripGap",p.committed_outcome_variance::text as "committedOutcomeVariance",
      p.trip_gap_outcome_variance::text as "tripGapOutcomeVariance",p.outcome_snapshot as "outcomeSnapshot",p.outcome_evaluated_at as "outcomeEvaluatedAt"
    from public.financial_pressure_decision_packages p
    where p.user_id=${userId}::uuid
    order by p.created_at desc limit ${Math.max(1, Math.min(limit, 20))}`;
  const result: PressureDecisionPackage[] = [];
  for (const row of rows as PackageRow[]) {
    const items = await rawSql`
      select id,scenario_id as "scenarioId",scenario_kind as "scenarioKind",title,amount::text,
        affected_goal_id as "affectedGoalId",affected_event_id as "affectedEventId",execution_path as "executionPath",status,verification_status as "verificationStatus",verification_evidence as "verificationEvidence",last_checked_at as "lastCheckedAt",verified_at as "verifiedAt"
      from public.financial_pressure_decision_package_items
      where package_id=${String(row.id)}::uuid and user_id=${userId}::uuid order by created_at,id`;
    result.push({
      id:String(row.id),targetCycleIndex:Number(row.targetCycleIndex),targetCycleLabel:String(row.targetCycleLabel),status:String(row.status),
      committedDeficitBefore:String(row.committedDeficitBefore),committedDeficitAfter:String(row.committedDeficitAfter),
      tripGapBefore:String(row.tripGapBefore),tripGapAfter:String(row.tripGapAfter),timingShiftAmount:String(row.timingShiftAmount),
      isFullResolution:Boolean(row.isFullResolution),createdAt:new Date(String(row.createdAt)).toISOString(),approvedAt:row.approvedAt?new Date(String(row.approvedAt)).toISOString():null,completedAt:row.completedAt?new Date(String(row.completedAt)).toISOString():null,
      targetWindowStart:row.targetWindowStart?String(row.targetWindowStart):null,targetWindowEnd:row.targetWindowEnd?String(row.targetWindowEnd):null,outcomeStatus:String(row.outcomeStatus??'NOT_EVALUATED'),outcomeClass:row.outcomeClass?String(row.outcomeClass):null,
      actualCommittedDeficitAfter:row.actualCommittedDeficitAfter==null?null:String(row.actualCommittedDeficitAfter),actualTripGapAfter:row.actualTripGapAfter==null?null:String(row.actualTripGapAfter),
      actualShiftedTripGap:row.actualShiftedTripGap==null?null:String(row.actualShiftedTripGap),committedOutcomeVariance:row.committedOutcomeVariance==null?null:String(row.committedOutcomeVariance),
      tripGapOutcomeVariance:row.tripGapOutcomeVariance==null?null:String(row.tripGapOutcomeVariance),outcomeSnapshot:(row.outcomeSnapshot??{}) as Record<string,unknown>,outcomeEvaluatedAt:row.outcomeEvaluatedAt?new Date(String(row.outcomeEvaluatedAt)).toISOString():null,
      items:(items as PackageItemRow[]).map(i=>({id:String(i.id),scenarioId:String(i.scenarioId),scenarioKind:String(i.scenarioKind),title:String(i.title),amount:String(i.amount),affectedGoalId:i.affectedGoalId?String(i.affectedGoalId):null,affectedEventId:i.affectedEventId?String(i.affectedEventId):null,executionPath:String(i.executionPath),status:String(i.status),verificationStatus:String(i.verificationStatus??'NOT_CHECKED'),verificationEvidence:(i.verificationEvidence??{}) as Record<string,unknown>,lastCheckedAt:i.lastCheckedAt?new Date(String(i.lastCheckedAt)).toISOString():null,verifiedAt:i.verifiedAt?new Date(String(i.verifiedAt)).toISOString():null})),
    });
  }
  return result;
}
