import { getRawSql } from '@/infrastructure/db/client';

export type RecommendationDecisionContext={
  request:{id:string;status:string;materiality:string;requestedAmount:string|null;createdAt:string}|null;
  userDecision:{id:string;action:string;status:string;decidedAt:string}|null;
  executionTask:{id:string;status:string;actionType:string;amount:string|null;currency:string;instructions:string|null;evidenceRequirement:string}|null;
};

export async function getRecommendationDecisionContext(userId:string,recommendationId:string):Promise<RecommendationDecisionContext>{
  const sql=getRawSql();
  const rows=await sql`
    SELECT
      d.id AS request_id,d.status AS request_status,d.materiality,d.requested_amount,d.created_at AS request_created_at,
      u.id AS user_decision_id,u.action AS user_decision_action,u.status AS user_decision_status,u.decided_at,
      t.id AS task_id,t.status AS task_status,t.action_type,t.amount AS task_amount,t.currency,t.instructions,t.evidence_requirement
    FROM public.decision_requests d
    LEFT JOIN LATERAL (
      SELECT u.* FROM public.user_decisions u
      WHERE u.user_id=d.user_id AND u.decision_request_id=d.id AND u.status='RECORDED'
      ORDER BY u.decided_at DESC LIMIT 1
    ) u ON true
    LEFT JOIN LATERAL (
      SELECT t.* FROM public.execution_tasks t
      WHERE t.user_id=d.user_id AND t.decision_request_id=d.id
      ORDER BY t.created_at DESC LIMIT 1
    ) t ON true
    WHERE d.user_id=${userId}::uuid AND d.recommendation_id=${recommendationId}::uuid
      AND d.status NOT IN ('CANCELLED','CLOSED')
    ORDER BY d.created_at DESC LIMIT 1
  `;
  const row=rows[0];
  if(!row)return {request:null,userDecision:null,executionTask:null};
  return {
    request:{
      id:String(row.request_id),status:String(row.request_status),materiality:String(row.materiality),
      requestedAmount:row.requested_amount==null?null:String(row.requested_amount),createdAt:String(row.request_created_at),
    },
    userDecision:row.user_decision_id?{
      id:String(row.user_decision_id),action:String(row.user_decision_action),status:String(row.user_decision_status),decidedAt:String(row.decided_at),
    }:null,
    executionTask:row.task_id?{
      id:String(row.task_id),status:String(row.task_status),actionType:String(row.action_type),amount:row.task_amount==null?null:String(row.task_amount),
      currency:String(row.currency).trim(),instructions:row.instructions==null?null:String(row.instructions),evidenceRequirement:String(row.evidence_requirement),
    }:null,
  };
}
