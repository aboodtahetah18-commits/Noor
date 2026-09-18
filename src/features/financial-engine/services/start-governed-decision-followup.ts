import { getRawSql } from '@/infrastructure/db/client';

export type DecisionFollowupStartResult =
  | { started: true; decisionId: string; monitoring: Record<string, unknown> }
  | {
      started: false;
      decisionId: string | null;
      reason:
        | 'GOVERNANCE_DECISION_NOT_LINKED'
        | 'VERIFIED_EXECUTION_REQUIRED'
        | 'SUCCESS_CRITERIA_REQUIRED'
        | 'REVIEW_DATE_REQUIRED'
        | 'FOLLOWUP_ALREADY_ACTIVE';
    };

export async function startGovernedDecisionFollowupAfterVerifiedExecution(input: {
  userId: string;
  executionEventId: string;
}): Promise<DecisionFollowupStartResult> {
  const sql = getRawSql();

  const rows = await sql`
    select
      gd.id::text as decision_id,
      gd.success_criteria,
      gd.review_date,
      em.latest_execution_event_status,
      em.matched_evidence_count,
      dms.current_status as monitoring_case_status,
      dms.latest_run_id::text as latest_run_id,
      dms.monitoring_run_status
    from public.execution_events ee
    join public.execution_tasks et
      on et.id=ee.execution_task_id and et.user_id=ee.user_id
    left join governance.decisions gd
      on gd.public_decision_request_id=et.decision_request_id
     and gd.user_id=et.user_id
    left join governance.execution_monitoring em
      on em.decision_id=gd.id and em.user_id=gd.user_id
    left join governance.decision_monitoring_summary dms
      on dms.decision_id=gd.id and dms.user_id=gd.user_id
    where ee.id=${input.executionEventId}::uuid
      and ee.user_id=${input.userId}::uuid
    order by gd.created_at desc nulls last
    limit 1
  `;

  const row=rows[0];
  if(!row || row.decision_id==null){
    return {started:false,decisionId:null,reason:'GOVERNANCE_DECISION_NOT_LINKED'};
  }
  const decisionId=String(row.decision_id);

  const verified=(
    row.latest_execution_event_status==='VERIFIED_EXECUTION'
    && Number(row.matched_evidence_count ?? 0)>0
  );
  if(!verified){
    return {started:false,decisionId,reason:'VERIFIED_EXECUTION_REQUIRED'};
  }

  const criteria=row.success_criteria;
  const criteriaReady=Boolean(
    criteria
    && typeof criteria==='object'
    && Object.keys(criteria as Record<string,unknown>).length>0
  ) || (Array.isArray(criteria) && criteria.length>0);

  if(!criteriaReady){
    return {started:false,decisionId,reason:'SUCCESS_CRITERIA_REQUIRED'};
  }

  if(!row.review_date){
    return {started:false,decisionId,reason:'REVIEW_DATE_REQUIRED'};
  }

  if(row.latest_run_id){
    return {started:false,decisionId,reason:'FOLLOWUP_ALREADY_ACTIVE'};
  }

  const monitoringRows=await sql`
    select governance.run_decision_monitoring(
      ${decisionId}::uuid,
      ${input.userId}::uuid
    ) as result
  `;

  const monitoring=monitoringRows[0]?.result;
  return {
    started:true,
    decisionId,
    monitoring: monitoring && typeof monitoring==='object'
      ? monitoring as Record<string,unknown>
      : {},
  };
}
