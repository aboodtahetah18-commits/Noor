import { rawSql } from '@/infrastructure/db/client';

export type BankStatementImportDetail = { id:string; user_id:string; account_id:string; file_name:string; file_type:string; status:string; period_start:string|null; period_end:string|null; opening_balance:string|null; closing_balance:string|null; row_count:number; auto_classified_count:number; review_count:number; duplicate_candidate_count:number; approved_transaction_count:number; ignored_row_count:number; reconciliation_system_balance:string|null; reconciliation_difference:string|null; reconciliation_status:string|null; accountName:string; bankName:string|null };
export type BankStatementImportRowDetail = { id:string; rowNumber:number; transactionDate:string|null; description:string; amount:string; direction:'DEBIT'|'CREDIT'; detectedKind:string; normalizedMerchant:string|null; confidence:number; reviewStatus:string; duplicateCandidate:boolean; duplicateScore:number|null; categoryId:string|null; matchedTransactionId:string|null; matchedAccountId:string|null; merchantRuleId:string|null; decisionSource:string; decisionReason:string|null; recurringCandidate:boolean; recurringIntervalDays:number|null; recurringScore:number|null; finalTransactionId:string|null; approvalAction:string|null; fundingCaseId:string|null; matchedTransactionDescription:string|null; matchedAccountName:string|null; categoryName:string|null; matchingPendingCount:number; matchingPendingTotal:string };
export async function getBankStatementImport(userId:string, importId:string) {
  const imports = await rawSql`
    select i.*,a.name as "accountName",a.bank_name as "bankName"
    from public.bank_statement_imports i join public.accounts a on a.id=i.account_id
    where i.id=${importId} and i.user_id=${userId} limit 1`;
  if (!imports[0]) return null;
  const rows = await rawSql`
    select r.id,r.row_number as "rowNumber",r.transaction_date as "transactionDate",r.description,r.amount,r.direction,
           r.detected_kind as "detectedKind",r.normalized_merchant as "normalizedMerchant",r.confidence,
           r.review_status as "reviewStatus",r.duplicate_candidate as "duplicateCandidate",r.duplicate_score as "duplicateScore",
           r.category_id as "categoryId",r.matched_transaction_id as "matchedTransactionId",r.matched_account_id as "matchedAccountId",
           r.merchant_rule_id as "merchantRuleId",r.decision_source as "decisionSource",r.decision_reason as "decisionReason",r.recurring_candidate as "recurringCandidate",r.recurring_interval_days as "recurringIntervalDays",r.recurring_score as "recurringScore",r.final_transaction_id as "finalTransactionId",r.approval_action as "approvalAction",r.funding_case_id as "fundingCaseId",
           mt.description as "matchedTransactionDescription",ma.name as "matchedAccountName",bc.name as "categoryName",
           coalesce(match_summary."matchingPendingCount",0)::int as "matchingPendingCount",
           coalesce(match_summary."matchingPendingTotal",0)::text as "matchingPendingTotal"
    from public.bank_statement_rows r
    left join lateral (
      select
        count(*) filter(where other.id<>r.id)::int as "matchingPendingCount",
        coalesce(sum(other.amount) filter(where other.id<>r.id),0) as "matchingPendingTotal"
      from public.bank_statement_rows other
      join public.bank_statement_imports oi on oi.id=other.import_id and oi.user_id=other.user_id
      where other.user_id=r.user_id
        and other.normalized_merchant is not null
        and other.normalized_merchant=r.normalized_merchant
        and other.direction=r.direction
        and other.review_status='NEEDS_REVIEW'
        and oi.status in ('REVIEW','READY')
    ) match_summary on true
    left join public.transactions mt on mt.id=r.matched_transaction_id and mt.user_id=r.user_id
    left join public.accounts ma on ma.id=r.matched_account_id and ma.user_id=r.user_id
    left join public.budget_categories bc on bc.id=r.category_id and bc.user_id=r.user_id
    where r.import_id=${importId} and r.user_id=${userId}
    order by r.row_number asc limit 3000`;
  return { import: imports[0] as unknown as BankStatementImportDetail, rows: rows as unknown as BankStatementImportRowDetail[] };
}
