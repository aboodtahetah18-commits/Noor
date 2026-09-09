import { Money } from '@/financial-engine/money';
import { rawSql } from '@/infrastructure/db/client';

export type BankDecisionEventType=
  |'ROW_CONFIRM'|'BATCH_MERCHANT_APPLY'|'AUTO_POST'|'MERCHANT_RULE_UPDATE'|'MERCHANT_ALIAS_ADD'|'MERCHANT_ALIAS_TOGGLE'|'IMPORT_APPROVE';

export async function recordBankDecision(input:{
  userId:string;
  eventType:BankDecisionEventType;
  sourceType:'USER'|'SYSTEM';
  sourceId?:string|null;
  merchantRuleId?:string|null;
  bankStatementRowId?:string|null;
  importId?:string|null;
  affectedCount?:number;
  affectedAmount?:string|null;
  beforeState?:unknown;
  afterState?:unknown;
  impactSummary?:unknown;
  reason?:string|null;
}){
  const count=Math.max(1,Math.trunc(input.affectedCount??1));
  const amount=input.affectedAmount==null?null:Money.parse(input.affectedAmount).toString();
  await rawSql`insert into public.bank_decision_events(
    user_id,event_type,source_type,source_id,merchant_rule_id,bank_statement_row_id,import_id,
    affected_count,affected_amount,before_state,after_state,impact_summary,reason
  ) values(
    ${input.userId},${input.eventType},${input.sourceType},${input.sourceId??null},${input.merchantRuleId??null},
    ${input.bankStatementRowId??null},${input.importId??null},${count},${amount},
    ${JSON.stringify(input.beforeState??null)}::jsonb,${JSON.stringify(input.afterState??null)}::jsonb,
    ${JSON.stringify(input.impactSummary??null)}::jsonb,${input.reason??null}
  )`;
}
