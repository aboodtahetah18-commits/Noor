import { rawSql } from '@/infrastructure/db/client';
import { parseBankStatementCsv } from '../services/csv-parser';
import { enrichStatementRows } from '../services/intelligence';
import { listMerchantMatchingRules } from '../queries/list-merchant-matching-rules';

export async function importBankStatementCsv(userId:string, accountId:string, fileName:string, content:string) {
  const accountRows = await rawSql`select id from public.accounts where id=${accountId} and user_id=${userId} and is_active=true limit 1`;
  if (!accountRows[0]) throw new Error('الحساب المحدد غير موجود أو غير نشط.');
  const parsed = parseBankStatementCsv(content);
  const dated = parsed.map((r)=>r.transactionDate).filter((v):v is string=>Boolean(v)).sort();
  const periodStart = dated[0] ?? null;
  const periodEnd = dated.at(-1) ?? null;

  const [ruleRows, ownAccountRows, txRows] = await Promise.all([
    listMerchantMatchingRules(userId),
    rawSql`select id,name,bank_name as "bankName",account_number as "accountNumber",iban,card_last4 as "cardLast4"
           from public.accounts where user_id=${userId} and is_active=true`,
    periodStart && periodEnd ? rawSql`select id,account_id as "accountId",amount::text,transaction_date::text as "transactionDate",transaction_type as "transactionType",description
           from public.transactions where user_id=${userId} and status in ('PENDING','POSTED')
             and transaction_date between (${periodStart}::date - interval '1 day') and (${periodEnd}::date + interval '1 day')
           order by transaction_date desc limit 5000` : Promise.resolve([]),
  ]);

  const rows = enrichStatementRows(
    parsed,
    accountId,
    ruleRows,
    ownAccountRows.map((r)=>({id:String(r.id),name:String(r.name),bankName:r.bankName?String(r.bankName):null,accountNumber:r.accountNumber?String(r.accountNumber):null,iban:r.iban?String(r.iban):null,cardLast4:r.cardLast4?String(r.cardLast4):null})),
    txRows.map((r)=>({id:String(r.id),accountId:r.accountId?String(r.accountId):null,amount:String(r.amount),transactionDate:String(r.transactionDate),transactionType:String(r.transactionType),description:r.description?String(r.description):null})),
    [],
  );

  const importId = crypto.randomUUID();
  const autoCount = rows.filter((r)=>r.reviewStatus==='AUTO').length;
  const reviewCount = rows.length-autoCount;
  const duplicateCount = rows.filter(r=>r.duplicateCandidate).length;
  const insertImport = rawSql`
    insert into public.bank_statement_imports
      (id,user_id,account_id,file_name,file_type,status,period_start,period_end,row_count,auto_classified_count,review_count,duplicate_candidate_count)
    values (${importId},${userId},${accountId},${fileName.slice(0,240)},'CSV','REVIEW',${periodStart},${periodEnd},${rows.length},${autoCount},${reviewCount},${duplicateCount})
  `;
  const inserts = rows.map((row)=>rawSql`
    insert into public.bank_statement_rows
      (user_id,import_id,row_number,transaction_date,description,amount,direction,detected_kind,normalized_merchant,confidence,review_status,duplicate_candidate,category_id,matched_transaction_id,merchant_rule_id,matched_account_id,decision_source,duplicate_score,recurring_candidate,recurring_interval_days,recurring_score,decision_reason,raw_payload)
    values (${userId},${importId},${row.rowNumber},${row.transactionDate},${row.description},${row.amount},${row.direction},${row.detectedKind},${row.normalizedMerchant},${row.confidence},${row.reviewStatus},${row.duplicateCandidate},${row.categoryId},${row.matchedTransactionId},${row.merchantRuleId},${row.matchedAccountId},${row.decisionSource},${row.duplicateScore},${row.recurringCandidate},${row.recurringIntervalDays},${row.recurringScore},${row.decisionReason},${row.rawPayload})
  `);
  await rawSql.transaction([insertImport,...inserts]);
  return { importId, rowCount:rows.length };
}
