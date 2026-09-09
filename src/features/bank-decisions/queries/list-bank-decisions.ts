import { rawSql } from '@/infrastructure/db/client';

export type BankDecisionListItem={
  id:string;
  eventType:string;
  sourceType:'USER'|'SYSTEM';
  affectedCount:number;
  affectedAmount:string|null;
  beforeState:unknown;
  afterState:unknown;
  impactSummary:unknown;
  reason:string|null;
  createdAt:string;
  merchantName:string|null;
  rowDescription:string|null;
  importName:string|null;
};

export async function listBankDecisions(userId:string,limit=100):Promise<BankDecisionListItem[]> {
  const safeLimit=Math.min(200,Math.max(1,Math.trunc(limit)));
  const rows=await rawSql`select e.id,e.event_type as "eventType",e.source_type as "sourceType",e.affected_count as "affectedCount",
    e.affected_amount::text as "affectedAmount",e.before_state as "beforeState",e.after_state as "afterState",
    e.impact_summary as "impactSummary",e.reason,e.created_at::text as "createdAt",
    mr.display_name as "merchantName",r.description as "rowDescription",i.file_name as "importName"
    from public.bank_decision_events e
    left join public.merchant_rules mr on mr.id=e.merchant_rule_id and mr.user_id=e.user_id
    left join public.bank_statement_rows r on r.id=e.bank_statement_row_id and r.user_id=e.user_id
    left join public.bank_statement_imports i on i.id=e.import_id and i.user_id=e.user_id
    where e.user_id=${userId}
    order by e.created_at desc
    limit ${safeLimit}`;
  return rows.map((row)=>({
    id:String(row.id),eventType:String(row.eventType),sourceType:String(row.sourceType)==='SYSTEM'?'SYSTEM':'USER',
    affectedCount:Number(row.affectedCount??0),affectedAmount:row.affectedAmount==null?null:String(row.affectedAmount),
    beforeState:row.beforeState,afterState:row.afterState,impactSummary:row.impactSummary,
    reason:row.reason==null?null:String(row.reason),createdAt:String(row.createdAt),
    merchantName:row.merchantName==null?null:String(row.merchantName),rowDescription:row.rowDescription==null?null:String(row.rowDescription),importName:row.importName==null?null:String(row.importName),
  }));
}
