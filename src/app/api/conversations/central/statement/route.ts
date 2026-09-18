export const runtime='nodejs';
export const dynamic='force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthenticatedUser, requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { importStatementCsv, listStatementAccounts } from '@/lib/conversations/statement-intake';

const MAX_CSV_BYTES=2*1024*1024;

export async function GET(){
  const user=await getAuthenticatedUser();
  if(!user) return NextResponse.json({code:'AUTH_REQUIRED'},{status:401});
  try{
    const accounts=await listStatementAccounts(user.id);
    return NextResponse.json({accounts});
  }catch(error){
    console.error('[statement-intake-accounts]',{name:error instanceof Error?error.name:'UnknownError'});
    return NextResponse.json({code:'STATEMENT_ACCOUNTS_UNAVAILABLE'},{status:503});
  }
}

export async function POST(request:Request){
  const user=await requireAuthenticatedMutationUser('conversation-statement-upload');
  try{
    const form=await request.formData();
    const file=form.get('file');
    const accountId=String(form.get('account_id')??'').trim()||null;

    if(!(file instanceof File)){
      return NextResponse.json({code:'STATEMENT_FILE_REQUIRED'},{status:400});
    }

    const name=file.name.trim();
    if(!name.toLowerCase().endsWith('.csv') && file.type!=='text/csv'){
      return NextResponse.json({code:'STATEMENT_CSV_ONLY'},{status:415});
    }
    if(file.size<=0 || file.size>MAX_CSV_BYTES){
      return NextResponse.json({code:'STATEMENT_FILE_SIZE_INVALID',max_bytes:MAX_CSV_BYTES},{status:413});
    }

    const content=await file.text();
    const result=await importStatementCsv({
      userId:user.id,
      accountId,
      fileName:name||'statement.csv',
      content,
    });
    return NextResponse.json(result,{status:201});
  }catch(error){
    const code=error instanceof Error?error.message:'STATEMENT_IMPORT_FAILED';
    if([
      'STATEMENT_CSV_EMPTY',
      'STATEMENT_CSV_NO_ROWS',
      'STATEMENT_DESCRIPTION_COLUMN_REQUIRED',
      'STATEMENT_AMOUNT_COLUMN_REQUIRED',
      'STATEMENT_DIRECTION_COLUMN_REQUIRED',
      'STATEMENT_CSV_NO_VALID_ROWS',
      'STATEMENT_ACCOUNT_INVALID',
      'STATEMENT_ACCOUNT_REQUIRED',
    ].includes(code)){
      return NextResponse.json({code},{status:400});
    }
    console.error('[statement-intake-import]',{name:error instanceof Error?error.name:'UnknownError'});
    return NextResponse.json({code:'STATEMENT_IMPORT_FAILED'},{status:503});
  }
}
