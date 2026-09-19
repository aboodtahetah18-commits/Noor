export const runtime='nodejs';
export const dynamic='force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthenticatedUser, requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { getStatementReviewBundle, reviewStatementRow, type StatementReviewAction } from '@/lib/conversations/statement-review';

const ACTIONS=new Set<StatementReviewAction>([
  'EXPENSE','INCOME','REFUND','INTERNAL_TRANSFER','MATCH_EXISTING','IGNORE',
]);

export async function GET(request:Request){
  const user=await getAuthenticatedUser();
  if(!user) return NextResponse.json({code:'AUTH_REQUIRED'},{status:401});
  try{
    const url=new URL(request.url);
    const importId=url.searchParams.get('import_id');
    const bundle=await getStatementReviewBundle(user.id,importId);
    return NextResponse.json(bundle);
  }catch(error){
    console.error('[statement-review-get]',{name:error instanceof Error?error.name:'UnknownError'});
    return NextResponse.json({code:'STATEMENT_REVIEW_UNAVAILABLE'},{status:503});
  }
}

export async function POST(request:Request){
  const user=await requireAuthenticatedMutationUser('conversation-statement-review');
  try{
    const body=await request.json() as Record<string,unknown>;
    const rowId=typeof body.row_id==='string'?body.row_id.trim():'';
    const action=typeof body.action==='string'?body.action.trim() as StatementReviewAction:null;
    if(!rowId) return NextResponse.json({code:'STATEMENT_ROW_REQUIRED'},{status:400});
    if(!action || !ACTIONS.has(action)) return NextResponse.json({code:'STATEMENT_REVIEW_ACTION_INVALID'},{status:400});

    const result=await reviewStatementRow(user.id,rowId,{
      action,
      category_id:typeof body.category_id==='string'?body.category_id:undefined,
      planning_status:body.planning_status==='PLANNED'||body.planning_status==='UNPLANNED'?body.planning_status:undefined,
      expense_nature:
        body.expense_nature==='NECESSARY'||body.expense_nature==='IMPORTANT'||body.expense_nature==='OPTIONAL'||
        body.expense_nature==='ENTERTAINMENT'||body.expense_nature==='UNPLANNED'
          ? body.expense_nature
          : undefined,
      income_kind:
        body.income_kind==='SALARY'||body.income_kind==='ADDITIONAL_INCOME'||body.income_kind==='BONUS'||body.income_kind==='OTHER'
          ? body.income_kind
          : undefined,
      income_source_name:typeof body.income_source_name==='string'?body.income_source_name:undefined,
      related_transaction_id:typeof body.related_transaction_id==='string'?body.related_transaction_id:undefined,
      other_account_id:typeof body.other_account_id==='string'?body.other_account_id:undefined,
      matched_transaction_id:typeof body.matched_transaction_id==='string'?body.matched_transaction_id:undefined,
      transaction_date:typeof body.transaction_date==='string'?body.transaction_date:undefined,
    });

    return NextResponse.json(result);
  }catch(error){
    const code=error instanceof Error?error.message:'STATEMENT_REVIEW_FAILED';
    const badRequestCodes=new Set([
      'STATEMENT_ROW_NOT_FOUND',
      'STATEMENT_ROW_ALREADY_REVIEWED',
      'STATEMENT_TRANSACTION_DATE_REQUIRED',
      'STATEMENT_TRANSACTION_DATE_INVALID',
      'STATEMENT_MATCH_TRANSACTION_REQUIRED',
      'STATEMENT_MATCH_TRANSACTION_INVALID',
      'STATEMENT_TRANSFER_ACCOUNT_REQUIRED',
      'STATEMENT_TRANSFER_ACCOUNT_INVALID',
      'STATEMENT_REFUND_MUST_BE_CREDIT',
      'STATEMENT_REFUND_ORIGINAL_REQUIRED',
      'STATEMENT_REFUND_ORIGINAL_INVALID',
      'STATEMENT_REFUND_EXCEEDS_ORIGINAL',
      'STATEMENT_EXPENSE_MUST_BE_DEBIT',
      'STATEMENT_EXPENSE_CATEGORY_REQUIRED',
      'STATEMENT_EXPENSE_PLANNING_REQUIRED',
      'STATEMENT_EXPENSE_NATURE_REQUIRED',
      'STATEMENT_EXPENSE_CATEGORY_INVALID',
      'STATEMENT_INCOME_MUST_BE_CREDIT',
      'STATEMENT_INCOME_KIND_REQUIRED',
      'STATEMENT_INCOME_SOURCE_REQUIRED',
      'STATEMENT_REVIEW_ACTION_INVALID',
    ]);
    if(badRequestCodes.has(code)) return NextResponse.json({code},{status:400});
    console.error('[statement-review-post]',{name:error instanceof Error?error.name:'UnknownError'});
    return NextResponse.json({code:'STATEMENT_REVIEW_FAILED'},{status:503});
  }
}
