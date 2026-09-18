import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import { getConversationRoom } from '@/lib/conversations/store';

type CsvRow = {
  date:string|null;
  description:string;
  amount:number;
  direction:'DEBIT'|'CREDIT';
  raw:string;
};

const DATE_HEADERS=['date','transaction_date','transaction date','تاريخ','تاريخ العملية'];
const DESCRIPTION_HEADERS=['description','details','merchant','narrative','الوصف','البيان','التفاصيل'];
const AMOUNT_HEADERS=['amount','value','المبلغ','القيمة'];
const DIRECTION_HEADERS=['direction','type','الاتجاه','النوع'];
const DEBIT_HEADERS=['debit','withdrawal','خصم','مدين','سحب'];
const CREDIT_HEADERS=['credit','deposit','إيداع','ايداع','دائن'];

function normalizeDigits(input:string){
  const map:Record<string,string>={'٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'};
  return input.replace(/[٠-٩]/g,d=>map[d]??d).replace(/[٬,](?=\d{3}(?:\D|$))/g,'');
}

function splitCsvLine(line:string,delimiter:string){
  const values:string[]=[];
  let current='';
  let quoted=false;
  for(let index=0;index<line.length;index+=1){
    const char=line[index] ?? '';
    if(char==='"'){
      if(quoted && line[index+1]==='"'){ current+='"'; index+=1; }
      else quoted=!quoted;
      continue;
    }
    if(char===delimiter && !quoted){ values.push(current.trim()); current=''; continue; }
    current+=char;
  }
  values.push(current.trim());
  return values;
}

function normalizeHeader(value:string){
  return value.trim().toLowerCase().replace(/\s+/g,' ');
}

function headerIndex(headers:string[],aliases:string[]){
  return headers.findIndex(header=>aliases.includes(normalizeHeader(header)));
}

function parseAmount(value:string){
  const normalized=normalizeDigits(value)
    .replace(/\s/g,'')
    .replace(/[^0-9.\-]/g,'');
  if(!normalized) return null;
  const amount=Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function parseDate(value:string){
  const normalized=normalizeDigits(value.trim());
  if(!normalized) return null;
  let match=normalized.match(/^(20\d{2})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
  if(match){
    const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
    const date=new Date(Date.UTC(year,month-1,day));
    if(date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day){
      return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    }
  }
  match=normalized.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](20\d{2})$/);
  if(match){
    const day=Number(match[1]),month=Number(match[2]),year=Number(match[3]);
    const date=new Date(Date.UTC(year,month-1,day));
    if(date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day){
      return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    }
  }
  return null;
}

function normalizeDirection(value:string):'DEBIT'|'CREDIT'|null{
  const normalized=value.trim().toLowerCase();
  if(['debit','withdrawal','expense','مدين','خصم','سحب','مصروف'].includes(normalized)) return 'DEBIT';
  if(['credit','deposit','income','دائن','إيداع','ايداع','دخل'].includes(normalized)) return 'CREDIT';
  return null;
}

export function parseStatementCsv(csv:string):CsvRow[]{
  const normalized=csv.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').replace(/\r/g,'\n').trim();
  if(!normalized) throw new Error('STATEMENT_CSV_EMPTY');
  const rawLines=normalized.split('\n').filter(line=>line.trim().length>0);
  if(rawLines.length<2) throw new Error('STATEMENT_CSV_NO_ROWS');
  const delimiter=(rawLines[0]?.split(';').length??0)>(rawLines[0]?.split(',').length??0)?';':',';
  const headers=splitCsvLine(rawLines[0]??'',delimiter);
  const dateIndex=headerIndex(headers,DATE_HEADERS);
  const descriptionIndex=headerIndex(headers,DESCRIPTION_HEADERS);
  const amountIndex=headerIndex(headers,AMOUNT_HEADERS);
  const directionIndex=headerIndex(headers,DIRECTION_HEADERS);
  const debitIndex=headerIndex(headers,DEBIT_HEADERS);
  const creditIndex=headerIndex(headers,CREDIT_HEADERS);

  if(descriptionIndex<0) throw new Error('STATEMENT_DESCRIPTION_COLUMN_REQUIRED');
  if(amountIndex<0 && debitIndex<0 && creditIndex<0) throw new Error('STATEMENT_AMOUNT_COLUMN_REQUIRED');
  if(directionIndex<0 && debitIndex<0 && creditIndex<0) throw new Error('STATEMENT_DIRECTION_COLUMN_REQUIRED');

  const rows:CsvRow[]=[];
  for(let rowIndex=1;rowIndex<rawLines.length;rowIndex+=1){
    const rawLine=rawLines[rowIndex]??'';
    const cells=splitCsvLine(rawLine,delimiter);
    const description=(cells[descriptionIndex]??'').trim();
    if(!description) continue;

    let direction:CsvRow['direction']|null=null;
    let amount:number|null=null;

    if(debitIndex>=0){
      const debit=parseAmount(cells[debitIndex]??'');
      if(debit!==null && debit!==0){ direction='DEBIT'; amount=Math.abs(debit); }
    }
    if(direction===null && creditIndex>=0){
      const credit=parseAmount(cells[creditIndex]??'');
      if(credit!==null && credit!==0){ direction='CREDIT'; amount=Math.abs(credit); }
    }
    if(amount===null && amountIndex>=0){
      const parsed=parseAmount(cells[amountIndex]??'');
      if(parsed!==null){
        const explicit=directionIndex>=0?normalizeDirection(cells[directionIndex]??''):null;
        direction=explicit ?? (parsed<0?'DEBIT':null);
        amount=Math.abs(parsed);
      }
    }

    if(amount===null || amount<=0 || direction===null) continue;
    const date=dateIndex>=0?parseDate(cells[dateIndex]??''):null;
    rows.push({date,description,amount,direction,raw:rawLine});
  }

  if(!rows.length) throw new Error('STATEMENT_CSV_NO_VALID_ROWS');
  return rows;
}

export async function listStatementAccounts(userId:string){
  const sql=getRawSql();
  return sql`
    select id,name,account_type,bank_name
    from public.accounts
    where user_id=${userId}::uuid
      and is_active=true
    order by created_at asc
  `;
}

export async function importStatementCsv(input:{
  userId:string;
  accountId?:string|null;
  fileName:string;
  content:string;
}){
  const sql=getRawSql();
  const accounts=await listStatementAccounts(input.userId);
  let accountId=input.accountId?.trim()||null;

  if(accountId){
    const owned=accounts.find(row=>String(row.id)===accountId);
    if(!owned) throw new Error('STATEMENT_ACCOUNT_INVALID');
  }else if(accounts.length===1){
    accountId=String(accounts[0]?.id);
  }else{
    throw new Error('STATEMENT_ACCOUNT_REQUIRED');
  }

  const rows=parseStatementCsv(input.content);
  const importId=randomUUID();
  const attachmentId=randomUUID();
  const room=await getConversationRoom(input.userId,'central');

  const statements=[
    sql`
      insert into public.bank_statement_imports(
        id,user_id,account_id,file_name,file_type,status,row_count,review_count
      ) values(
        ${importId}::uuid,${input.userId}::uuid,${accountId}::uuid,${input.fileName},'CSV','REVIEW',
        ${rows.length},${rows.length}
      )
    `,
    ...rows.map((row,index)=>sql`
      insert into public.bank_statement_rows(
        user_id,import_id,row_number,transaction_date,description,amount,direction,
        detected_kind,confidence,review_status,duplicate_candidate,raw_payload,
        decision_source,duplicate_score,recurring_candidate,recurring_score,
        auto_post_eligible,reconciliation_source
      ) values(
        ${input.userId}::uuid,${importId}::uuid,${index+1},${row.date},${row.description},
        ${row.amount},${row.direction},'UNKNOWN',0,'NEEDS_REVIEW',false,${row.raw},
        'HEURISTIC',0,false,0,false,'BANK_STATEMENT'
      )
    `),
    sql`
      insert into public.conversation_attachments(
        id,thread_id,message_id,user_id,file_name,content_type,storage_key,verification_status
      ) values(
        ${attachmentId}::uuid,${room.threadId}::uuid,null,${input.userId}::uuid,${input.fileName},
        'text/csv',${`db://bank-statement-import/${importId}`},'PENDING_REVIEW'
      )
    `,
    sql`
      insert into public.conversation_messages(
        id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
      ) values(
        gen_random_uuid(),${room.threadId}::uuid,${input.userId}::uuid,'agent','central-governor',
        'محافظ بنك نماء المركزي','followup',
        ${`استلمت كشف الحساب وقرأت ${rows.length} حركة. وضعتها جميعًا في حالة مراجعة، ولم أنشئ أي حركة مالية تلقائيًا.`},
        ${JSON.stringify({
          statement_import_id:importId,
          statement_row_count:rows.length,
          statement_status:'REVIEW',
          attachment_id:attachmentId,
          execution_boundary:'advisory_only',
        })}::jsonb
      )
    `,
  ];

  await sql.transaction(statements);
  return {
    import_id:importId,
    attachment_id:attachmentId,
    account_id:accountId,
    row_count:rows.length,
    status:'REVIEW' as const,
  };
}
