import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import { listAccounts } from '@/features/accounts/queries/list-accounts';

export const dynamic='force-dynamic';

export async function GET(){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({error:'UNAUTHORIZED'},{status:401,headers:{'Cache-Control':'no-store'}});
  const accounts=await listAccounts(user.id);
  return NextResponse.json({accounts:accounts.map(a=>({id:a.id,name:a.name,bankName:a.bankName,isActive:a.isActive}))},{headers:{'Cache-Control':'private, max-age=30, stale-while-revalidate=120'}});
}
