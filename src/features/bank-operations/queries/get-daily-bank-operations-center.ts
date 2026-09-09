import { rawSql } from '@/infrastructure/db/client';

export type DailyBankOperationsCenter = {
  pendingReviewCount:number;
  pendingImportsCount:number;
  duplicateCandidatesCount:number;
  unclassifiedCount:number;
  activeFundingCount:number;
  pendingItems:Array<{
    importId:string;
    rowId:string;
    fileName:string;
    accountName:string;
    bankName:string|null;
    transactionDate:string|null;
    description:string;
    amount:string;
    direction:'DEBIT'|'CREDIT';
    detectedKind:string;
    confidence:number;
    duplicateCandidate:boolean;
    categoryName:string|null;
    fundingTitle:string|null;
    createdAt:string;
  }>;
  recentApproved:Array<{
    id:string;
    transactionDate:string;
    description:string;
    amount:string;
    transactionType:string;
    accountName:string;
    categoryName:string|null;
  }>;
};

export async function getDailyBankOperationsCenter(userId:string):Promise<DailyBankOperationsCenter>{
  const [summaryRows,pendingRows,recentRows,fundingRows]=await Promise.all([
    rawSql`
      select
        count(*) filter(where r.review_status='NEEDS_REVIEW')::int as "pendingReviewCount",
        count(distinct r.import_id) filter(where r.review_status='NEEDS_REVIEW')::int as "pendingImportsCount",
        count(*) filter(where r.review_status='NEEDS_REVIEW' and r.duplicate_candidate=true)::int as "duplicateCandidatesCount",
        count(*) filter(where r.review_status='NEEDS_REVIEW' and r.category_id is null and r.detected_kind in ('EXPENSE','FEE'))::int as "unclassifiedCount"
      from public.bank_statement_rows r
      where r.user_id=${userId}`,
    rawSql`
      select r.import_id as "importId",r.id as "rowId",i.file_name as "fileName",
        a.name as "accountName",a.bank_name as "bankName",r.transaction_date::text as "transactionDate",
        r.description,r.amount::text,r.direction,r.detected_kind as "detectedKind",r.confidence,
        r.duplicate_candidate as "duplicateCandidate",c.name as "categoryName",f.title as "fundingTitle",
        r.created_at::text as "createdAt"
      from public.bank_statement_rows r
      join public.bank_statement_imports i on i.id=r.import_id and i.user_id=r.user_id
      join public.accounts a on a.id=i.account_id and a.user_id=i.user_id
      left join public.budget_categories c on c.id=r.category_id and c.user_id=r.user_id
      left join public.internal_funding_cases f on f.id=r.funding_case_id and f.user_id=r.user_id
      where r.user_id=${userId} and r.review_status='NEEDS_REVIEW'
      order by coalesce(r.transaction_date,current_date) desc,r.created_at desc
      limit 50`,
    rawSql`
      select t.id,t.transaction_date::text as "transactionDate",t.description,t.amount::text,
        t.transaction_type as "transactionType",a.name as "accountName",c.name as "categoryName"
      from public.transactions t
      left join public.accounts a on a.id=t.account_id and a.user_id=t.user_id
      left join public.budget_categories c on c.id=t.category_id and c.user_id=t.user_id
      where t.user_id=${userId} and t.status='POSTED'
      order by t.transaction_date desc,t.posted_at desc nulls last
      limit 12`,
    rawSql`select count(*)::int as count from public.internal_funding_cases where user_id=${userId} and status in ('PLANNING','ACTIVE')`,
  ]);
  const summary=summaryRows[0]??{};
  return {
    pendingReviewCount:Number(summary.pendingReviewCount??0),
    pendingImportsCount:Number(summary.pendingImportsCount??0),
    duplicateCandidatesCount:Number(summary.duplicateCandidatesCount??0),
    unclassifiedCount:Number(summary.unclassifiedCount??0),
    activeFundingCount:Number(fundingRows[0]?.count??0),
    pendingItems:pendingRows as unknown as DailyBankOperationsCenter['pendingItems'],
    recentApproved:recentRows as unknown as DailyBankOperationsCenter['recentApproved'],
  };
}
