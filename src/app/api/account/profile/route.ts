export const runtime='nodejs';
export const dynamic='force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthenticatedUser, requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { getRawSql } from '@/infrastructure/db/client';

export async function GET(){
  const user=await getAuthenticatedUser();
  if(!user) return NextResponse.json({code:'AUTH_REQUIRED'},{status:401});
  return NextResponse.json({user});
}

export async function PATCH(request:Request){
  const user=await requireAuthenticatedMutationUser('account-profile');
  try{
    const body=await request.json() as Record<string,unknown>;
    const name=typeof body.name==='string'?body.name.trim():'';
    if(name.length<2||name.length>120) return NextResponse.json({code:'PROFILE_NAME_INVALID'},{status:400});
    const sql=getRawSql();
    await sql`
      update auth."user"
      set name=${name}, updated_at=now()
      where id=${user.id}::uuid
    `;
    return NextResponse.json({ok:true,user:{...user,name}});
  }catch{
    return NextResponse.json({code:'PROFILE_UPDATE_FAILED'},{status:503});
  }
}
