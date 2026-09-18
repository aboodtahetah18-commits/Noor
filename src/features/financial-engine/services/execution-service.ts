import { getRawSql } from '@/infrastructure/db/client';
import { FinancialPlatformError, mapFinancialDatabaseError } from '@/features/financial-engine/services/financial-platform-error';

export type ExecutionEvidenceInput={
  type:'BANK_RECEIPT'|'TRANSFER_RECEIPT'|'BILL_RECEIPT'|'STATEMENT'|'REFERENCE'|'OTHER';
  fileOrReference?:string|null;
  claimedAmount?:string|null;
  claimedDate?:string|null;
  sourceAccountRef?:string|null;
  counterpartyRef?:string|null;
};

function parseOptionalAmount(value:string|null|undefined){
  if(value==null||value.trim()==='')return null;
  const n=Number(value);
  if(!Number.isFinite(n)||n<0)throw new FinancialPlatformError('INVALID_AMOUNT',422);
  return n;
}

export async function listOpenExecutionTasks(userId:string){
  const sql=getRawSql();
  const rows=await sql`
    SELECT t.id,t.decision_request_id,t.user_decision_id,t.action_type,t.amount,t.currency,t.instructions,t.decision_reference,
      t.evidence_requirement,t.required_by,t.status,t.created_at,
      r.recommendation_id,r.decision_type,r.materiality
    FROM public.execution_tasks t
    JOIN public.decision_requests r ON r.id=t.decision_request_id AND r.user_id=t.user_id
    WHERE t.user_id=${userId}::uuid
      AND t.status NOT IN ('CLOSED','CANCELLED')
    ORDER BY COALESCE(t.required_by,t.created_at) ASC,t.created_at ASC
  `;
  return rows.map(row=>({
    id:String(row.id),decisionRequestId:String(row.decision_request_id),userDecisionId:String(row.user_decision_id),decisionReference:row.decision_reference==null?null:String(row.decision_reference),
    actionType:String(row.action_type),amount:row.amount==null?null:String(row.amount),currency:String(row.currency).trim(),
    instructions:row.instructions==null?null:String(row.instructions),evidenceRequirement:String(row.evidence_requirement),
    requiredBy:row.required_by==null?null:String(row.required_by),status:String(row.status),createdAt:String(row.created_at),
    recommendationId:row.recommendation_id==null?null:String(row.recommendation_id),materiality:String(row.materiality),
  }));
}

export async function reportUserExecution(input:{
  userId:string;
  executionTaskId:string;
  reportedAmount?:string|null;
  externalReference?:string|null;
  executedAt?:string|null;
  irreversible?:boolean;
  evidence?:ExecutionEvidenceInput|null;
}){
  const sql=getRawSql();
  const tasks=await sql`
    SELECT id,status,evidence_requirement,amount,currency,action_type,decision_reference
    FROM public.execution_tasks
    WHERE id=${input.executionTaskId}::uuid AND user_id=${input.userId}::uuid
    LIMIT 1
  `;
  const task=tasks[0];
  if(!task)throw new FinancialPlatformError('EXECUTION_TASK_NOT_FOUND',404);
  const taskStatus=String(task.status);
  if(['CLOSED','CANCELLED','FAILED','CANNOT_REVERSE'].includes(taskStatus))throw new FinancialPlatformError('EXECUTION_TASK_NOT_REPORTABLE',409);

  const existing=await sql`
    SELECT id,status,reported_amount,currency,external_reference,executed_at,created_at
    FROM public.execution_events
    WHERE execution_task_id=${input.executionTaskId}::uuid AND user_id=${input.userId}::uuid
      AND status NOT IN ('FAILED','CANNOT_REVERSE')
    ORDER BY created_at DESC LIMIT 1
  `;
  const existingEvent=existing[0];
  if(existingEvent){
    return {executionEvent:existingEvent,taskStatus,evidenceCase:null,created:false};
  }

  const evidenceRequirement=String(task.evidence_requirement);
  if(evidenceRequirement==='REQUIRED'&&!input.evidence)throw new FinancialPlatformError('EVIDENCE_REQUIRED',422);
  const reportedAmount=parseOptionalAmount(input.reportedAmount)??(task.amount==null?null:Number(task.amount));
  const claimedAmount=parseOptionalAmount(input.evidence?.claimedAmount);
  const executedAt=input.executedAt?new Date(input.executedAt):null;
  if(executedAt&&Number.isNaN(executedAt.getTime()))throw new FinancialPlatformError('INVALID_EXECUTED_AT',422);
  const claimedDate=input.evidence?.claimedDate?new Date(input.evidence.claimedDate):null;
  if(claimedDate&&Number.isNaN(claimedDate.getTime()))throw new FinancialPlatformError('INVALID_CLAIMED_DATE',422);

  try{
    if(taskStatus==='USER_ACTION_REQUEST'||taskStatus==='OVERDUE'){
      await sql`UPDATE public.execution_tasks SET status='WAITING_USER_CONFIRMATION',updated_at=now() WHERE id=${input.executionTaskId}::uuid AND user_id=${input.userId}::uuid`;
    }else if(taskStatus!=='WAITING_USER_CONFIRMATION'){
      throw new FinancialPlatformError('EXECUTION_TASK_ALREADY_REPORTED',409);
    }

    const eventRows=await sql`
      INSERT INTO public.execution_events(
        user_id,execution_task_id,execution_type,reported_amount,currency,external_reference,status,irreversible,executed_at,decision_reference
      ) VALUES(
        ${input.userId}::uuid,${input.executionTaskId}::uuid,${String(task.action_type)},${reportedAmount},${String(task.currency).trim()},
        ${input.externalReference??null},'REPORTED',${input.irreversible??false},${executedAt?executedAt.toISOString():null},${task.decision_reference??null}
      ) RETURNING id,status,reported_amount,currency,external_reference,executed_at,decision_reference,created_at
    `;
    const event=eventRows[0];
    if(!event)throw new FinancialPlatformError('EXECUTION_EVENT_WRITE_FAILED',500);
    const eventId=String(event.id);
    let evidenceCase:Record<string,unknown>|null=null;

    if(input.evidence){
      const evidenceRows=await sql`
        INSERT INTO public.evidence_cases(
          user_id,execution_event_id,evidence_type,file_or_reference,claimed_amount,claimed_date,source_account_ref,counterparty_ref,verification_status,decision_reference
        ) VALUES(
          ${input.userId}::uuid,${eventId}::uuid,${input.evidence.type},${input.evidence.fileOrReference??null},
          ${claimedAmount},${claimedDate?claimedDate.toISOString():null},${input.evidence.sourceAccountRef??null},${input.evidence.counterpartyRef??null},'PENDING',${task.decision_reference??null}
        ) RETURNING id,evidence_type,file_or_reference,verification_status,decision_reference,created_at
      `;
      evidenceCase=evidenceRows[0]??null;
      if(!evidenceCase)throw new FinancialPlatformError('EVIDENCE_WRITE_FAILED',500);
      await sql`UPDATE public.execution_events SET status='EVIDENCE_PENDING' WHERE id=${eventId}::uuid AND user_id=${input.userId}::uuid`;
      await sql`UPDATE public.execution_tasks SET status='EVIDENCE_PENDING',updated_at=now() WHERE id=${input.executionTaskId}::uuid AND user_id=${input.userId}::uuid`;
      event.status='EVIDENCE_PENDING';
    }else{
      await sql`UPDATE public.execution_events SET status='VERIFICATION_PENDING' WHERE id=${eventId}::uuid AND user_id=${input.userId}::uuid`;
      await sql`UPDATE public.execution_tasks SET status='VERIFICATION_PENDING',updated_at=now() WHERE id=${input.executionTaskId}::uuid AND user_id=${input.userId}::uuid`;
      event.status='VERIFICATION_PENDING';
    }

    return {executionEvent:event,taskStatus:String(event.status),evidenceCase,created:true};
  }catch(error){
    throw mapFinancialDatabaseError(error);
  }
}
