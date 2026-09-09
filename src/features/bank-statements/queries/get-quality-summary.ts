import { rawSql } from '@/infrastructure/db/client';

export async function getBankIntelligenceQualitySummary(userId:string) {
  const [rowStats,ruleStats,importStats] = await Promise.all([
    rawSql`select
      count(*)::int as "totalRows",
      count(*) filter (where review_status in ('AUTO','CONFIRMED'))::int as "classifiedRows",
      count(*) filter (where review_status='NEEDS_REVIEW')::int as "needsReview",
      count(*) filter (where duplicate_candidate=true)::int as "duplicates",
      count(*) filter (where matched_account_id is not null)::int as "internalTransfers",
      count(*) filter (where recurring_candidate=true)::int as "recurringCandidates"
      from public.bank_statement_rows where user_id=${userId}`,
    rawSql`select count(*)::int as "merchantRules",coalesce(sum(confirmation_count),0)::int as "merchantConfirmations"
      from public.merchant_rules where user_id=${userId} and is_active=true`,
    rawSql`select
      count(*)::int as "imports",
      count(*) filter (where status='APPROVED')::int as "approvedImports",
      count(*) filter (where reconciliation_status='MATCHED')::int as "matchedReconciliations",
      count(*) filter (where reconciliation_status='DIFFERENCE')::int as "differenceReconciliations"
      from public.bank_statement_imports where user_id=${userId}`,
  ]);
  const rows=rowStats[0]??{};
  const rules=ruleStats[0]??{};
  const imports=importStats[0]??{};
  const total=Number(rows.totalRows??0);
  const classified=Number(rows.classifiedRows??0);
  return {
    totalRows:total,
    classifiedRows:classified,
    autoClassificationRate: total>0 ? Math.round((classified/total)*100) : 0,
    needsReview:Number(rows.needsReview??0),
    duplicates:Number(rows.duplicates??0),
    internalTransfers:Number(rows.internalTransfers??0),
    recurringCandidates:Number(rows.recurringCandidates??0),
    merchantRules:Number(rules.merchantRules??0),
    merchantConfirmations:Number(rules.merchantConfirmations??0),
    imports:Number(imports.imports??0),
    approvedImports:Number(imports.approvedImports??0),
    matchedReconciliations:Number(imports.matchedReconciliations??0),
    differenceReconciliations:Number(imports.differenceReconciliations??0),
  };
}
