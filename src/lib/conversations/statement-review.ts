import { getRawSql } from '@/infrastructure/db/client';

export type StatementReviewAction =
  | 'EXPENSE'
  | 'INCOME'
  | 'REFUND'
  | 'INTERNAL_TRANSFER'
  | 'MATCH_EXISTING'
  | 'IGNORE';

type ReviewInput = {
  action:StatementReviewAction;
  category_id?:string;
  planning_status?:'PLANNED'|'UNPLANNED';
  expense_nature?:'NECESSARY'|'IMPORTANT'|'OPTIONAL'|'ENTERTAINMENT'|'UNPLANNED';
  income_kind?:'SALARY'|'ADDITIONAL_INCOME'|'BONUS'|'OTHER';
  income_source_name?:string;
  related_transaction_id?:string;
  other_account_id?:string;
  matched_transaction_id?:string;
  transaction_date?:string;
};

const EXPENSE_NATURES=new Set(['NECESSARY','IMPORTANT','OPTIONAL','ENTERTAINMENT','UNPLANNED']);
const PLANNING_STATUSES=new Set(['PLANNED','UNPLANNED']);
const INCOME_KINDS=new Set(['SALARY','ADDITIONAL_INCOME','BONUS','OTHER']);

function assertIsoDate(value:string|null|undefined){
  if(!value) throw new Error('STATEMENT_TRANSACTION_DATE_REQUIRED');
  const match=value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!match) throw new Error('STATEMENT_TRANSACTION_DATE_INVALID');
  const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
  const date=new Date(Date.UTC(year,month-1,day));
  if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day){
    throw new Error('STATEMENT_TRANSACTION_DATE_INVALID');
  }
  return value;
}

function detectedKindFromTransaction(value:string){
  if(value==='EXPENSE') return 'EXPENSE';
  if(value==='INCOME') return 'INCOME';
  if(value==='REFUND') return 'REFUND';
  if(value==='TRANSFER') return 'TRANSFER';
  return 'UNKNOWN';
}

async function refreshImportCounters(sql:ReturnType<typeof getRawSql>,userId:string,importId:string){
  const counts=await sql`
    select
      count(*) filter(where review_status='NEEDS_REVIEW')::int as needs_review,
      count(*) filter(where review_status='IGNORED')::int as ignored,
      count(*) filter(where review_status='CONFIRMED')::int as confirmed
    from public.bank_statement_rows
    where user_id=${userId}::uuid and import_id=${importId}::uuid
  `;
  const needsReview=Number(counts[0]?.needs_review??0);
  const ignored=Number(counts[0]?.ignored??0);
  const confirmed=Number(counts[0]?.confirmed??0);
  await sql`
    update public.bank_statement_imports
    set review_count=${needsReview},
        ignored_row_count=${ignored},
        approved_transaction_count=${confirmed},
        status=${needsReview===0?'READY':'REVIEW'},
        updated_at=now()
    where id=${importId}::uuid and user_id=${userId}::uuid
  `;
  return {needs_review:needsReview,ignored,confirmed,status:needsReview===0?'READY':'REVIEW'};
}

export async function getStatementReviewBundle(userId:string,importId?:string|null){
  const sql=getRawSql();
  const imports=importId
    ? await sql`
        select i.id,i.file_name,i.status,i.account_id,i.row_count,i.review_count,
               a.name as account_name,a.bank_name
        from public.bank_statement_imports i
        join public.accounts a on a.id=i.account_id and a.user_id=i.user_id
        where i.user_id=${userId}::uuid and i.id=${importId}::uuid
        limit 1
      `
    : await sql`
        select i.id,i.file_name,i.status,i.account_id,i.row_count,i.review_count,
               a.name as account_name,a.bank_name
        from public.bank_statement_imports i
        join public.accounts a on a.id=i.account_id and a.user_id=i.user_id
        where i.user_id=${userId}::uuid
          and i.status in ('REVIEW','READY')
        order by i.created_at desc
        limit 1
      `;

  const statementImport=imports[0];
  if(!statementImport) return {statement_import:null,rows:[],accounts:[],categories:[],transactions:[]};

  const [rows,accounts,categories,transactions]=await Promise.all([
    sql`
      select id,row_number,transaction_date,description,amount,direction,detected_kind,
             review_status,approval_action,matched_transaction_id,final_transaction_id,
             matched_account_id
      from public.bank_statement_rows
      where user_id=${userId}::uuid
        and import_id=${String(statementImport.id)}::uuid
      order by row_number asc
    `,
    sql`
      select id,name,bank_name,account_type
      from public.accounts
      where user_id=${userId}::uuid and is_active=true
      order by created_at asc
    `,
    sql`
      select id,name,category_group,expense_nature_default,is_essential
      from public.budget_categories
      where user_id=${userId}::uuid and is_active=true
      order by category_group,name
    `,
    sql`
      select id,transaction_type,status,amount,transaction_date,description,account_id,
             category_id,related_transaction_id
      from public.transactions
      where user_id=${userId}::uuid
        and status in ('PENDING','POSTED')
      order by transaction_date desc,created_at desc
      limit 120
    `,
  ]);

  return {
    statement_import:statementImport,
    rows,
    accounts,
    categories,
    transactions,
  };
}

export async function reviewStatementRow(userId:string,rowId:string,input:ReviewInput){
  const sql=getRawSql();
  const rows=await sql`
    select r.*,i.account_id,i.status as import_status
    from public.bank_statement_rows r
    join public.bank_statement_imports i on i.id=r.import_id and i.user_id=r.user_id
    where r.user_id=${userId}::uuid and r.id=${rowId}::uuid
    limit 1
  `;
  const row=rows[0];
  if(!row) throw new Error('STATEMENT_ROW_NOT_FOUND');
  if(String(row.review_status)!=='NEEDS_REVIEW') throw new Error('STATEMENT_ROW_ALREADY_REVIEWED');

  const importId=String(row.import_id);
  const accountId=String(row.account_id);
  const amount=Number(row.amount);
  const direction=String(row.direction);
  const description=String(row.description);
  const resolvedDate=
    typeof input.transaction_date==='string' && input.transaction_date
      ? input.transaction_date
      : row.transaction_date
        ? String(row.transaction_date)
        : null;

  if(input.action==='IGNORE'){
    await sql`
      update public.bank_statement_rows
      set review_status='IGNORED',
          approval_action='IGNORED',
          decision_source='USER',
          decision_reason='USER_IGNORED_STATEMENT_ROW',
          updated_at=now()
      where id=${rowId}::uuid and user_id=${userId}::uuid
    `;
    const summary=await refreshImportCounters(sql,userId,importId);
    return {row_id:rowId,action:input.action,summary};
  }

  if(input.action==='MATCH_EXISTING'){
    if(!input.matched_transaction_id) throw new Error('STATEMENT_MATCH_TRANSACTION_REQUIRED');
    const matches=await sql`
      select id,transaction_type,amount,transaction_date
      from public.transactions
      where user_id=${userId}::uuid and id=${input.matched_transaction_id}::uuid
      limit 1
    `;
    const match=matches[0];
    if(!match) throw new Error('STATEMENT_MATCH_TRANSACTION_INVALID');
    await sql`
      update public.bank_statement_rows
      set matched_transaction_id=${String(match.id)}::uuid,
          final_transaction_id=${String(match.id)}::uuid,
          detected_kind=${detectedKindFromTransaction(String(match.transaction_type))},
          confidence=100,
          review_status='CONFIRMED',
          approval_action='MATCHED_EXISTING',
          decision_source='USER',
          decision_reason='USER_MATCHED_EXISTING_TRANSACTION',
          updated_at=now()
      where id=${rowId}::uuid and user_id=${userId}::uuid
    `;
    const summary=await refreshImportCounters(sql,userId,importId);
    return {row_id:rowId,action:input.action,transaction_id:String(match.id),summary};
  }

  if(input.action==='INTERNAL_TRANSFER'){
    const transactionDate=assertIsoDate(resolvedDate);
    if(!input.other_account_id) throw new Error('STATEMENT_TRANSFER_ACCOUNT_REQUIRED');
    const owned=await sql`
      select id from public.accounts
      where user_id=${userId}::uuid
        and id=${input.other_account_id}::uuid
        and is_active=true
      limit 1
    `;
    if(!owned[0]?.id || String(owned[0].id)===accountId) throw new Error('STATEMENT_TRANSFER_ACCOUNT_INVALID');
    const fromAccountId=direction==='DEBIT'?accountId:String(owned[0].id);
    const toAccountId=direction==='DEBIT'?String(owned[0].id):accountId;
    const key=`statement-row:${rowId}:transfer`;
    const existing=await sql`
      select id from public.transfers
      where user_id=${userId}::uuid and idempotency_key=${key}
      limit 1
    `;
    let transferId=existing[0]?.id ? String(existing[0].id) : null;
    if(!transferId){
      const inserted=await sql`
        insert into public.transfers(
          user_id,from_account_id,to_account_id,amount,transaction_date,description,
          idempotency_key,posting_state
        ) values(
          ${userId}::uuid,${fromAccountId}::uuid,${toAccountId}::uuid,${amount},
          ${transactionDate},${description},${key},'PENDING'
        )
        returning id
      `;
      transferId=String(inserted[0]?.id);
    }
    await sql`
      update public.bank_statement_rows
      set detected_kind='TRANSFER',
          matched_account_id=${String(owned[0].id)}::uuid,
          confidence=100,
          review_status='CONFIRMED',
          approval_action='INTERNAL_TRANSFER',
          decision_source='USER',
          decision_reason='USER_CONFIRMED_INTERNAL_TRANSFER_PENDING_COUNTERPART',
          updated_at=now()
      where id=${rowId}::uuid and user_id=${userId}::uuid
    `;
    const summary=await refreshImportCounters(sql,userId,importId);
    return {row_id:rowId,action:input.action,transfer_id:transferId,posting_state:'PENDING',summary};
  }

  if(input.action==='REFUND'){
    const transactionDate=assertIsoDate(resolvedDate);
    if(direction!=='CREDIT') throw new Error('STATEMENT_REFUND_MUST_BE_CREDIT');
    if(!input.related_transaction_id) throw new Error('STATEMENT_REFUND_ORIGINAL_REQUIRED');
    const originals=await sql`
      select id,amount,category_id,transaction_type,status
      from public.transactions
      where user_id=${userId}::uuid
        and id=${input.related_transaction_id}::uuid
        and transaction_type='EXPENSE'
        and status='POSTED'
      limit 1
    `;
    const original=originals[0];
    if(!original) throw new Error('STATEMENT_REFUND_ORIGINAL_INVALID');
    const prior=await sql`
      select coalesce(sum(amount),0) as refunded
      from public.transactions
      where user_id=${userId}::uuid
        and transaction_type='REFUND'
        and status='POSTED'
        and related_transaction_id=${String(original.id)}::uuid
    `;
    const refunded=Number(prior[0]?.refunded??0);
    if(refunded+amount>Number(original.amount)+0.000001) throw new Error('STATEMENT_REFUND_EXCEEDS_ORIGINAL');
    const key=`statement-row:${rowId}:refund`;
    const existing=await sql`
      select id from public.transactions
      where user_id=${userId}::uuid and idempotency_key=${key}
      limit 1
    `;
    let transactionId=existing[0]?.id ? String(existing[0].id) : null;
    if(!transactionId){
      const inserted=await sql`
        insert into public.transactions(
          user_id,account_id,transaction_type,status,amount,transaction_date,description,
          category_id,transaction_direction,related_transaction_id,idempotency_key,posted_at
        ) values(
          ${userId}::uuid,${accountId}::uuid,'REFUND','POSTED',${amount},${transactionDate},
          ${description},${original.category_id ? String(original.category_id) : null},
          'IN',${String(original.id)}::uuid,${key},now()
        )
        returning id
      `;
      transactionId=String(inserted[0]?.id);
    }
    await sql`
      update public.bank_statement_rows
      set detected_kind='REFUND',
          confidence=100,
          review_status='CONFIRMED',
          approval_action='CREATED',
          decision_source='USER',
          final_transaction_id=${transactionId}::uuid,
          decision_reason='USER_CONFIRMED_REFUND_LINKED_TO_ORIGINAL_EXPENSE',
          updated_at=now()
      where id=${rowId}::uuid and user_id=${userId}::uuid
    `;
    const summary=await refreshImportCounters(sql,userId,importId);
    return {row_id:rowId,action:input.action,transaction_id:transactionId,summary};
  }

  if(input.action==='EXPENSE'){
    const transactionDate=assertIsoDate(resolvedDate);
    if(direction!=='DEBIT') throw new Error('STATEMENT_EXPENSE_MUST_BE_DEBIT');
    if(!input.category_id) throw new Error('STATEMENT_EXPENSE_CATEGORY_REQUIRED');
    if(!input.planning_status || !PLANNING_STATUSES.has(input.planning_status)) throw new Error('STATEMENT_EXPENSE_PLANNING_REQUIRED');
    if(!input.expense_nature || !EXPENSE_NATURES.has(input.expense_nature)) throw new Error('STATEMENT_EXPENSE_NATURE_REQUIRED');
    const categories=await sql`
      select id from public.budget_categories
      where user_id=${userId}::uuid and id=${input.category_id}::uuid and is_active=true
      limit 1
    `;
    if(!categories[0]?.id) throw new Error('STATEMENT_EXPENSE_CATEGORY_INVALID');
    const key=`statement-row:${rowId}:expense`;
    const existing=await sql`
      select id from public.transactions
      where user_id=${userId}::uuid and idempotency_key=${key}
      limit 1
    `;
    let transactionId=existing[0]?.id ? String(existing[0].id) : null;
    if(!transactionId){
      const inserted=await sql`
        insert into public.transactions(
          user_id,account_id,transaction_type,status,amount,transaction_date,description,
          category_id,planning_status,expense_nature,transaction_direction,idempotency_key,posted_at
        ) values(
          ${userId}::uuid,${accountId}::uuid,'EXPENSE','POSTED',${amount},${transactionDate},
          ${description},${input.category_id}::uuid,${input.planning_status},${input.expense_nature},
          'OUT',${key},now()
        )
        returning id
      `;
      transactionId=String(inserted[0]?.id);
    }
    await sql`
      update public.bank_statement_rows
      set detected_kind='EXPENSE',
          category_id=${input.category_id}::uuid,
          confidence=100,
          review_status='CONFIRMED',
          approval_action='CREATED',
          decision_source='USER',
          final_transaction_id=${transactionId}::uuid,
          decision_reason='USER_CONFIRMED_EXPENSE_CLASSIFICATION',
          updated_at=now()
      where id=${rowId}::uuid and user_id=${userId}::uuid
    `;
    const summary=await refreshImportCounters(sql,userId,importId);
    return {row_id:rowId,action:input.action,transaction_id:transactionId,summary};
  }

  if(input.action==='INCOME'){
    const transactionDate=assertIsoDate(resolvedDate);
    if(direction!=='CREDIT') throw new Error('STATEMENT_INCOME_MUST_BE_CREDIT');
    if(!input.income_kind || !INCOME_KINDS.has(input.income_kind)) throw new Error('STATEMENT_INCOME_KIND_REQUIRED');
    const source=(input.income_source_name?.trim()||description).slice(0,240);
    if(!source) throw new Error('STATEMENT_INCOME_SOURCE_REQUIRED');
    const key=`statement-row:${rowId}:income`;
    const existing=await sql`
      select id from public.transactions
      where user_id=${userId}::uuid and idempotency_key=${key}
      limit 1
    `;
    let transactionId=existing[0]?.id ? String(existing[0].id) : null;
    if(!transactionId){
      const inserted=await sql`
        insert into public.transactions(
          user_id,account_id,transaction_type,status,amount,transaction_date,description,
          transaction_direction,income_source_name,income_kind,income_is_partial,idempotency_key,posted_at
        ) values(
          ${userId}::uuid,${accountId}::uuid,'INCOME','POSTED',${amount},${transactionDate},
          ${description},'IN',${source},${input.income_kind},false,${key},now()
        )
        returning id
      `;
      transactionId=String(inserted[0]?.id);
    }
    await sql`
      update public.bank_statement_rows
      set detected_kind='INCOME',
          confidence=100,
          review_status='CONFIRMED',
          approval_action='CREATED',
          decision_source='USER',
          final_transaction_id=${transactionId}::uuid,
          decision_reason='USER_CONFIRMED_INCOME_CLASSIFICATION',
          updated_at=now()
      where id=${rowId}::uuid and user_id=${userId}::uuid
    `;
    const summary=await refreshImportCounters(sql,userId,importId);
    return {row_id:rowId,action:input.action,transaction_id:transactionId,summary};
  }

  throw new Error('STATEMENT_REVIEW_ACTION_INVALID');
}
