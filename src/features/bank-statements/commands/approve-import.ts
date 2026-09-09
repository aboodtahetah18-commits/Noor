import { Money } from '@/financial-engine/money';
import { rawSql, type SqlQuery } from '@/infrastructure/db/client';

type Row = {
  id:string; rowNumber:number; transactionDate:string|null; description:string; amount:string; direction:'DEBIT'|'CREDIT';
  detectedKind:'EXPENSE'|'INCOME'|'TRANSFER'|'REFUND'|'FEE'|'UNKNOWN'; reviewStatus:string; duplicateCandidate:boolean;
  categoryId:string|null; matchedTransactionId:string|null; matchedAccountId:string|null; fundingCaseId:string|null;
};

function idempotency(importId:string,rowNumber:number,suffix='main'){ return `bank-statement:${importId}:${rowNumber}:${suffix}`; }

export async function approveBankStatementImport(userId:string, importId:string, closingBalance:string|null) {
  const imports=await rawSql`select id,account_id,status from public.bank_statement_imports where id=${importId} and user_id=${userId} limit 1`;
  const imp=imports[0];
  if(!imp) throw new Error('جلسة كشف الحساب غير موجودة.');
  if(String(imp.status)==='APPROVED') return { alreadyApproved:true };
  if(!['REVIEW','READY'].includes(String(imp.status))) throw new Error('حالة كشف الحساب لا تسمح بالاعتماد.');

  const rowData=await rawSql`select id,row_number as "rowNumber",transaction_date::text as "transactionDate",description,amount::text,direction,
      detected_kind as "detectedKind",review_status as "reviewStatus",duplicate_candidate as "duplicateCandidate",category_id as "categoryId",
      matched_transaction_id as "matchedTransactionId",matched_account_id as "matchedAccountId",funding_case_id as "fundingCaseId"
    from public.bank_statement_rows where import_id=${importId} and user_id=${userId} order by row_number`;
  const rows=rowData as unknown as Row[];
  if(!rows.length) throw new Error('لا توجد عمليات لاعتمادها.');

  const unresolved=rows.filter(r=>r.reviewStatus==='NEEDS_REVIEW'||r.detectedKind==='UNKNOWN'||!r.transactionDate);
  if(unresolved.length) throw new Error(`يوجد ${unresolved.length} عملية غير محسومة. راجعها قبل الاعتماد.`);
  const uncategorized=rows.filter(r=>!r.duplicateCandidate && (r.detectedKind==='EXPENSE'||r.detectedKind==='FEE') && !r.categoryId);
  if(uncategorized.length) throw new Error(`يوجد ${uncategorized.length} مصروف/رسوم بدون تصنيف.`);
  const transfers=rows.filter(r=>!r.duplicateCandidate&&r.detectedKind==='TRANSFER'&&!r.matchedAccountId);
  if(transfers.length) throw new Error(`يوجد ${transfers.length} تحويل بدون حساب مقابل.`);
  const refunds=rows.filter(r=>!r.duplicateCandidate&&r.detectedKind==='REFUND'&&!r.matchedTransactionId);
  if(refunds.length) throw new Error(`يوجد ${refunds.length} استرداد غير مربوط بمصروف أصلي.`);

  // Validate funding capacity before any POSTED transaction is written.
  const fundingTotals=new Map<string,Money>();
  for(const row of rows){
    if(row.fundingCaseId&&!row.duplicateCandidate){
      const previous=fundingTotals.get(row.fundingCaseId)??Money.zero();
      fundingTotals.set(row.fundingCaseId,previous.add(Money.parse(row.amount)));
    }
  }
  for(const [caseId,required] of fundingTotals){
    const capacityRows=await rawSql`select coalesce(sum(approved_amount-used_amount),0)::text as capacity from public.internal_funding_sources where user_id=${userId} and case_id=${caseId}`;
    const capacity=Money.parse(String(capacityRows[0]?.capacity??'0.00'));
    if(capacity.compare(required)<0) throw new Error(`التمويل المرتبط بالعمليات لا يملك رصيدًا معتمدًا كافيًا. المتاح ${capacity.toString()} ريال والمطلوب ${required.toString()} ريال.`);
  }

  // Validate every transaction date belongs to an active financial cycle.
  const dates=[...new Set(rows.filter(r=>!r.duplicateCandidate).map(r=>r.transactionDate!).filter(Boolean))];
  const cycleMap=new Map<string,string>();
  for(const date of dates){
    const c=await rawSql`select id from public.financial_cycles where user_id=${userId} and status='ACTIVE' and ${date}::date between start_date and end_date limit 1`;
    if(!c[0]) throw new Error(`لا توجد دورة مالية نشطة تغطي تاريخ ${date}.`);
    cycleMap.set(date,String(c[0].id));
  }

  const statements:SqlQuery[]=[];
  let created=0,ignored=0;
  const sourceAccountId=String(imp.account_id);
  const now=new Date();

  for(const row of rows){
    if(row.duplicateCandidate && row.matchedTransactionId){
      statements.push(rawSql`update public.bank_statement_rows set review_status='IGNORED',approval_action='MATCHED_EXISTING',final_transaction_id=${row.matchedTransactionId},updated_at=now() where id=${row.id} and user_id=${userId}`);
      ignored++;
      continue;
    }
    const cycleId=cycleMap.get(row.transactionDate!)!;
    const txId=crypto.randomUUID();
    if(row.detectedKind==='EXPENSE'||row.detectedKind==='FEE'){
      statements.push(rawSql`insert into public.transactions(id,user_id,cycle_id,account_id,transaction_type,status,amount,transaction_date,description,category_id,planning_status,expense_nature,transaction_direction,idempotency_key,posted_at)
        values(${txId},${userId},${cycleId},${sourceAccountId},'EXPENSE','POSTED',${row.amount},${row.transactionDate},${row.description},${row.categoryId},'UNPLANNED','UNPLANNED','OUT',${idempotency(importId,row.rowNumber)},${now})
        on conflict(user_id,idempotency_key) where idempotency_key is not null do nothing`);
      statements.push(rawSql`update public.bank_statement_rows set final_transaction_id=coalesce((select id from public.transactions where user_id=${userId} and idempotency_key=${idempotency(importId,row.rowNumber)} limit 1),${txId}),approval_action='CREATED',updated_at=now() where id=${row.id} and user_id=${userId}`);
      created++;
    } else if(row.detectedKind==='INCOME'){
      statements.push(rawSql`insert into public.transactions(id,user_id,cycle_id,account_id,transaction_type,status,amount,transaction_date,description,transaction_direction,idempotency_key,posted_at)
        values(${txId},${userId},${cycleId},${sourceAccountId},'INCOME','POSTED',${row.amount},${row.transactionDate},${row.description},'IN',${idempotency(importId,row.rowNumber)},${now})
        on conflict(user_id,idempotency_key) where idempotency_key is not null do nothing`);
      statements.push(rawSql`update public.bank_statement_rows set final_transaction_id=coalesce((select id from public.transactions where user_id=${userId} and idempotency_key=${idempotency(importId,row.rowNumber)} limit 1),${txId}),approval_action='CREATED',updated_at=now() where id=${row.id} and user_id=${userId}`);
      created++;
    } else if(row.detectedKind==='TRANSFER'){
      const other=row.matchedAccountId!;
      const from=row.direction==='DEBIT'?sourceAccountId:other;
      const to=row.direction==='DEBIT'?other:sourceAccountId;
      const transferId=crypto.randomUUID(), outId=crypto.randomUUID(), inId=crypto.randomUUID();
      const key=idempotency(importId,row.rowNumber,'transfer');
      statements.push(rawSql`insert into public.transfers(id,user_id,cycle_id,from_account_id,to_account_id,amount,transaction_date,description,idempotency_key,posted_at)
        values(${transferId},${userId},${cycleId},${from},${to},${row.amount},${row.transactionDate},${row.description},${key},${now}) on conflict(user_id,idempotency_key) do nothing`);
      statements.push(rawSql`insert into public.transactions(id,user_id,cycle_id,account_id,transaction_type,status,amount,transaction_date,description,transaction_direction,transfer_id,idempotency_key,posted_at)
        select ${outId},${userId},${cycleId},${from},'TRANSFER','POSTED',${row.amount},${row.transactionDate},${row.description},'OUT',id,${key+':OUT'},${now} from public.transfers where user_id=${userId} and idempotency_key=${key}
        on conflict(user_id,idempotency_key) where idempotency_key is not null do nothing`);
      statements.push(rawSql`insert into public.transactions(id,user_id,cycle_id,account_id,transaction_type,status,amount,transaction_date,description,transaction_direction,transfer_id,idempotency_key,posted_at)
        select ${inId},${userId},${cycleId},${to},'TRANSFER','POSTED',${row.amount},${row.transactionDate},${row.description},'IN',id,${key+':IN'},${now} from public.transfers where user_id=${userId} and idempotency_key=${key}
        on conflict(user_id,idempotency_key) where idempotency_key is not null do nothing`);
      const sourceKey=row.direction==='DEBIT'?key+':OUT':key+':IN';
      statements.push(rawSql`update public.bank_statement_rows set final_transaction_id=(select id from public.transactions where user_id=${userId} and idempotency_key=${sourceKey} limit 1),approval_action='INTERNAL_TRANSFER',updated_at=now() where id=${row.id} and user_id=${userId}`);
      created++;
    } else if(row.detectedKind==='REFUND'){
      statements.push(rawSql`insert into public.transactions(id,user_id,cycle_id,account_id,transaction_type,status,amount,transaction_date,description,category_id,related_transaction_id,transaction_direction,idempotency_key,posted_at)
        select ${txId},${userId},o.cycle_id,${sourceAccountId},'REFUND','POSTED',${row.amount},${row.transactionDate},${row.description},o.category_id,o.id,'IN',${idempotency(importId,row.rowNumber)},${now}
        from public.transactions o where o.id=${row.matchedTransactionId}::uuid and o.user_id=${userId} and o.transaction_type='EXPENSE' and o.status='POSTED'
        on conflict(user_id,idempotency_key) where idempotency_key is not null do nothing`);
      statements.push(rawSql`update public.bank_statement_rows set final_transaction_id=(select id from public.transactions where user_id=${userId} and idempotency_key=${idempotency(importId,row.rowNumber)} limit 1),approval_action='CREATED',updated_at=now() where id=${row.id} and user_id=${userId}`);
      created++;
    }
  }

  statements.push(rawSql`update public.bank_statement_imports set status='APPROVED',approved_at=now(),approved_transaction_count=${created},ignored_row_count=${ignored},closing_balance=${closingBalance} where id=${importId} and user_id=${userId}`);
  await rawSql.transaction(statements);

  // Link funded expenses only after the authoritative POSTED transactions exist.
  const fundedRows=await rawSql`select r.id,r.funding_case_id as "fundingCaseId",r.category_id as "categoryId",r.amount::text,r.final_transaction_id as "transactionId" from public.bank_statement_rows r where r.import_id=${importId} and r.user_id=${userId} and r.funding_case_id is not null and r.final_transaction_id is not null and r.approval_action='CREATED'`;
  for(const funded of fundedRows){
    if(!funded.categoryId) continue;
    const { linkFundedTransaction } = await import('@/features/internal-funding/services/link-funded-transaction');
    await linkFundedTransaction(userId,String(funded.fundingCaseId),String(funded.id),String(funded.transactionId),String(funded.categoryId),String(funded.amount));
  }

  const bal=await rawSql`select balance::text from public.account_balances_v where user_id=${userId} and account_id=${sourceAccountId} limit 1`;
  const systemBalance=Money.parse(String(bal[0]?.balance??'0.00'));
  const difference=closingBalance===null?null:systemBalance.subtract(Money.parse(closingBalance)).toString();
  const reconciliationStatus=closingBalance===null?'NOT_PROVIDED':Money.parse(difference??'0.00').isZero()?'MATCHED':'DIFFERENCE';
  await rawSql`update public.bank_statement_imports set reconciliation_system_balance=${systemBalance.toString()},reconciliation_difference=${difference},reconciliation_status=${reconciliationStatus} where id=${importId} and user_id=${userId}`;
  return {alreadyApproved:false,created,ignored,systemBalance:systemBalance.toString(),difference,reconciliationStatus};
}
