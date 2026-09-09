import { createHash } from 'node:crypto';
import { rawSql } from '@/infrastructure/db/client';
import { parseBankMessage } from '../services/message-parser';
import { enrichStatementRows } from '../services/intelligence';
import { decideSafeMessageAutoPost } from '../services/safe-message-auto-post';
import { listMerchantMatchingRules } from '../queries/list-merchant-matching-rules';

function fingerprint(parts:Array<string|null|undefined>){
  return createHash('sha256').update(parts.map(v=>v??'').join('|')).digest('hex');
}

export async function importBankMessage(userId:string,message:string,requestedAccountId?:string|null){
  const parsed=parseBankMessage(message);
  const accounts=await rawSql`select id,name,bank_name as "bankName",account_number as "accountNumber",iban,card_last4 as "cardLast4" from public.accounts where user_id=${userId} and is_active=true order by created_at`;
  if(accounts.length===0)throw new Error('أضف حسابًا بنكيًا قبل تحليل الرسائل.');
  let source= requestedAccountId ? accounts.find((a)=>String(a.id)===requestedAccountId) : undefined;
  if(!source&&parsed.cardLast4) source=accounts.find((a)=>String(a.cardLast4??'')===parsed.cardLast4);
  if(!source&&parsed.bankName){const matches=accounts.filter((a)=>String(a.bankName??'').includes(parsed.bankName??''));if(matches.length===1)source=matches[0];}
  if(!source&&accounts.length===1)source=accounts[0];
  if(!source)throw new Error('لم أتعرف على الحساب من الرسالة. اختر الحساب ثم أعد التحليل.');
  const accountId=String(source.id);
  const [ruleRows,txRows,historyRows]=await Promise.all([
    listMerchantMatchingRules(userId),
    parsed.row.transactionDate?rawSql`select id,account_id as "accountId",amount::text,transaction_date::text as "transactionDate",transaction_type as "transactionType",description from public.transactions where user_id=${userId} and status in ('PENDING','POSTED') and transaction_date between (${parsed.row.transactionDate}::date - interval '1 day') and (${parsed.row.transactionDate}::date + interval '1 day') order by transaction_date desc limit 500`:Promise.resolve([]),
    parsed.row.transactionDate?rawSql`select normalized_merchant as "normalizedMerchant",transaction_date::text as "transactionDate",amount::text,direction from public.bank_statement_rows where user_id=${userId} and normalized_merchant is not null and transaction_date between (${parsed.row.transactionDate}::date - interval '120 days') and (${parsed.row.transactionDate}::date - interval '1 day') order by transaction_date desc limit 1000`:Promise.resolve([]),
  ]);
  const rows=enrichStatementRows([parsed.row],accountId,
    ruleRows,
    accounts.map((r)=>({id:String(r.id),name:String(r.name),bankName:r.bankName?String(r.bankName):null,accountNumber:r.accountNumber?String(r.accountNumber):null,iban:r.iban?String(r.iban):null,cardLast4:r.cardLast4?String(r.cardLast4):null})),
    txRows.map((r)=>({id:String(r.id),accountId:r.accountId?String(r.accountId):null,amount:String(r.amount),transactionDate:String(r.transactionDate),transactionType:String(r.transactionType),description:r.description?String(r.description):null})),
    historyRows.map((r)=>({normalizedMerchant:r.normalizedMerchant?String(r.normalizedMerchant):null,transactionDate:r.transactionDate?String(r.transactionDate):null,amount:String(r.amount),direction:String(r.direction) as 'DEBIT'|'CREDIT'})));
  const row=rows[0]; if(!row)throw new Error('تعذر تحليل الرسالة البنكية.');

  // SMS dedupe uses the bank timestamp when available. A same merchant/amount on another time is not a duplicate by itself.
  const sourceFingerprint=fingerprint([accountId,row.transactionDate,row.transactionTime,row.amount,row.direction,row.normalizedMerchant]);
  const exactRows=row.transactionDate&&row.transactionTime
    ? await rawSql`select r.id,r.final_transaction_id as "finalTransactionId" from public.bank_statement_rows r join public.bank_statement_imports i on i.id=r.import_id and i.user_id=r.user_id where r.user_id=${userId} and i.account_id=${accountId} and r.transaction_date=${row.transactionDate}::date and r.transaction_time=${row.transactionTime}::time and r.amount=${row.amount}::numeric and coalesce(r.normalized_merchant,'')=coalesce(${row.normalizedMerchant},'') order by r.created_at desc limit 1`
    : [];
  if(exactRows[0]){
    row.duplicateCandidate=true;
    row.matchedTransactionId=exactRows[0].finalTransactionId?String(exactRows[0].finalTransactionId):null;
    row.duplicateScore=100;
    row.reviewStatus='NEEDS_REVIEW';
    row.decisionSource='DUPLICATE_MATCH';
    row.decisionReason='توجد رسالة سابقة بنفس الحساب والتاريخ والوقت والمبلغ والتاجر؛ يلزم التحقق قبل أي اعتماد';
  } else if(row.transactionTime){
    // The generic statement matcher has no clock time. For SMS with a clock timestamp, do not treat same-day amount alone as a duplicate.
    row.duplicateCandidate=false;
    row.matchedTransactionId=null;
    row.duplicateScore=0;
  }

  const autoDecision=decideSafeMessageAutoPost(row,ruleRows);
  row.reviewStatus=autoDecision.eligible?'AUTO':'NEEDS_REVIEW';
  if(autoDecision.eligible) row.decisionReason=`${row.decisionReason} · ${autoDecision.reason}`;
  else if(!row.duplicateCandidate) row.decisionReason=`${row.decisionReason} · ${autoDecision.reason}`;

  const importId=crypto.randomUUID();
  const importStatus=autoDecision.eligible?'READY':'REVIEW';
  await rawSql.transaction([
    rawSql`insert into public.bank_statement_imports(id,user_id,account_id,file_name,file_type,status,period_start,period_end,row_count,auto_classified_count,review_count,duplicate_candidate_count) values(${importId},${userId},${accountId},${'رسالة بنكية'},'MESSAGE',${importStatus},${row.transactionDate},${row.transactionDate},1,${row.reviewStatus==='AUTO'?1:0},${row.reviewStatus==='AUTO'?0:1},${row.duplicateCandidate?1:0})`,
    rawSql`insert into public.bank_statement_rows(user_id,import_id,row_number,transaction_date,transaction_time,description,amount,direction,detected_kind,normalized_merchant,confidence,review_status,duplicate_candidate,category_id,matched_transaction_id,merchant_rule_id,matched_account_id,decision_source,duplicate_score,recurring_candidate,recurring_interval_days,recurring_score,decision_reason,raw_payload,source_fingerprint,auto_post_eligible,auto_post_reason) values(${userId},${importId},1,${row.transactionDate},${row.transactionTime??null},${row.description},${row.amount},${row.direction},${row.detectedKind},${row.normalizedMerchant},${row.confidence},${row.reviewStatus},${row.duplicateCandidate},${row.categoryId},${row.matchedTransactionId},${row.merchantRuleId},${row.matchedAccountId},${row.decisionSource},${row.duplicateScore},${row.recurringCandidate},${row.recurringIntervalDays},${row.recurringScore},${row.decisionReason},${row.rawPayload},${sourceFingerprint},${autoDecision.eligible},${autoDecision.reason})`
  ]);

  if(autoDecision.eligible){
    const { approveBankStatementImport }=await import('./approve-import');
    await approveBankStatementImport(userId,importId,null);
    const finalRows=await rawSql`select id,amount::text,merchant_rule_id as "merchantRuleId",final_transaction_id as "finalTransactionId" from public.bank_statement_rows where user_id=${userId} and import_id=${importId} limit 1`;
    const finalRow=finalRows[0];
    const { recordBankDecision }=await import('@/features/bank-decisions/services/record-bank-decision');
    await recordBankDecision({userId,eventType:'AUTO_POST',sourceType:'SYSTEM',sourceId:finalRow?.finalTransactionId?String(finalRow.finalTransactionId):importId,merchantRuleId:finalRow?.merchantRuleId?String(finalRow.merchantRuleId):autoDecision.exactRuleId,bankStatementRowId:finalRow?.id?String(finalRow.id):null,importId,affectedCount:1,affectedAmount:String(finalRow?.amount??row.amount),beforeState:{reviewStatus:'AUTO'},afterState:{posted:true,transactionId:finalRow?.finalTransactionId?String(finalRow.finalTransactionId):null},impactSummary:{financialPosting:true,duplicateChecked:true,contextAutoLinked:false},reason:autoDecision.reason});
    return {importId,autoApproved:true};
  }
  return {importId,autoApproved:false};
}
