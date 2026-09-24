export const runtime='nodejs';
export const dynamic='force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthenticatedUser, requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { getRawSql } from '@/infrastructure/db/client';
import { createAccount } from '@/features/accounts/commands/create-account';
import { deactivateAccount } from '@/features/accounts/commands/deactivate-account';
import { deriveAccountType } from '@/features/accounts/account-name-options';
import { reconcileConfirmedOnboardingAccounts } from '@/lib/conversations/onboarding-account-reconciliation';

function cleanText(value:unknown,max=120){
  return typeof value==='string'?value.trim().slice(0,max):'';
}
function cleanAmount(value:unknown){
  const text=String(value??'').trim();
  return /^\d+(?:\.\d{1,2})?$/.test(text)?text:null;
}
function cleanDate(value:unknown){
  const text=String(value??'').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text)?text:null;
}

export async function GET(){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({code:'AUTH_REQUIRED'},{status:401,headers:{'Cache-Control':'no-store'}});
  await reconcileConfirmedOnboardingAccounts(user.id);
  const sql=getRawSql();
  const rows=await sql`
    select a.id,a.name,a.account_type,a.bank_name,a.is_active,
      coalesce(v.opening_balance,0)::text as opening_balance,
      coalesce(v.balance,0)::text as balance,
      ob.effective_date::text as effective_date
    from public.accounts a
    left join public.account_balances_v v on v.account_id=a.id and v.user_id=a.user_id
    left join public.account_opening_balances ob on ob.account_id=a.id and ob.user_id=a.user_id
    where a.user_id=${user.id}::uuid and a.is_active=true
    order by a.created_at asc
  `;
  return NextResponse.json({accounts:rows},{headers:{'Cache-Control':'private, no-store, max-age=0'}});
}

export async function POST(request:Request){
  const user=await requireAuthenticatedMutationUser('account-create');
  const payload=await request.json() as Record<string,unknown>;
  const name=cleanText(payload.name);
  const bankName=cleanText(payload.bank_name);
  const openingBalance=cleanAmount(payload.opening_balance);
  const effectiveDate=cleanDate(payload.effective_date);
  if(!name||openingBalance===null||!effectiveDate)return NextResponse.json({code:'ACCOUNT_INVALID'},{status:400});
  const result=await createAccount(user.id,{
    name,
    accountType:deriveAccountType(name),
    openingBalance,
    effectiveDate,
    bankName:bankName||undefined,
  });
  if(!result.success)return NextResponse.json({code:result.code,message:result.message},{status:400});
  return NextResponse.json({ok:true,id:result.accountId});
}

export async function PATCH(request:Request){
  const user=await requireAuthenticatedMutationUser('account-update');
  const payload=await request.json() as Record<string,unknown>;
  const id=cleanText(payload.id,64);
  const name=cleanText(payload.name);
  const bankName=cleanText(payload.bank_name);
  const openingBalance=cleanAmount(payload.opening_balance);
  const effectiveDate=cleanDate(payload.effective_date);
  if(!/^[0-9a-f-]{36}$/i.test(id)||!name||openingBalance===null||!effectiveDate)return NextResponse.json({code:'ACCOUNT_INVALID'},{status:400});
  const sql=getRawSql();
  const updated=await sql`
    update public.accounts
    set name=${name},account_type=${deriveAccountType(name)},bank_name=${bankName||null},updated_at=now()
    where id=${id}::uuid and user_id=${user.id}::uuid and is_active=true
    returning id
  `;
  if(!updated[0]?.id)return NextResponse.json({code:'ACCOUNT_NOT_FOUND'},{status:404});
  await sql`
    update public.account_opening_balances
    set amount=${openingBalance},effective_date=${effectiveDate}::date
    where account_id=${id}::uuid and user_id=${user.id}::uuid
  `;
  return NextResponse.json({ok:true});
}

export async function DELETE(request:Request){
  const user=await requireAuthenticatedMutationUser('account-delete');
  const payload=await request.json() as Record<string,unknown>;
  const id=cleanText(payload.id,64);
  const result=await deactivateAccount(user.id,id);
  if(!result.success)return NextResponse.json({code:result.code},{status:result.code==='NOT_FOUND'?404:400});
  return NextResponse.json({ok:true});
}
